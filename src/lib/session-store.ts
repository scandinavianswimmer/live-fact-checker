"use client";

import { create } from "zustand";
import type { Claim, TranscriptChunk, Verdict } from "@/lib/types";

export type SessionMode = "idle" | "live" | "paused" | "ended";

interface Live {
  sessionId: string | null;
  mode: SessionMode;
  startedAtMs: number | null;

  // Streaming transcript — keyed by client-generated id (we don't have DB ids
  // for partials). Finalized chunks get reconciled when the API echo returns.
  partial: string;
  chunks: TranscriptChunk[];

  // Claims + verdicts (verdict keyed by claim_id for quick lookup)
  claims: Record<string, Claim>;
  verdicts: Record<string, Verdict>;

  // UI controls
  sensitivity: number;
  factCheckMuted: boolean;
}

interface Actions {
  startSession: (sessionId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;

  setPartial: (text: string) => void;
  pushChunk: (chunk: TranscriptChunk) => void;

  upsertClaim: (claim: Claim) => void;
  upsertVerdict: (verdict: Verdict) => void;

  setSensitivity: (v: number) => void;
  toggleFactCheckMuted: () => void;

  reset: () => void;
}

const initial: Live = {
  sessionId: null,
  mode: "idle",
  startedAtMs: null,
  partial: "",
  chunks: [],
  claims: {},
  verdicts: {},
  sensitivity: 70,
  factCheckMuted: false,
};

export const useSessionStore = create<Live & Actions>((set) => ({
  ...initial,
  startSession: (sessionId) =>
    set({ sessionId, mode: "live", startedAtMs: Date.now() }),
  pauseSession: () => set({ mode: "paused" }),
  resumeSession: () => set({ mode: "live" }),
  endSession: () => set({ mode: "ended" }),
  setPartial: (text) => set({ partial: text }),
  pushChunk: (chunk) =>
    set((s) => ({ chunks: [...s.chunks, chunk], partial: "" })),
  upsertClaim: (claim) =>
    set((s) => ({ claims: { ...s.claims, [claim.id]: claim } })),
  upsertVerdict: (verdict) =>
    set((s) => ({ verdicts: { ...s.verdicts, [verdict.claim_id]: verdict } })),
  setSensitivity: (v) => set({ sensitivity: v }),
  toggleFactCheckMuted: () =>
    set((s) => ({ factCheckMuted: !s.factCheckMuted })),
  reset: () => set(initial),
}));
