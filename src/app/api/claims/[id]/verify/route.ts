import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { sonarVerify, toStoredSources } from "@/lib/perplexity";
import { haikuJSON } from "@/lib/anthropic";
import { VERDICT_SCORER_SYSTEM, verdictScorerUser } from "@/lib/prompts";
import { VerdictScore, type VerdictCategory } from "@/lib/types";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * End-to-end verifier for a single claim:
 *   1. Load claim (RLS via user client — proves ownership)
 *   2. Mark verifying
 *   3. Perplexity Sonar lookup
 *   4. Haiku verdict scoring
 *   5. Insert verdict, mark claim verified or suppressed
 *   6. Realtime broadcast happens automatically via Supabase Realtime on the
 *      verdicts table (subscribed from the browser)
 */
export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/claims/[id]/verify">,
) {
  const { id } = await ctx.params;
  const t0 = Date.now();

  // Ownership check
  const userClient = await createUserClient();
  const { data: claim, error: claimErr } = await userClient
    .from("claims")
    .select("id, session_id, subject, assertion, context, status")
    .eq("id", id)
    .maybeSingle();
  if (claimErr || !claim) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (claim.status === "verified" || claim.status === "suppressed") {
    return NextResponse.json({ already: true, status: claim.status });
  }

  const service = createServiceClient();
  await service.from("claims").update({ status: "verifying" }).eq("id", id);

  // Graceful degrade: if Perplexity isn't configured yet, emit an "unverified"
  // verdict with confidence 0 so the UI surfaces the claim with an actionable
  // explanation instead of silently 502-ing the request.
  if (!process.env.PERPLEXITY_API_KEY) {
    const { data: verdict, error: insertErr } = await service
      .from("verdicts")
      .insert({
        claim_id: id,
        session_id: claim.session_id,
        verdict: "unverified",
        confidence: 0,
        summary:
          "Verification source not configured. Add PERPLEXITY_API_KEY to enable live source lookups.",
        sources: [],
        raw_sonar: null,
        latency_ms: Date.now() - t0,
      })
      .select("*")
      .single();
    if (insertErr) {
      return NextResponse.json(
        { error: "verdict_insert_failed", detail: insertErr.message },
        { status: 500 },
      );
    }
    await service.from("claims").update({ status: "verified" }).eq("id", id);
    return NextResponse.json({ verdict, degraded: "perplexity_missing" });
  }

  let sonar;
  try {
    sonar = await sonarVerify({ claim: claim.assertion, context: claim.context });
  } catch (err) {
    await service
      .from("claims")
      .update({ status: "error" })
      .eq("id", id);
    return NextResponse.json(
      { error: "sonar_failed", detail: (err as Error).message },
      { status: 502 },
    );
  }

  let scored;
  try {
    const { data } = await haikuJSON<{
      verdict: VerdictCategory;
      confidence: number;
      summary: string;
    }>({
      system: VERDICT_SCORER_SYSTEM,
      user: verdictScorerUser({
        claim: {
          subject: claim.subject,
          assertion: claim.assertion,
          context: claim.context,
        },
        sonarAnswer: sonar.answer,
        sonarCitations: sonar.citations,
      }),
      maxTokens: 512,
    });
    scored = VerdictScore.parse(data);
  } catch (err) {
    await service
      .from("claims")
      .update({ status: "error" })
      .eq("id", id);
    return NextResponse.json(
      { error: "verdict_scoring_failed", detail: (err as Error).message },
      { status: 502 },
    );
  }

  const minConfidence = env.claimMinConfidence();

  // Suppress low-confidence verdicts — silence beats a wrong call on air.
  if (scored.confidence < minConfidence) {
    await service
      .from("claims")
      .update({
        status: "suppressed",
        suppressed_reason: `confidence ${scored.confidence} < threshold ${minConfidence}`,
      })
      .eq("id", id);
    return NextResponse.json({ suppressed: true, confidence: scored.confidence });
  }

  const latencyMs = Date.now() - t0;
  const { data: verdict, error: insertErr } = await service
    .from("verdicts")
    .insert({
      claim_id: id,
      session_id: claim.session_id,
      verdict: scored.verdict,
      confidence: scored.confidence,
      summary: scored.summary,
      sources: toStoredSources(sonar.citations),
      raw_sonar: sonar.raw,
      latency_ms: latencyMs,
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: "verdict_insert_failed", detail: insertErr.message },
      { status: 500 },
    );
  }

  await service.from("claims").update({ status: "verified" }).eq("id", id);

  return NextResponse.json({ verdict, latency_ms: latencyMs });
}
