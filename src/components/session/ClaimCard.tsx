"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Claim, Verdict } from "@/lib/types";

const VERDICT_STYLES: Record<Verdict["verdict"], string> = {
  true: "border-emerald-500/40 bg-emerald-500/5",
  false: "border-rose-500/40 bg-rose-500/5",
  misleading: "border-amber-500/40 bg-amber-500/5",
  unverified: "border-zinc-500/40 bg-zinc-500/5",
};

const VERDICT_LABEL: Record<Verdict["verdict"], string> = {
  true: "True",
  false: "False",
  misleading: "Misleading",
  unverified: "Unverified",
};

const VERDICT_DOT: Record<Verdict["verdict"], string> = {
  true: "bg-emerald-400",
  false: "bg-rose-400",
  misleading: "bg-amber-400",
  unverified: "bg-zinc-400",
};

export function ClaimCard({ claim, verdict }: { claim: Claim; verdict: Verdict | undefined }) {
  if (!verdict) {
    return (
      <div className="rounded-lg border border-zinc-700/40 bg-zinc-900/40 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
          <span className="inline-block size-2 animate-pulse rounded-full bg-zinc-400" />
          <span>Verifying…</span>
        </div>
        <p className="text-sm text-zinc-200">{claim.assertion}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-4", VERDICT_STYLES[verdict.verdict])}>
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={cn("inline-block size-2 rounded-full", VERDICT_DOT[verdict.verdict])} />
          <span className="font-semibold uppercase tracking-wider text-zinc-100">
            {VERDICT_LABEL[verdict.verdict]}
          </span>
          <span className="text-zinc-400">· {verdict.confidence}% confidence</span>
        </div>
        {claim.speaker_label && (
          <span className="text-zinc-500">{claim.speaker_label}</span>
        )}
      </div>
      <p className="mb-2 text-sm font-medium text-zinc-100">{claim.assertion}</p>
      <p className="mb-3 text-sm text-zinc-300">{verdict.summary}</p>
      {verdict.sources.length > 0 && (
        <ul className="space-y-1 border-t border-white/10 pt-2 text-xs">
          {verdict.sources.slice(0, 3).map((s, i) => (
            <li key={s.url} className="flex items-start gap-2">
              <span className="text-zinc-500">[S{i + 1}]</span>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate text-zinc-300 underline-offset-2 hover:text-zinc-100 hover:underline"
              >
                {s.title}
              </a>
              <span className="text-zinc-500">{s.publisher}</span>
              <ExternalLink className="size-3 shrink-0 text-zinc-500" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
