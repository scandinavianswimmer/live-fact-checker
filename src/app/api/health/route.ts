import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lightweight readiness probe. Reports which external services are configured.
 * Returns 200 even when keys are missing — surfacing config gaps is the point.
 */
export function GET() {
  return NextResponse.json({
    services: {
      supabase: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      perplexity: Boolean(process.env.PERPLEXITY_API_KEY),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    model: {
      haiku: process.env.ANTHROPIC_HAIKU_MODEL ?? "claude-haiku-4-5-20251001",
      perplexity: process.env.PERPLEXITY_MODEL ?? "sonar",
    },
  });
}
