"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/lib/session-store";
import type { TranscriptChunkInput } from "@/lib/types";

/**
 * Captures the user's mic in the browser, streams it over a raw WebSocket
 * directly to Deepgram (using a short-lived JWT minted by /api/deepgram/token
 * and passed via the documented `['token', jwt]` subprotocol — browsers
 * cannot pass an `Authorization` header on a WebSocket, so the SDK's
 * header-based auth does not work in the browser).
 *
 * Per-chunk flow:
 *   - interim transcripts → store.partial (rendered in TranscriptPane)
 *   - finalized chunks   → store.pushChunk + POST /api/transcripts (server
 *     storage so the claim detector has authoritative data)
 *
 * Side loop: every TICK_SECONDS the browser POSTs /api/claims/detect for the
 * session, and for every newly returned claim fires /api/claims/:id/verify in
 * parallel. Verdicts arrive via Supabase Realtime in CardFeed.
 */
const TICK_SECONDS = 5;
const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

interface DeepgramAlternative {
  transcript: string;
  confidence?: number;
  words?: Array<{ speaker?: number }>;
}
interface DeepgramResultsMessage {
  type: "Results";
  is_final?: boolean;
  start: number;
  duration: number;
  channel?: { alternatives?: DeepgramAlternative[] };
}
type DeepgramMessage =
  | DeepgramResultsMessage
  | { type: "Metadata" | "UtteranceEnd" | "SpeechStarted"; [k: string]: unknown };

export function MicCapture({
  sessionId,
  speakerCount,
  onError,
}: {
  sessionId: string;
  speakerCount: number;
  onError?: (kind: ErrorKind, detail?: string) => void;
}) {
  const mode = useSessionStore((s) => s.mode);
  const setPartial = useSessionStore((s) => s.setPartial);
  const pushChunk = useSessionStore((s) => s.pushChunk);
  const startedAtMs = useSessionStore((s) => s.startedAtMs);
  const factCheckMuted = useSessionStore((s) => s.factCheckMuted);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFinalsRef = useRef<TranscriptChunkInput[]>([]);

  useEffect(() => {
    if (mode !== "live" || !sessionId || !startedAtMs) return;

    let cancelled = false;

    (async () => {
      // 1. Mint Deepgram JWT (60s TTL) from our backend
      let token: string;
      try {
        const tokenRes = await fetch("/api/deepgram/token", { method: "POST" });
        if (!tokenRes.ok) {
          onError?.("token", `HTTP ${tokenRes.status}: ${(await tokenRes.text()).slice(0, 200)}`);
          return;
        }
        ({ token } = (await tokenRes.json()) as { token: string });
      } catch (err) {
        onError?.("token", (err as Error).message);
        return;
      }
      if (cancelled) return;

      // 2. Acquire mic with a clear, actionable error if denied
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        });
      } catch (err) {
        onError?.("mic_denied", (err as Error).message);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      // 3. Build the Deepgram URL with query params and connect via subprotocol auth
      const params = new URLSearchParams({
        model: "nova-3",
        smart_format: "true",
        punctuate: "true",
        interim_results: "true",
        utterance_end_ms: "1000",
        endpointing: "300",
        language: "en-US",
      });
      if (speakerCount > 1) params.set("diarize", "true");

      const ws = new WebSocket(`${DEEPGRAM_WS_URL}?${params.toString()}`, [
        "token",
        token,
      ]);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        // 4. Start recording — fires ondataavailable every 250ms
        const mime = pickSupportedMime();
        const recorder = new MediaRecorder(
          stream,
          mime ? { mimeType: mime } : undefined,
        );
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };
        recorder.onerror = (e) => {
          onError?.("recorder", String((e as Event & { error?: Error }).error ?? "MediaRecorder error"));
        };
        recorder.start(250);
      };

      ws.onmessage = (evt) => {
        let msg: DeepgramMessage;
        try {
          msg = JSON.parse(typeof evt.data === "string" ? evt.data : "") as DeepgramMessage;
        } catch {
          return;
        }
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
      };

      ws.onerror = () => {
        onError?.("ws", "Deepgram WebSocket error");
      };

      ws.onclose = (e) => {
        // Code 1000 = clean close. Anything else while we're still in "live"
        // mode means the connection dropped unexpectedly.
        if (e.code !== 1000 && !cancelled) {
          onError?.("ws_closed", `code=${e.code} reason=${e.reason || "(none)"}`);
        }
      };
    })();

    // 5. Claim detector tick — every 5s, ask the server to scan the window
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
      } catch {
        // Transient — next tick retries
      }
    }, TICK_SECONDS * 1000);

    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      if (flushRef.current) clearTimeout(flushRef.current);
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        wsRef.current?.close(1000);
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, [mode, sessionId, startedAtMs, speakerCount, factCheckMuted, pushChunk, setPartial, onError]);

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
      } catch {
        // Lost chunk — acceptable; next final reconciles on the server
      }
    }, 800);
  }

  return null;
}

export type ErrorKind =
  | "token"
  | "mic_denied"
  | "ws"
  | "ws_closed"
  | "recorder";

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
