import { z } from "zod";

// ============================================================================
// Sessions
// ============================================================================
export const SessionStatus = z.enum(["live", "paused", "ended", "failed"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const AudioSource = z.enum(["browser_mic", "virtual_device", "upload"]);
export type AudioSource = z.infer<typeof AudioSource>;

export const Session = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().nullable(),
  status: SessionStatus,
  started_at: z.string(),
  ended_at: z.string().nullable(),
  duration_ms: z.number().int().nullable(),
  sensitivity: z.number().int().min(0).max(100),
  audio_source: AudioSource,
  speaker_count: z.number().int(),
  metadata: z.record(z.string(), z.unknown()),
});
export type Session = z.infer<typeof Session>;

// ============================================================================
// Transcript
// ============================================================================
export const TranscriptChunk = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  speaker: z.number().int().nullable(),
  speaker_label: z.string().nullable(),
  text: z.string(),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
  confidence: z.number().nullable(),
  is_final: z.boolean(),
  created_at: z.string(),
});
export type TranscriptChunk = z.infer<typeof TranscriptChunk>;

// Browser → /api/transcripts payload (no id/created_at yet)
export const TranscriptChunkInput = TranscriptChunk.pick({
  session_id: true,
  speaker: true,
  speaker_label: true,
  text: true,
  start_ms: true,
  end_ms: true,
  confidence: true,
  is_final: true,
});
export type TranscriptChunkInput = z.infer<typeof TranscriptChunkInput>;

// ============================================================================
// Claims
// ============================================================================
export const ClaimStatus = z.enum([
  "pending",
  "verifying",
  "verified",
  "suppressed",
  "error",
]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const Claim = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  speaker_label: z.string().nullable(),
  subject: z.string().nullable(),
  assertion: z.string(),
  context: z.string().nullable(),
  importance: z.number().int().min(0).max(100),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
  status: ClaimStatus,
  suppressed_reason: z.string().nullable(),
  created_at: z.string(),
});
export type Claim = z.infer<typeof Claim>;

// Haiku's claim-detector output shape
export const DetectedClaim = z.object({
  subject: z.string(),
  assertion: z.string(),
  context: z.string(),
  speaker_label: z.string().nullable(),
  importance: z.number().int().min(0).max(100),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
});
export type DetectedClaim = z.infer<typeof DetectedClaim>;

export const DetectedClaimList = z.object({
  claims: z.array(DetectedClaim),
});
export type DetectedClaimList = z.infer<typeof DetectedClaimList>;

// ============================================================================
// Verdicts
// ============================================================================
export const VerdictCategory = z.enum([
  "true",
  "false",
  "misleading",
  "unverified",
]);
export type VerdictCategory = z.infer<typeof VerdictCategory>;

export const Source = z.object({
  title: z.string(),
  url: z.string().url(),
  publisher: z.string().nullable(),
  snippet: z.string().nullable(),
});
export type Source = z.infer<typeof Source>;

export const Verdict = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  session_id: z.string().uuid(),
  verdict: VerdictCategory,
  confidence: z.number().int().min(0).max(100),
  summary: z.string(),
  sources: z.array(Source),
  raw_sonar: z.unknown().nullable(),
  latency_ms: z.number().int().nullable(),
  created_at: z.string(),
});
export type Verdict = z.infer<typeof Verdict>;

// Haiku's verdict scoring output shape
export const VerdictScore = z.object({
  verdict: VerdictCategory,
  confidence: z.number().int().min(0).max(100),
  summary: z.string(),
});
export type VerdictScore = z.infer<typeof VerdictScore>;
