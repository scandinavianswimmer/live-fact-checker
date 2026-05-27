import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Claim, Session, TranscriptChunk, Verdict } from "@/lib/types";
import { planLimits } from "@/lib/plans";
import { ClaimReview } from "./claim-review";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/auth/sign-in");

  const [{ data: sessionRaw }, { data: chunksRaw }, { data: claimsRaw }, { data: verdictsRaw }, { data: profileRaw }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("transcript_chunks")
        .select("*")
        .eq("session_id", id)
        .order("start_ms", { ascending: true }),
      supabase.from("claims").select("*").eq("session_id", id),
      supabase.from("verdicts").select("*").eq("session_id", id),
      supabase.from("profiles").select("plan").eq("id", userData.user.id).maybeSingle(),
    ]);

  if (!sessionRaw) notFound();

  const session = Session.parse(sessionRaw);
  const chunks = (chunksRaw ?? []).map((c) => TranscriptChunk.parse(c));
  const claims = (claimsRaw ?? []).map((c) => Claim.parse(c));
  const verdicts = (verdictsRaw ?? []).map((v) => Verdict.parse(v));
  const verdictByClaimId = new Map<string, Verdict>();
  for (const v of verdicts) verdictByClaimId.set(v.claim_id, v);

  const limits = planLimits(profileRaw?.plan);

  const startedAt = new Date(session.started_at).toLocaleString();
  const durationMin = session.duration_ms ? Math.round(session.duration_ms / 60000) : null;
  const verified = claims.filter((c) => verdictByClaimId.has(c.id));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-emerald-400">Review</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {session.title ?? "Untitled session"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {startedAt}
            {durationMin !== null && ` · ${durationMin} min`}
            {` · ${session.speaker_count} speaker${session.speaker_count === 1 ? "" : "s"}`}
            {` · ${claims.length} claim${claims.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/sessions/${session.id}`}
            className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
          >
            Back to session
          </Link>
          {limits.exportEnabled ? (
            <a
              href={`/api/sessions/${session.id}/export`}
              className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
            >
              Download Markdown
            </a>
          ) : (
            <span
              className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200"
              title="Available on Solo and above"
            >
              Upgrade to export
            </span>
          )}
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm uppercase tracking-wider text-zinc-400">
          Verifications ({verified.length})
        </h2>
        {claims.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No fact-checkable claims surfaced during this session.
          </p>
        ) : (
          <div className="space-y-3">
            {claims
              .slice()
              .sort((a, b) => a.start_ms - b.start_ms)
              .map((claim) => (
                <ClaimReview
                  key={claim.id}
                  claim={claim}
                  verdict={verdictByClaimId.get(claim.id)}
                />
              ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-wider text-zinc-400">Transcript</h2>
        {chunks.length === 0 ? (
          <p className="text-sm text-zinc-500">No transcript captured.</p>
        ) : (
          <div className="space-y-2 font-mono text-sm text-zinc-200">
            {chunks.map((c) => (
              <p key={c.id}>
                <span className="mr-2 text-xs text-zinc-500">
                  [{formatTimestamp(c.start_ms)}]
                </span>
                <span className="mr-2 text-emerald-300/80">{c.speaker_label}</span>
                <span>{c.text}</span>
              </p>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
