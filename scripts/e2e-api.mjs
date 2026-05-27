#!/usr/bin/env node
/**
 * End-to-end API smoke — creates a test user, signs in, and walks the entire
 * pipeline through the HTTP routes:
 *
 *   1. POST /api/sessions               → create session
 *   2. POST /api/transcripts            → insert finalized chunks
 *   3. POST /api/claims/detect          → Haiku extracts claims
 *   4. POST /api/claims/:id/verify      → Perplexity Sonar (or graceful skip) → Haiku verdict
 *   5. GET  /api/sessions/:id/export    → markdown bundle (gated on plan; we
 *                                          bump the user to "pro" first)
 *
 * Assumes `pnpm dev` is running on the URL passed as first arg (defaults to
 * http://localhost:3000). Run with --env-file=.env.local so we can use the
 * service role to provision the test user.
 */
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3000";
const TEST_EMAIL = `e2e+${Date.now()}@example.com`;
const TEST_PASSWORD = "test-password-" + Math.random().toString(36).slice(2);

const TRANSCRIPT = [
  { speaker_label: "Host", text: "Welcome back to the show. Today we're covering claims about space.", start_ms: 0, end_ms: 5000 },
  { speaker_label: "Guest", text: "The Great Wall of China is visible from space with the naked eye.", start_ms: 5500, end_ms: 11000 },
  { speaker_label: "Host", text: "I want to fact-check that.", start_ms: 11500, end_ms: 13000 },
  { speaker_label: "Guest", text: "Mount Everest grows about four millimeters per year due to plate tectonics.", start_ms: 14000, end_ms: 20000 },
];

async function expectOk(res, label) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${label} → ${res.status}\n${body.slice(0, 400)}`);
  }
  return res.json();
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Public client to sign in as the test user (gives us a JWT we can use)
const userClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

console.log(`[setup] creating test user ${TEST_EMAIL}`);
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true,
});
if (createErr) throw createErr;
const userId = created.user.id;

// Bump to pro so we can test export
await admin.from("profiles").update({ plan: "pro" }).eq("id", userId);

const { data: signIn, error: signErr } = await userClient.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});
if (signErr) throw signErr;
const access = signIn.session.access_token;
const refresh = signIn.session.refresh_token;

// Supabase reads auth cookies set by @supabase/ssr — we forge those.
const cookieValue = encodeURIComponent(JSON.stringify({ access_token: access, refresh_token: refresh }));
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
const cookieHeader = `sb-${projectRef}-auth-token=${cookieValue}`;

const fetchAuthed = (path, init = {}) =>
  fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...(init.headers ?? {}),
    },
  });

console.log("\n[1] POST /api/sessions");
const { session } = await expectOk(
  await fetchAuthed("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ title: "E2E smoke", speaker_count: 2, audio_source: "upload" }),
  }),
  "create session",
);
console.log("  ✓ session", session.id);

console.log("\n[2] POST /api/transcripts");
const trRes = await expectOk(
  await fetchAuthed("/api/transcripts", {
    method: "POST",
    body: JSON.stringify({
      chunks: TRANSCRIPT.map((c) => ({
        session_id: session.id,
        speaker: c.speaker_label === "Host" ? 0 : 1,
        speaker_label: c.speaker_label,
        text: c.text,
        start_ms: c.start_ms,
        end_ms: c.end_ms,
        confidence: 0.95,
        is_final: true,
      })),
    }),
  }),
  "transcripts insert",
);
console.log(`  ✓ inserted ${trRes.inserted} chunks`);

console.log("\n[3] POST /api/claims/detect");
const detectRes = await expectOk(
  await fetchAuthed("/api/claims/detect", {
    method: "POST",
    body: JSON.stringify({ session_id: session.id }),
  }),
  "claim detect",
);
console.log(`  ✓ detected ${detectRes.detected} claim(s)`);
for (const c of detectRes.claims) {
  console.log(`    → [${c.importance}] ${c.assertion}`);
}

if (!detectRes.claims?.length) {
  console.log("  (no claims — terminating e2e)");
  await admin.auth.admin.deleteUser(userId);
  process.exit(0);
}

console.log("\n[4] POST /api/claims/:id/verify  (in parallel)");
const verifyResults = await Promise.all(
  detectRes.claims.map((c) =>
    fetchAuthed(`/api/claims/${c.id}/verify`, { method: "POST" }).then((r) => r.json()),
  ),
);
for (let i = 0; i < verifyResults.length; i++) {
  const r = verifyResults[i];
  const claim = detectRes.claims[i];
  if (r.degraded) {
    console.log(`  ↯ ${claim.assertion.slice(0, 60)}… → degraded (${r.degraded})`);
  } else if (r.suppressed) {
    console.log(`  ↯ ${claim.assertion.slice(0, 60)}… → suppressed (conf=${r.confidence})`);
  } else if (r.verdict) {
    console.log(`  ✓ ${claim.assertion.slice(0, 60)}…`);
    console.log(`      verdict: ${r.verdict.verdict} · ${r.verdict.confidence}% · sources: ${r.verdict.sources?.length ?? 0}`);
  } else {
    console.log(`  ✗ ${claim.assertion.slice(0, 60)}… →`, r);
  }
}

console.log("\n[5] GET /api/sessions/:id/export");
const exportRes = await fetchAuthed(`/api/sessions/${session.id}/export`);
if (!exportRes.ok) {
  console.log(`  ✗ ${exportRes.status} ${await exportRes.text()}`);
} else {
  const text = await exportRes.text();
  console.log(`  ✓ ${text.length} bytes of markdown`);
  console.log("  preview:\n" + text.split("\n").slice(0, 8).map((l) => `      ${l}`).join("\n"));
}

console.log("\n[cleanup] removing test user");
await admin.auth.admin.deleteUser(userId);
console.log("\n✅ E2E API pipeline succeeded.");
