import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { TranscriptChunkInput } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Batch insert finalized transcript chunks for a session. Browser ships chunks
 * here as Deepgram returns them with is_final=true.
 *
 * RLS enforces ownership — the per-request client uses the user's auth cookie.
 */
const Body = z.object({
  chunks: z.array(TranscriptChunkInput).min(1).max(50),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transcript_chunks")
    .insert(parsed.data.chunks)
    .select("id, session_id, start_ms, end_ms");

  if (error) {
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ inserted: data?.length ?? 0, ids: data?.map((d) => d.id) ?? [] });
}
