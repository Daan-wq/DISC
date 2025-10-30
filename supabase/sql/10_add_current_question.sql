-- Migration: Add current_question column to track quiz progress
-- Purpose: Allow quiz to resume from where user left off after page refresh
-- Reversible: Yes - can drop column

alter table public.quiz_attempts
  add column if not exists current_question integer default 1 check (current_question >= 1 and current_question <= 86);

-- Index for faster lookups
create index if not exists qa_current_question_idx
  on public.quiz_attempts (current_question);

-- Add comment for documentation
comment on column public.quiz_attempts.current_question is 'Current question number (1-86) for quiz progress tracking. Allows resuming from where user left off.';
