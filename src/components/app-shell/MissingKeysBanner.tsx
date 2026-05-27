import { AlertTriangle } from "lucide-react";

interface ServicesStatus {
  supabase: boolean;
  deepgram: boolean;
  anthropic: boolean;
  perplexity: boolean;
  stripe: boolean;
}

const HINTS: Record<keyof ServicesStatus, string> = {
  supabase: "Supabase (NEXT_PUBLIC_SUPABASE_URL / ANON / SERVICE_ROLE)",
  deepgram: "Deepgram (DEEPGRAM_API_KEY) — required for live transcription",
  anthropic: "Anthropic (ANTHROPIC_API_KEY) — required for claim detection + verdict scoring",
  perplexity: "Perplexity (PERPLEXITY_API_KEY) — verifications fall back to 'unverified' until set",
  stripe: "Stripe (STRIPE_SECRET_KEY) — billing disabled until set",
};

export async function MissingKeysBanner() {
  // Self-fetch is fine — runs server-side via NextResponse handler.
  const services = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
  } satisfies ServicesStatus;

  // Don't surface Stripe — that's an opt-in for billing.
  const critical: Array<keyof ServicesStatus> = ["supabase", "deepgram", "anthropic"];
  const soft: Array<keyof ServicesStatus> = ["perplexity"];

  const missingCritical = critical.filter((k) => !services[k]);
  const missingSoft = soft.filter((k) => !services[k]);

  if (!missingCritical.length && !missingSoft.length) return null;

  return (
    <div className="mx-auto mt-4 w-full max-w-5xl px-6">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100">
        <div className="mb-1 flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 text-amber-300" />
          {missingCritical.length
            ? "Configuration incomplete"
            : "Running in degraded mode"}
        </div>
        <ul className="ml-6 list-disc text-amber-200/90">
          {missingCritical.map((k) => (
            <li key={k}>{HINTS[k]}</li>
          ))}
          {missingSoft.map((k) => (
            <li key={k} className="text-amber-200/70">
              {HINTS[k]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
