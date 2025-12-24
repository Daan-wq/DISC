-- Migration: Add attempt_id column to answers table
-- Purpose: Link answers to quiz attempts for progress restoration
-- Allows loading user's answers when resuming a quiz after page refresh

alter table public.answers
  add column if not exists attempt_id uuid references public.quiz_attempts(id) on delete cascade;

-- Index for faster lookups by attempt
create index if not exists idx_answers_attempt_id
  on public.answers (attempt_id);

-- Add comment for documentation
comment on column public.answers.attempt_id is 'Reference to quiz_attempts for progress restoration. Allows loading answers when resuming a quiz.';
