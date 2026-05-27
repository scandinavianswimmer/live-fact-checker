# Live Fact-Checking Assistant

Real-time AI co-pilot for podcasters, news anchors, debate moderators, and live hosts. Listens to live conversation, extracts fact-checkable claims, verifies them against external sources, and surfaces verdicts with citations in under three seconds.

**Sibling products** (same business umbrella, distinct codebases):
- [Jamie](../jamie-repo) — pre-show research engine (async, deep).
- Producer Claude — native macOS app (Swift + WhisperKit + Gemini) on the T7 external drive. This web product is the browser-first sibling.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind v4, Zustand |
| API | Next.js Route Handlers (Node runtime) |
| DB / Auth / Realtime | Supabase (Postgres + Auth magic-link + Realtime channels) |
| Streaming STT | Deepgram Nova-3 (browser ↔ Deepgram WS via short-lived JWT) |
| Claim extraction + verdict scoring | Anthropic Claude Haiku |
| Verification | Perplexity Sonar Online API |
| Validation | Zod |

---

## Quickstart

```bash
pnpm install
cp .env.example .env.local         # fill in keys (see below)
pnpm dev                            # http://localhost:3000
```

Apply the SQL migrations to your Supabase project:

```bash
# Option A — Supabase CLI
supabase link --project-ref <ref>
supabase db push

# Option B — paste into the SQL editor in the Supabase dashboard, in order:
#   supabase/migrations/0001_init.sql
#   supabase/migrations/0002_rls.sql
```

After RLS is on, enable Realtime on `claims` and `verdicts` (Supabase dashboard → Database → Replication).

---

## Environment

| Var | Purpose | Required? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anon key | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for API-route inserts | **Yes** |
| `DEEPGRAM_API_KEY` | Master key — server mints 60s JWTs for the browser (must have **Member** role; default USAGE keys cannot grant tokens) | **Yes** |
| `ANTHROPIC_API_KEY` | Claim Detector + Verdict Scorer (Haiku) | **Yes** |
| `ANTHROPIC_HAIKU_MODEL` | Override model id (default `claude-haiku-4-5-20251001`) | No |
| `PERPLEXITY_API_KEY` | Verification engine | **Yes** |
| `PERPLEXITY_MODEL` | Override model (default `sonar`) | No |
| `STRIPE_*` | Billing (Week 2) | No (until billing) |
| `SENTRY_DSN` | Error monitoring | No |
| `LFC_CLAIM_MIN_CONFIDENCE` | Suppress verdicts below this (default 70) | No |
| `LFC_CLAIM_WINDOW_SECONDS` | Claim-Detector sliding window (default 30) | No |
| `LFC_CLAIM_TICK_SECONDS` | Detect tick interval (default 5) | No |
| `LFC_MAX_SESSION_MINUTES` | Cost guardrail (default 180) | No |

---

## Architecture

```
Browser
  ├─ MicCapture
  │    ├─ POST /api/deepgram/token       → short-lived JWT
  │    ├─ WebSocket → Deepgram Nova-3    → interim + final transcripts
  │    │     → store.partial / pushChunk(...)
  │    │     → POST /api/transcripts     → server persistence (RLS)
  │    └─ every 5s: POST /api/claims/detect
  │           → Haiku over 30s window
  │           → INSERT claims
  │           → for each new claim, POST /api/claims/:id/verify
  │                 → Perplexity Sonar
  │                 → Haiku verdict scoring
  │                 → INSERT verdict (or suppress if confidence < 70)
  │
  └─ CardFeed
       └─ Supabase Realtime channel: postgres_changes on
          claims + verdicts WHERE session_id = current
          → upsert into Zustand store → render verdict cards
```

**Performance targets** (per the build plan):
- Audio → transcript: <500ms
- Claim extraction: <2s from utterance
- End-to-end claim → on-screen verdict: <3s
- False-positive rate: <10%
- False-verdict rate: <2%

---

## Project layout

```
src/
  app/
    page.tsx                            # Landing
    sessions/page.tsx                   # List + new-session form
    sessions/[id]/page.tsx              # Session workspace (server component)
    sessions/[id]/session-workspace.tsx # Client composition
    auth/sign-in/page.tsx               # Magic-link sign-in
    api/
      deepgram/token/route.ts           # POST → 60s JWT
      sessions/route.ts                 # POST / GET sessions
      sessions/[id]/route.ts            # GET / PATCH single session
      transcripts/route.ts              # POST batch insert chunks
      claims/detect/route.ts            # POST trigger Haiku on window
      claims/[id]/verify/route.ts       # POST Sonar + Haiku verdict
  components/session/
    MicCapture.tsx                      # Browser audio + Deepgram WS
    TranscriptPane.tsx                  # Live captions
    CardFeed.tsx                        # Verdict feed (Realtime)
    ClaimCard.tsx                       # Single verdict card
    SessionControls.tsx                 # Start / pause / sensitivity
  lib/
    types.ts                            # Zod schemas + TS types
    prompts.ts                          # Haiku Claim Detector + Verdict Scorer
    env.ts                              # Server env access
    auth.ts                             # requireUser / authorizeSession
    anthropic.ts                        # Haiku JSON wrapper
    perplexity.ts                       # Sonar verify
    deepgram.ts                         # Browser-token grant
    session-store.ts                    # Zustand store
    utils.ts                            # cn()
    supabase/{client,server,service}.ts # 3 client variants
supabase/migrations/
  0001_init.sql                         # Tables
  0002_rls.sql                          # Row-level security
```

---

## Build sequence

- **Week 1** — solidify the real-time loop  ✅ initial scaffold complete
- **Week 2** — UI polish, virtual-device docs, Stripe gating
- **Week 3** — post-session export, onboarding, demo video

## Demo target

Perplexity hackathon. A pristine backup demo video is non-negotiable — live demos go wrong.
