import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { haikuJSON } from "@/lib/anthropic";
import {
  CLAIM_DETECTOR_SYSTEM,
  claimDetectorUser,
} from "@/lib/prompts";
import { DetectedClaimList, type DetectedClaim } from "@/lib/types";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Detect fact-checkable claims in the rolling transcript window for a session.
 *
 * Triggered by the browser every ~5s. We re-pull the last N seconds of chunks
 * directly from the DB to ensure consistency with what the server has stored.
 * Returns the newly inserted claim rows so the browser can immediately fire
 * /api/claims/:id/verify in parallel.
 */
const Body = z.object({
  session_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { session_id } = parsed.data;

  const auth = await authorizeSession(session_id);
  if (!auth.ok) return auth.response;

  const windowMs = env.claimWindowSeconds() * 1000;
  const service = createServiceClient();

  // Latest end_ms in the session bounds the window.
  const { data: latest } = await service
    .from("transcript_chunks")
    .select("end_ms")
    .eq("session_id", session_id)
    .order("end_ms", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest?.end_ms) {
    return NextResponse.json({ detected: 0, claims: [] });
  }
  const sinceMs = Math.max(0, latest.end_ms - windowMs);

  const { data: chunks, error: chunksErr } = await service
    .from("transcript_chunks")
    .select("speaker_label, text, start_ms, end_ms")
    .eq("session_id", session_id)
    .gte("end_ms", sinceMs)
    .order("start_ms", { ascending: true })
    .limit(500);
  if (chunksErr) {
    return NextResponse.json({ error: "transcript_query_failed", detail: chunksErr.message }, { status: 500 });
  }
  if (!chunks?.length) {
    return NextResponse.json({ detected: 0, claims: [] });
  }

  const windowText = chunks
    .map((c) => `[${formatMs(c.start_ms)} ${c.speaker_label ?? "?"}] ${c.text}`)
    .join("\n");

  // Already-detected assertions in the session (dedupe context for Haiku)
  const { data: existing } = await service
    .from("claims")
    .select("assertion")
    .eq("session_id", session_id)
    .order("created_at", { ascending: false })
    .limit(20);
  const knownAssertions = (existing ?? []).map((c) => c.assertion);

  let detected: DetectedClaim[];
  try {
    const { data } = await haikuJSON<{ claims: DetectedClaim[] }>({
      system: CLAIM_DETECTOR_SYSTEM,
      user: claimDetectorUser({ windowText, knownAssertions }),
      maxTokens: 1024,
    });
    detected = DetectedClaimList.parse(data).claims;
  } catch (err) {
    return NextResponse.json(
      { error: "haiku_failed", detail: (err as Error).message },
      { status: 502 },
    );
  }

  if (!detected.length) {
    return NextResponse.json({ detected: 0, claims: [] });
  }

  // Filter by importance and dedupe against existing assertions (substring +
  // normalized text). Haiku usually obeys the dedupe instruction but defense-
  // in-depth keeps us safe.
  const known = new Set(knownAssertions.map(normalize));
  const fresh = detected.filter(
    (c) => c.importance >= 50 && !known.has(normalize(c.assertion)),
  );
  if (!fresh.length) {
    return NextResponse.json({ detected: 0, claims: [] });
  }

  const { data: inserted, error: insertErr } = await service
    .from("claims")
    .insert(
      fresh.map((c) => ({
        session_id,
        speaker_label: c.speaker_label,
        subject: c.subject,
        assertion: c.assertion,
        context: c.context,
        importance: c.importance,
        start_ms: c.start_ms,
        end_ms: c.end_ms,
        status: "pending",
      })),
    )
    .select("*");
  if (insertErr) {
    return NextResponse.json({ error: "insert_failed", detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ detected: inserted?.length ?? 0, claims: inserted ?? [] });
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
