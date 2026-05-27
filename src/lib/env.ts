/**
 * Server-only env access with friendly errors. Never import from client code —
 * any `require()` of a key not prefixed NEXT_PUBLIC_ from the browser bundle
 * is a leak.
 */

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  // Supabase
  supabaseUrl: () => need("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => need("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => need("SUPABASE_SERVICE_ROLE_KEY"),

  // Deepgram
  deepgramApiKey: () => need("DEEPGRAM_API_KEY"),

  // Anthropic
  anthropicApiKey: () => need("ANTHROPIC_API_KEY"),
  anthropicHaikuModel: () =>
    optional("ANTHROPIC_HAIKU_MODEL") ?? "claude-haiku-4-5-20251001",

  // Perplexity
  perplexityApiKey: () => need("PERPLEXITY_API_KEY"),
  perplexityApiKeyOptional: () => optional("PERPLEXITY_API_KEY"),
  perplexityModel: () => optional("PERPLEXITY_MODEL") ?? "sonar",

  // Tunables
  claimMinConfidence: () =>
    parseInt(optional("LFC_CLAIM_MIN_CONFIDENCE") ?? "70", 10),
  claimWindowSeconds: () =>
    parseInt(optional("LFC_CLAIM_WINDOW_SECONDS") ?? "30", 10),
  claimTickSeconds: () =>
    parseInt(optional("LFC_CLAIM_TICK_SECONDS") ?? "5", 10),
  maxSessionMinutes: () =>
    parseInt(optional("LFC_MAX_SESSION_MINUTES") ?? "180", 10),
};

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
