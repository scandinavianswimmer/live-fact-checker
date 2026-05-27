"use client";

import { AlertTriangle, X } from "lucide-react";
import type { ErrorKind } from "./MicCapture";

const COPY: Record<ErrorKind, { title: string; hint: string }> = {
  mic_denied: {
    title: "Microphone access denied",
    hint: "Enable mic permission for this site in your browser settings, then refresh.",
  },
  token: {
    title: "Couldn't connect to Deepgram",
    hint: "We failed to mint a transcription token. Check that DEEPGRAM_API_KEY is set in the server env.",
  },
  ws: {
    title: "Transcription connection error",
    hint: "Deepgram returned an error. We'll attempt to reconnect; if it persists, refresh the page.",
  },
  ws_closed: {
    title: "Transcription dropped",
    hint: "Deepgram closed the connection unexpectedly. End and restart the session to reconnect.",
  },
  recorder: {
    title: "Browser recorder error",
    hint: "Your browser couldn't record audio. Try Chrome or Edge — Safari support for MediaRecorder varies.",
  },
};

export function SessionErrorBanner({
  kind,
  detail,
  onDismiss,
}: {
  kind: ErrorKind;
  detail?: string;
  onDismiss: () => void;
}) {
  const copy = COPY[kind];
  return (
    <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-3 text-sm text-rose-100">
      <div className="mx-auto flex w-full max-w-5xl items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />
        <div className="flex-1">
          <p className="font-medium text-rose-50">{copy.title}</p>
          <p className="text-rose-200/90">{copy.hint}</p>
          {detail && (
            <p className="mt-1 font-mono text-xs text-rose-300/70">{detail}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="rounded p-1 text-rose-300 hover:bg-rose-500/20"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
