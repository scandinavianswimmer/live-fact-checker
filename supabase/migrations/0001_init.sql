-- Live Fact-Checking Assistant — initial schema
-- All IDs are uuid; FKs are real; timestamps are timestamptz.

create extension if not exists "pgcrypto";

-- =========================================================================
-- profiles: one row per auth.users, mirrors what we need app-side
-- =========================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text,
  plan        text not null default 'free',  -- free | solo | pro | studio
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =========================================================================
-- sessions: one row per recording session
-- =========================================================================
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text,
  status        text not null default 'live',  -- live | paused | ended | failed
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_ms   integer,
  sensitivity   integer not null default 70 check (sensitivity between 0 and 100),
  audio_source  text not null default 'browser_mic', -- browser_mic | virtual_device | upload
  speaker_count integer not null default 1,
  metadata      jsonb not null default '{}'::jsonb
);
create index if not exists sessions_user_idx on public.sessions(user_id, started_at desc);

-- =========================================================================
-- transcript_chunks: append-only stream of finalized utterances
-- =========================================================================
create table if not exists public.transcript_chunks (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  speaker       integer,                          -- diarization speaker id
  speaker_label text,                              -- "Host" | "Guest 1" | ...
  text          text not null,
  start_ms      integer not null,                  -- ms since session start
  end_ms        integer not null,
  confidence    real,                              -- Deepgram confidence
  is_final      boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists transcript_chunks_session_idx
  on public.transcript_chunks(session_id, start_ms);

-- =========================================================================
-- claims: surface-able assertions extracted from transcript windows
-- =========================================================================
create table if not exists public.claims (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  speaker_label text,
  subject       text,
  assertion     text not null,
  context       text,
  importance    integer not null default 50 check (importance between 0 and 100),
  start_ms      integer not null,
  end_ms        integer not null,
  status        text not null default 'pending', -- pending | verifying | verified | suppressed | error
  suppressed_reason text,
  created_at    timestamptz not null default now()
);
create index if not exists claims_session_idx
  on public.claims(session_id, start_ms desc);
create index if not exists claims_status_idx
  on public.claims(status) where status in ('pending','verifying');

-- =========================================================================
-- verdicts: one verdict per claim (1:1 once verified)
-- =========================================================================
create table if not exists public.verdicts (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid not null unique references public.claims(id) on delete cascade,
  session_id    uuid not null references public.sessions(id) on delete cascade,
  verdict       text not null,                    -- true | false | misleading | unverified
  confidence    integer not null check (confidence between 0 and 100),
  summary       text not null,                    -- 1-2 sentence verdict explanation
  sources       jsonb not null default '[]'::jsonb, -- [{title, url, publisher, snippet}]
  raw_sonar     jsonb,                            -- raw Perplexity response for debugging
  latency_ms    integer,                          -- claim_created → verdict_ready
  created_at    timestamptz not null default now()
);
create index if not exists verdicts_session_idx
  on public.verdicts(session_id, created_at desc);

-- =========================================================================
-- usage_events: per-session cost tracking
-- =========================================================================
create table if not exists public.usage_events (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references public.sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,    -- deepgram_seconds | claude_tokens | perplexity_query
  units         numeric not null, -- seconds, input_tokens, queries, etc.
  cents         numeric,          -- estimated cost
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists usage_events_user_idx
  on public.usage_events(user_id, created_at desc);

-- =========================================================================
-- profile auto-create trigger
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
