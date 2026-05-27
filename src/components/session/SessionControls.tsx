"use client";

import { Mic, Pause, Play, Square, VolumeX, Volume2 } from "lucide-react";
import { useSessionStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";

export function SessionControls({ sessionId }: { sessionId: string }) {
  const mode = useSessionStore((s) => s.mode);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const resumeSession = useSessionStore((s) => s.resumeSession);
  const endSession = useSessionStore((s) => s.endSession);
  const factCheckMuted = useSessionStore((s) => s.factCheckMuted);
  const toggleFactCheckMuted = useSessionStore((s) => s.toggleFactCheckMuted);
  const sensitivity = useSessionStore((s) => s.sensitivity);
  const setSensitivity = useSessionStore((s) => s.setSensitivity);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-950/60 px-4 py-2.5">
      <div className="flex items-center gap-1.5 pr-3">
        <span
          className={cn(
            "inline-block size-2 rounded-full",
            mode === "live" && "bg-rose-400 animate-pulse",
            mode === "paused" && "bg-amber-400",
            mode === "ended" && "bg-zinc-500",
            mode === "idle" && "bg-zinc-700",
          )}
        />
        <span className="text-xs uppercase tracking-wider text-zinc-300">
          {mode}
        </span>
      </div>

      {mode === "live" && (
        <button
          onClick={() => {
            pauseSession();
            patch({ status: "paused" });
          }}
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10"
        >
          <Pause className="size-3" /> Pause
        </button>
      )}
      {mode === "paused" && (
        <button
          onClick={() => {
            resumeSession();
            patch({ status: "live" });
          }}
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10"
        >
          <Play className="size-3" /> Resume
        </button>
      )}
      {(mode === "live" || mode === "paused") && (
        <button
          onClick={() => {
            endSession();
            patch({ status: "ended" });
          }}
          className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
        >
          <Square className="size-3" /> End
        </button>
      )}

      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Sensitivity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={sensitivity}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setSensitivity(v);
              patch({ sensitivity: v });
            }}
            className="h-1 w-32 accent-emerald-400"
          />
          <span className="w-8 text-right tabular-nums">{sensitivity}</span>
        </label>
        <button
          onClick={toggleFactCheckMuted}
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10"
          title={factCheckMuted ? "Resume fact-checking" : "Pause fact-checking only"}
        >
          {factCheckMuted ? (
            <>
              <VolumeX className="size-3" /> Muted
            </>
          ) : (
            <>
              <Volume2 className="size-3" /> Live
            </>
          )}
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
          <Mic className="size-3" /> Browser mic
        </span>
      </div>
    </div>
  );
}
