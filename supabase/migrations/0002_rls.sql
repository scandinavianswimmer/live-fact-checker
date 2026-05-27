-- Row-level security: every table is owner-scoped.
-- Service role bypasses RLS and is used by API routes.

alter table public.profiles            enable row level security;
alter table public.sessions            enable row level security;
alter table public.transcript_chunks   enable row level security;
alter table public.claims              enable row level security;
alter table public.verdicts            enable row level security;
alter table public.usage_events        enable row level security;

-- profiles ---------------------------------------------------------------
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- sessions ---------------------------------------------------------------
create policy "sessions: rw own"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- helper: does the current user own this session?
create or replace function public.owns_session(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sid and s.user_id = auth.uid()
  );
$$;

-- transcript_chunks ------------------------------------------------------
create policy "transcript_chunks: read own"
  on public.transcript_chunks for select
  using (public.owns_session(session_id));

-- claims -----------------------------------------------------------------
create policy "claims: read own"
  on public.claims for select
  using (public.owns_session(session_id));

-- verdicts ---------------------------------------------------------------
create policy "verdicts: read own"
  on public.verdicts for select
  using (public.owns_session(session_id));

-- usage_events -----------------------------------------------------------
create policy "usage_events: read own"
  on public.usage_events for select
  using (auth.uid() = user_id);
