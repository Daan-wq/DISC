-- Add testgroup flag to allowlist
alter table if exists public.allowlist
  add column if not exists testgroup boolean not null default false;

-- Feedback submissions for testgroup participants
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,

  q1_personal integer not null,
  q2_instructions integer not null,
  q3_pleasant integer not null,
  q4_recognizable integer not null,
  q5_need_more_explanation integer not null,
  q6_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (attempt_id)
);

create index if not exists idx_feedback_submissions_user_id on public.feedback_submissions(user_id);
create index if not exists idx_feedback_submissions_created_at on public.feedback_submissions(created_at);

alter table public.feedback_submissions enable row level security;

create policy "Users can view own feedback submissions"
  on public.feedback_submissions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own feedback submissions"
  on public.feedback_submissions
  for insert
  with check (auth.uid() = user_id);

create policy "Service role has full access to feedback submissions"
  on public.feedback_submissions
  for all
  using (auth.jwt()->>'role' = 'service_role');
