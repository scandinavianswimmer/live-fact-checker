"use client";

import { useEffect, useMemo } from "react";
import { useSessionStore } from "@/lib/session-store";
import { createClient } from "@/lib/supabase/client";
import { Claim, Verdict } from "@/lib/types";
import { ClaimCard } from "./ClaimCard";

/**
 * Subscribes to Supabase Realtime for new/updated claims and verdicts on the
 * current session. Renders verdict cards newest-first; pending claims show a
 * "Verifying…" placeholder.
 */
export function CardFeed({ sessionId }: { sessionId: string }) {
  const claims = useSessionStore((s) => s.claims);
  const verdicts = useSessionStore((s) => s.verdicts);
  const upsertClaim = useSessionStore((s) => s.upsertClaim);
  const upsertVerdict = useSessionStore((s) => s.upsertVerdict);

  useEffect(() => {
    const supabase = createClient();

    // Initial backfill — anything already created during this session
    (async () => {
      const { data: existingClaims } = await supabase
        .from("claims")
        .select("*")
        .eq("session_id", sessionId)
        .order("start_ms", { ascending: false });
      for (const c of existingClaims ?? []) upsertClaim(Claim.parse(c));

      const { data: existingVerdicts } = await supabase
        .from("verdicts")
        .select("*")
        .eq("session_id", sessionId);
      for (const v of existingVerdicts ?? []) upsertVerdict(Verdict.parse(v));
    })();

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claims",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as unknown;
          const parsed = Claim.safeParse(row);
          if (parsed.success) upsertClaim(parsed.data);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "verdicts",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const parsed = Verdict.safeParse(payload.new);
          if (parsed.success) upsertVerdict(parsed.data);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, upsertClaim, upsertVerdict]);

  const visible = useMemo(() => {
    return Object.values(claims)
      .filter((c) => c.status !== "suppressed" && c.status !== "error")
      .sort((a, b) => b.start_ms - a.start_ms);
  }, [claims]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wider text-zinc-400">
        Verifications
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {visible.length === 0 && (
          <p className="text-sm text-zinc-500">
            No fact-checkable claims yet. They&apos;ll appear here as the conversation unfolds.
          </p>
        )}
        {visible.map((c) => (
          <ClaimCard key={c.id} claim={c} verdict={verdicts[c.id]} />
        ))}
      </div>
    </div>
  );
}
