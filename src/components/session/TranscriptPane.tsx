"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";

export function TranscriptPane() {
  const chunks = useSessionStore((s) => s.chunks);
  const partial = useSessionStore((s) => s.partial);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chunks.length, partial]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wider text-zinc-400">
        Live Transcript
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 font-mono text-sm leading-relaxed text-zinc-100"
      >
        {chunks.length === 0 && !partial && (
          <p className="text-zinc-500">Waiting for audio…</p>
        )}
        {chunks.map((c) => (
          <p key={c.id} className="mb-3">
            <span
              className={cn(
                "mr-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                speakerClass(c.speaker_label),
              )}
            >
              {c.speaker_label ?? "?"}
            </span>
            <span>{c.text}</span>
          </p>
        ))}
        {partial && (
          <p className="text-zinc-400">
            <span className="mr-2 rounded bg-zinc-700/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              …
            </span>
            <span className="italic">{partial}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function speakerClass(label: string | null | undefined): string {
  if (label === "Host") return "bg-emerald-500/15 text-emerald-300";
  if (label?.startsWith("Guest")) return "bg-sky-500/15 text-sky-300";
  return "bg-zinc-700/40 text-zinc-300";
}
