"use client";

import { useEffect, useRef } from "react";
import { DeepgramClient } from "@deepgram/sdk";
import type { listen } from "@deepgram/sdk";
import { useSessionStore } from "@/lib/session-store";
import type { TranscriptChunkInput } from "@/lib/types";

type ListenMessage =
  | listen.ListenV1Results
  | listen.ListenV1Metadata
  | listen.ListenV1UtteranceEnd
  | listen.ListenV1SpeechStarted;

/**
 * Captures the user's mic in the browser, streams it over WebSocket directly
 * to Deepgram (using a short-lived JWT minted by /api/deepgram/token), and
 * surfaces:
 *   - interim transcripts → store.partial (rendered in TranscriptPane)
 *   - finalized chunks   → store.pushChunk + POST /api/transcripts (server
 *     storage so the claim detector has authoritative data)
 *
 * Also drives the claim detector tick — every LFC_CLAIM_TICK_SECONDS we POST
 * /api/claims/detect for the session, and for every newly returned claim we
 * fire /api/claims/:id/verify in parallel.
 */
const TICK_SECONDS = 5;

type LiveSocket = Awaited<ReturnType<DeepgramClient["listen"]["v1"]["connect"]>>;

export function MicCapture({
  sessionId,
  speakerCount,
}: {
  sessionId: string;
  speakerCount: number;
}) {
  const mode = useSessionStore((s) => s.mode);
  const setPartial = useSessionStore((s) => s.setPartial);
  const pushChunk = useSessionStore((s) => s.pushChunk);
  const startedAtMs = useSessionStore((s) => s.startedAtMs);
  const factCheckMuted = useSessionStore((s) => s.factCheckMuted);

  const liveRef = useRef<LiveSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFinalsRef = useRef<TranscriptChunkInput[]>([]);

  useEffect(() => {
    if (mode !== "live" || !sessionId || !startedAtMs) return;

    let cancelled = false;

    (async () => {
      // 1. Mint Deepgram token
      const tokenRes = await fetch("/api/deepgram/token", { method: "POST" });
      if (!tokenRes.ok) {
        console.error("Deepgram token failed", await tokenRes.text());
        return;
      }
      const { token } = (await tokenRes.json()) as { token: string };
      if (cancelled) return;

      // 2. Open Deepgram WebSocket using the JWT as Bearer auth.
      // We construct a no-auth DeepgramClient and pass Authorization explicitly
      // — the SDK requires an apiKey at construct time even though we're
      // overriding the header for WS.
      const dg = new DeepgramClient({ apiKey: token });
      const live = await dg.listen.v1.connect({
        model: "nova-3",
        smart_format: "true",
        punctuate: "true",
        interim_results: "true",
        diarize: speakerCount > 1 ? "true" : "false",
        utterance_end_ms: "1000",
        endpointing: "300",
        Authorization: `Bearer ${token}`,
      });
      liveRef.current = live;

      live.on("open", async () => {
        // 3. Acquire mic and pipe blobs into the WS
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mime = pickSupportedMime();
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            try {
              live.sendMedia(e.data);
            } catch {
              // socket may not be open yet on the very first chunk
            }
          }
        };
        recorder.start(250);
      });

      live.on("message", (raw) => {
        const msg = raw as ListenMessage;
        if (msg.type !== "Results") return;
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;
        const text = alt.transcript.trim();
        if (!text) return;

        if (!msg.is_final) {
          setPartial(text);
          return;
        }

        const startMs = Math.max(0, Math.floor(msg.start * 1000));
        const endMs = Math.max(startMs, startMs + Math.floor(msg.duration * 1000));
        const speaker = alt.words?.[0]?.speaker;
        const speakerLabel =
          speakerCount > 1 && typeof speaker === "number"
            ? speakerLabelFor(speaker)
            : "Host";

        const chunk: TranscriptChunkInput = {
          session_id: sessionId,
          speaker: typeof speaker === "number" ? speaker : null,
          speaker_label: speakerLabel,
          text,
          start_ms: startMs,
          end_ms: endMs,
          confidence: typeof alt.confidence === "number" ? alt.confidence : null,
          is_final: true,
        };

        pushChunk({
          ...chunk,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        });

        pendingFinalsRef.current.push(chunk);
        scheduleFlush();
      });

      live.on("close", () => {
        liveRef.current = null;
      });
      live.on("error", (err: Error) => {
        console.error("Deepgram error", err);
      });

      live.connect();
      await live.waitForOpen();
    })();

    // 4. Claim detector tick — every 5s, ask the server to scan the window
    tickRef.current = setInterval(async () => {
      if (factCheckMuted) return;
      try {
        const res = await fetch("/api/claims/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { claims: Array<{ id: string }> };
        for (const c of json.claims ?? []) {
          fetch(`/api/claims/${c.id}/verify`, { method: "POST" }).catch(() => undefined);
        }
      } catch (err) {
        console.warn("detect tick failed", err);
      }
    }, TICK_SECONDS * 1000);

    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      if (flushRef.current) clearTimeout(flushRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        liveRef.current?.close();
      } catch {
        // already closed
      }
      liveRef.current = null;
    };
  }, [mode, sessionId, startedAtMs, speakerCount, factCheckMuted, pushChunk, setPartial]);

  function scheduleFlush() {
    if (flushRef.current) return;
    flushRef.current = setTimeout(async () => {
      flushRef.current = null;
      const batch = pendingFinalsRef.current.splice(0);
      if (!batch.length) return;
      try {
        await fetch("/api/transcripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunks: batch }),
        });
      } catch (err) {
        console.warn("transcript flush failed", err);
      }
    }, 800);
  }

  return null;
}

function pickSupportedMime(): string | null {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
      return m;
    }
  }
  return null;
}

function speakerLabelFor(speaker: number): string {
  return speaker === 0 ? "Host" : `Guest ${speaker}`;
}
