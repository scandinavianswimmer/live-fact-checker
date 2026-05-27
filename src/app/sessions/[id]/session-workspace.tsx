"use client";

import { useCallback, useEffect, useState } from "react";
import { useSessionStore } from "@/lib/session-store";
import { MicCapture, type ErrorKind } from "@/components/session/MicCapture";
import { TranscriptPane } from "@/components/session/TranscriptPane";
import { CardFeed } from "@/components/session/CardFeed";
import { SessionControls } from "@/components/session/SessionControls";
import { SessionErrorBanner } from "@/components/session/SessionErrorBanner";
import type { Session } from "@/lib/types";

interface ActiveError {
  kind: ErrorKind;
  detail?: string;
}

export function SessionWorkspace({ session }: { session: Session }) {
  const startSession = useSessionStore((s) => s.startSession);
  const reset = useSessionStore((s) => s.reset);
  const setSensitivity = useSessionStore((s) => s.setSensitivity);
  const [error, setError] = useState<ActiveError | null>(null);

  useEffect(() => {
    reset();
    startSession(session.id);
    setSensitivity(session.sensitivity);
    return () => {
      reset();
    };
  }, [session.id, session.sensitivity, startSession, reset, setSensitivity]);

  const handleError = useCallback((kind: ErrorKind, detail?: string) => {
    setError({ kind, detail });
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-white/10 px-6 py-3">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Session</p>
        <h1 className="text-lg font-medium text-zinc-100">
          {session.title ?? "Untitled session"}
        </h1>
      </header>

      <SessionControls sessionId={session.id} />

      {error && (
        <SessionErrorBanner
          kind={error.kind}
          detail={error.detail}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[1fr_1.2fr]">
        <div className="border-r border-white/10">
          <TranscriptPane />
        </div>
        <div>
          <CardFeed sessionId={session.id} />
        </div>
      </div>

      <MicCapture
        sessionId={session.id}
        speakerCount={session.speaker_count}
        onError={handleError}
      />
    </main>
  );
}
