import { NextRequest, NextResponse } from "next/server";
import { authorizeSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/export";
import { planLimits } from "@/lib/plans";
import { Session, TranscriptChunk, Claim, Verdict } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/export">) {
  const { id } = await ctx.params;
  const auth = await authorizeSession(id);
  if (!auth.ok) return auth.response;

  const supabase = await createClient();

  // Pull profile plan to enforce gating
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", auth.userId)
    .maybeSingle();
  const limits = planLimits(profile?.plan);
  if (!limits.exportEnabled) {
    return NextResponse.json(
      { error: "plan_locked", reason: "Markdown export requires the Solo plan or higher." },
      { status: 402 },
    );
  }

  const [{ data: sessionRaw }, { data: chunksRaw }, { data: claimsRaw }, { data: verdictsRaw }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).single(),
      supabase
        .from("transcript_chunks")
        .select("*")
        .eq("session_id", id)
        .order("start_ms", { ascending: true }),
      supabase.from("claims").select("*").eq("session_id", id),
      supabase.from("verdicts").select("*").eq("session_id", id),
    ]);

  if (!sessionRaw) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = Session.parse(sessionRaw);
  const chunks = (chunksRaw ?? []).map((c) => TranscriptChunk.parse(c));
  const claims = (claimsRaw ?? []).map((c) => Claim.parse(c));
  const verdicts = (verdictsRaw ?? []).map((v) => Verdict.parse(v));
  const verdictsByClaimId: Record<string, Verdict> = {};
  for (const v of verdicts) verdictsByClaimId[v.claim_id] = v;

  const md = renderMarkdown({ session, chunks, claims, verdictsByClaimId });
  const filename = `session-${session.id.slice(0, 8)}.md`;

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
