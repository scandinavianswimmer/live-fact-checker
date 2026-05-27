import { env } from "@/lib/env";
import type { Source } from "@/lib/types";

/**
 * Perplexity Sonar — OpenAI-compatible Chat Completions API at
 * https://api.perplexity.ai. We use the non-streaming endpoint for verifier
 * round-trips; streaming would add latency without benefit since we need the
 * full answer + citations before scoring.
 *
 * Pricing (as of 2026-05): sonar ~ $5/$5 per 1M tokens + $5/1k requests.
 */
export interface SonarCitation {
  title?: string;
  url: string;
  snippet?: string;
}

export interface SonarResult {
  answer: string;
  citations: SonarCitation[];
  raw: unknown;
  latencyMs: number;
}

const SYSTEM_PROMPT = `You are a fast, factual verification engine. Given a CLAIM, search the web and answer in 2-4 sentences with the strongest, most authoritative evidence either supporting or contradicting it. Cite sources inline like [1], [2]. Prefer primary sources, official statistics, peer-reviewed publications, and major news organizations. If the claim is partially true, say which part is true and which is misleading. If you cannot verify, say so explicitly.`;

export async function sonarVerify(opts: {
  claim: string;
  context?: string | null;
}): Promise<SonarResult> {
  const userPrompt = opts.context
    ? `CLAIM: ${opts.claim}\n\nCONTEXT (from the live conversation): ${opts.context}\n\nVerify this claim.`
    : `CLAIM: ${opts.claim}\n\nVerify this claim.`;

  const t0 = Date.now();
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.perplexityApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.perplexityModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 512,
      return_citations: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Perplexity ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as PerplexityResponse;
  const latencyMs = Date.now() - t0;

  const answer = json.choices?.[0]?.message?.content ?? "";

  // Sonar returns citations as either { citations: [...] } at the top level
  // (older shape) or as URLs in `search_results`. We accept both.
  const citations = normalizeCitations(json);

  return { answer, citations, raw: json, latencyMs };
}

export function toStoredSources(cites: SonarCitation[]): Source[] {
  return cites.slice(0, 5).map((c) => ({
    title: c.title || c.url,
    url: c.url,
    publisher: hostnameOf(c.url),
    snippet: c.snippet ?? null,
  }));
}

interface PerplexityResponse {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
  search_results?: Array<{ title?: string; url?: string; snippet?: string }>;
}

function normalizeCitations(json: PerplexityResponse): SonarCitation[] {
  if (Array.isArray(json.search_results) && json.search_results.length) {
    return json.search_results
      .filter((r): r is { title?: string; url: string; snippet?: string } =>
        Boolean(r?.url),
      )
      .map((r) => ({ title: r.title, url: r.url, snippet: r.snippet }));
  }
  if (Array.isArray(json.citations)) {
    return json.citations
      .filter((u): u is string => typeof u === "string")
      .map((url) => ({ url }));
  }
  return [];
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
