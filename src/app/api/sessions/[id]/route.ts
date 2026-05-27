import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SessionStatus } from "@/lib/types";

export const runtime = "nodejs";

const PatchSession = z.object({
  status: SessionStatus.optional(),
  title: z.string().max(200).optional(),
  sensitivity: z.number().int().min(0).max(100).optional(),
});

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  const auth = await authorizeSession(id);
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  const auth = await authorizeSession(id);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = PatchSession.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "ended" || parsed.data.status === "failed") {
    const endedAt = new Date();
    patch.ended_at = endedAt.toISOString();
    // Compute duration from started_at — read it cheaply via RLS.
    const { data: existing } = await supabase
      .from("sessions")
      .select("started_at")
      .eq("id", id)
      .single();
    if (existing?.started_at) {
      const started = new Date(existing.started_at).getTime();
      patch.duration_ms = Math.max(0, endedAt.getTime() - started);
    }
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data });
}
