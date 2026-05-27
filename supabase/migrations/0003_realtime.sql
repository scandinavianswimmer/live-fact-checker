-- Enable Supabase Realtime on the tables the browser subscribes to.
-- The CardFeed component listens for postgres_changes on these tables and
-- needs them added to the supabase_realtime publication.

alter publication supabase_realtime add table public.claims;
alter publication supabase_realtime add table public.verdicts;

-- Also broadcast transcript_chunks — useful for cross-device session viewing
-- (e.g. host monitor on laptop, producer screen on iPad).
alter publication supabase_realtime add table public.transcript_chunks;
