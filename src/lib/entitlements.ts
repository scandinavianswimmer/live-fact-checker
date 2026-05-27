import { createServiceClient } from "@/lib/supabase/service";
import { planLimits, type Plan } from "@/lib/plans";

/**
 * Single check called before creating a new session. Returns either {ok:true}
 * or {ok:false, reason} that the API route can surface as a 402 / 403.
 */
export interface EntitlementContext {
  userId: string;
  speakerCount: number;
}

export async function checkCanStartSession(ctx: EntitlementContext): Promise<
  | { ok: true; plan: Plan; limits: ReturnType<typeof planLimits> }
  | { ok: false; reason: string; code: "plan_locked" | "session_cap"; plan: Plan }
> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan")
    .eq("id", ctx.userId)
    .maybeSingle();
  const plan: Plan = (profile?.plan ?? "free") as Plan;
  const limits = planLimits(plan);

  if (ctx.speakerCount > limits.maxSpeakers) {
    return {
      ok: false,
      code: "plan_locked",
      plan,
      reason: `Plan "${plan}" allows up to ${limits.maxSpeakers} speaker${limits.maxSpeakers === 1 ? "" : "s"}.`,
    };
  }

  if (limits.sessionsPerMonth !== null) {
    const sinceIso = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { count } = await service
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .gte("started_at", sinceIso);
    if ((count ?? 0) >= limits.sessionsPerMonth) {
      return {
        ok: false,
        code: "session_cap",
        plan,
        reason: `Plan "${plan}" allows ${limits.sessionsPerMonth} sessions in any 30-day window.`,
      };
    }
  }

  return { ok: true, plan, limits };
}
