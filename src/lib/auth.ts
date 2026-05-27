import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return {
      user: null as null,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  return { user: data.user, response: null as null };
}

/**
 * Confirm the session belongs to the calling user. Uses the per-request
 * client (RLS-respecting) so a leaked session id can't be enumerated.
 */
export async function authorizeSession(sessionId: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "not_found" }, { status: 404 }),
    };
  }
  return { ok: true as const, userId: user.user.id, session: data };
}
