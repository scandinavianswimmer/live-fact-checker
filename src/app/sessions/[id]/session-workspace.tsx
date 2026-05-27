"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/lib/session-store";
import { MicCapture } from "@/components/session/MicCapture";
import { TranscriptPane } from "@/components/session/TranscriptPane";
import { CardFeed } from "@/components/session/CardFeed";
import { SessionControls } from "@/components/session/SessionControls";
import type { Session } from "@/lib/types";

export function SessionWorkspace({ session }: { session: Session }) {
  const startSession = useSessionStore((s) => s.startSession);
  const reset = useSessionStore((s) => s.reset);
  const setSensitivity = useSessionStore((s) => s.setSensitivity);

  useEffect(() => {
    reset();
    startSession(session.id);
    setSensitivity(session.sensitivity);
    return () => {
      reset();
    };
  }, [session.id, session.sensitivity, startSession, reset, setSensitivity]);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-white/10 px-6 py-3">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Session</p>
        <h1 className="text-lg font-medium text-zinc-100">
          {session.title ?? "Untitled session"}
        </h1>
      </header>

      <SessionControls sessionId={session.id} />

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[1fr_1.2fr]">
        <div className="border-r border-white/10">
          <TranscriptPane />
        </div>
        <div>
          <CardFeed sessionId={session.id} />
        </div>
      </div>

      <MicCapture sessionId={session.id} speakerCount={session.speaker_count} />
    </main>
  );
}
