import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AudioSource } from "@/lib/types";

export const runtime = "nodejs";

const CreateSession = z.object({
  title: z.string().min(1).max(200).optional(),
  audio_source: AudioSource.optional(),
  speaker_count: z.number().int().min(1).max(8).optional(),
  sensitivity: z.number().int().min(0).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const parsed = CreateSession.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      title: parsed.data.title ?? null,
      audio_source: parsed.data.audio_source ?? "browser_mic",
      speaker_count: parsed.data.speaker_count ?? 1,
      sensitivity: parsed.data.sensitivity ?? 70,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data }, { status: 201 });
}

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data });
}
