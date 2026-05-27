/**
 * Plan tiers — see pricing in LIVE_ASSISTANT_PLAN.md
 *
 *   Free trial : 3 sessions / 30 min each
 *   Solo  ($29): 20 sessions/mo, 2 hr each, 1 speaker
 *   Pro   ($99): unlimited, 2 speakers, exports, Jamie integration
 *   Studio($299): multi-speaker, teams, priority Sonar, API access
 *
 * Limits live in code (not the DB) so changing tiers ships with a deploy.
 * Stripe is wired later in Week 2 polish — for now `plan` flips manually
 * from the Supabase dashboard.
 */

export type Plan = "free" | "solo" | "pro" | "studio";

export interface PlanLimits {
  /** Max sessions in a rolling 30-day window. null = unlimited. */
  sessionsPerMonth: number | null;
  /** Max length of a single session, in minutes. */
  maxSessionMinutes: number;
  /** Max distinct speakers per session (diarization). */
  maxSpeakers: number;
  /** Post-session Markdown/JSON export available. */
  exportEnabled: boolean;
  /** Read-only public view of a session (Jamie-style share links). */
  shareLinksEnabled: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    sessionsPerMonth: 3,
    maxSessionMinutes: 30,
    maxSpeakers: 1,
    exportEnabled: false,
    shareLinksEnabled: false,
  },
  solo: {
    sessionsPerMonth: 20,
    maxSessionMinutes: 120,
    maxSpeakers: 1,
    exportEnabled: true,
    shareLinksEnabled: false,
  },
  pro: {
    sessionsPerMonth: null,
    maxSessionMinutes: 120,
    maxSpeakers: 2,
    exportEnabled: true,
    shareLinksEnabled: true,
  },
  studio: {
    sessionsPerMonth: null,
    maxSessionMinutes: 180,
    maxSpeakers: 6,
    exportEnabled: true,
    shareLinksEnabled: true,
  },
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  solo: "Solo",
  pro: "Pro",
  studio: "Studio",
};

export function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "solo" || value === "pro" || value === "studio";
}

export function planLimits(plan: unknown): PlanLimits {
  return PLAN_LIMITS[isPlan(plan) ? plan : "free"];
}
