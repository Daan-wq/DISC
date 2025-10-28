-- Create answers table to store quiz answers and a text export
-- Run this SQL in Supabase (SQL editor) for your project

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  quiz_session_id uuid null,
  candidate_id uuid not null,
  raw_answers text[] not null,
  answers_export_txt text not null
);

-- Ensure we can upsert/update by session id when provided (allow many NULLs)
create unique index if not exists answers_quiz_session_id_key
  on public.answers(quiz_session_id)
  where quiz_session_id is not null;

-- Helpful index for lookup by candidate
create index if not exists answers_candidate_id_idx on public.answers(candidate_id);

-- Optional: enable RLS (service role bypasses RLS automatically)
-- alter table public.answers enable row level security;
-- create policy "service can do anything" on public.answers for all to public using (true) with check (true);
