#!/usr/bin/env node
/**
 * Backend smoke test — exercises the full server-side pipeline without a real
 * mic. Run with: pnpm exec node --env-file=.env.local scripts/smoke.mjs
 *
 *   1. Deepgram /v1/auth/grant returns a short-lived JWT.
 *   2. Anthropic Haiku claim detector extracts a falsifiable claim from a
 *      hand-rolled transcript window.
 *   3. Supabase service-role client can insert+read from each pipeline table.
 *   4. Perplexity Sonar lookup (or graceful skip if PERPLEXITY_API_KEY unset).
 *   5. Haiku verdict scorer produces a structured verdict.
 */

import { createClient } from "@supabase/supabase-js";
import { DeepgramClient } from "@deepgram/sdk";
import Anthropic from "@anthropic-ai/sdk";

const HAIKU_MODEL = process.env.ANTHROPIC_HAIKU_MODEL ?? "claude-haiku-4-5-20251001";

const TRANSCRIPT_WINDOW = `[00:01 Host] Welcome back to the show.
[00:04 Guest] The Great Wall of China is visible from space with the naked eye.
[00:10 Host] That's a claim I want to fact-check.
[00:13 Guest] Also, Mount Everest grows about four millimeters per year due to plate tectonics.`;

const CLAIM_DETECTOR_SYSTEM = `You are a real-time claim detector for a live podcast fact-checking assistant.

You receive a sliding window of recent transcript with speaker labels and millisecond offsets. Your job is to extract ONLY claims that are worth fact-checking on air.

A claim is fact-checkable if and only if:
  - It is a specific, verifiable assertion of fact (statistics, dates, events, attributions, scientific claims).
  - It is falsifiable.
  - importance >= 50.

REJECT opinions, hedges, jokes, rhetorical, obvious truths.

OUTPUT FORMAT — return ONLY valid JSON, no prose, no markdown fences:
{"claims":[{"subject":"...","assertion":"...","context":"...","speaker_label":"Host|Guest 1|null","importance":0-100,"start_ms":0,"end_ms":0}]}
If none, return {"claims":[]}`;

const VERDICT_SCORER_SYSTEM = `You are a live fact-checking verdict scorer.

Verdicts: "true" | "false" | "misleading" | "unverified".
Confidence: 0-100.

OUTPUT FORMAT — return ONLY valid JSON:
{"verdict":"...","confidence":0-100,"summary":"..."}

When in doubt, "unverified".`;

function pass(name) { console.log(`  ✓ ${name}`); }
function fail(name, err) { console.log(`  ✗ ${name}: ${err}`); process.exitCode = 1; }
function info(name, val) { console.log(`    ${name}: ${val}`); }

async function step(name, fn) {
  console.log(`\n[${name}]`);
  try { await fn(); }
  catch (err) {
    console.log(`  ✗ ${name} threw: ${err.message}`);
    process.exitCode = 1;
  }
}

await step("Supabase service role can reach all pipeline tables", async () => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  for (const t of ["profiles", "sessions", "transcript_chunks", "claims", "verdicts", "usage_events"]) {
    const { error } = await sb.from(t).select("*", { count: "exact", head: true });
    if (error) fail(t, error.message); else pass(t);
  }
});

await step("Deepgram token grant", async () => {
  const dg = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
  const body = await dg.auth.v1.tokens.grant({ ttl_seconds: 60 });
  if (!body.access_token) return fail("token", "no access_token");
  info("access_token length", body.access_token.length);
  info("expires_in (s)", body.expires_in ?? "?");
  pass("granted");
});

let detected = [];
await step("Anthropic Haiku — claim detector", async () => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1024,
    system: CLAIM_DETECTOR_SYSTEM,
    messages: [{ role: "user", content: `TRANSCRIPT WINDOW:\n\n${TRANSCRIPT_WINDOW}\n\nEmit JSON now.` }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const json = JSON.parse(text.replace(/^```(?:json)?\s*|```$/gi, "").trim());
  if (!Array.isArray(json.claims)) return fail("claims array", text.slice(0, 200));
  detected = json.claims;
  info("model", HAIKU_MODEL);
  info("input_tokens", res.usage.input_tokens);
  info("output_tokens", res.usage.output_tokens);
  info("claims detected", json.claims.length);
  for (const c of json.claims) info("  →", `[${c.importance}] ${c.assertion}`);
  if (json.claims.length === 0) return fail("no claims extracted", "expected at least 1");
  pass(`extracted ${json.claims.length} claim(s)`);
});

await step("Perplexity Sonar verification", async () => {
  if (!process.env.PERPLEXITY_API_KEY) {
    info("status", "PERPLEXITY_API_KEY not set — verifier will return 'unverified' in production");
    pass("graceful-skip OK");
    return;
  }
  const claim = detected[0]?.assertion ?? "The Great Wall of China is visible from space.";
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL ?? "sonar",
      messages: [
        { role: "system", content: "Verify in 2-4 sentences with citations." },
        { role: "user", content: `CLAIM: ${claim}\nVerify.` },
      ],
      temperature: 0.1,
      max_tokens: 400,
      return_citations: true,
    }),
  });
  if (!res.ok) return fail("sonar", `${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const answer = json.choices?.[0]?.message?.content ?? "";
  const citationsCount = (json.search_results ?? json.citations ?? []).length;
  info("answer (first 120 chars)", answer.slice(0, 120) + (answer.length > 120 ? "…" : ""));
  info("citations", citationsCount);
  if (!answer) return fail("answer empty", "?");
  pass("sonar ok");

  // Verdict scoring
  const ac = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const verdictRes = await ac.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 400,
    system: VERDICT_SCORER_SYSTEM,
    messages: [{ role: "user", content: `CLAIM: ${claim}\n\nSONAR ANSWER:\n${answer}\n\nEmit JSON now.` }],
  });
  const vtext = verdictRes.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const v = JSON.parse(vtext.replace(/^```(?:json)?\s*|```$/gi, "").trim());
  info("verdict", `${v.verdict} · ${v.confidence}% confidence`);
  info("summary", v.summary?.slice(0, 120));
  pass("verdict scored");
});

console.log(process.exitCode === 1 ? "\n❌ One or more checks failed.\n" : "\n✅ All checks passed.\n");
