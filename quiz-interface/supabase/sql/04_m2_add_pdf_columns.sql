-- M2: Add PDF and metadata columns to quiz_attempts (idempotent)
alter table if exists public.quiz_attempts
  add column if not exists pdf_path text;

alter table if exists public.quiz_attempts
  add column if not exists pdf_filename text;

alter table if exists public.quiz_attempts
  add column if not exists pdf_created_at timestamptz;

alter table if exists public.quiz_attempts
  add column if not exists pdf_expires_at timestamptz;

alter table if exists public.quiz_attempts
  add column if not exists alert boolean default false;

-- Indexes for efficient queries
create index if not exists idx_quiz_attempts_pdf_created_at
  on public.quiz_attempts(pdf_created_at);

create index if not exists idx_quiz_attempts_pdf_expires_at
  on public.quiz_attempts(pdf_expires_at);

create index if not exists idx_quiz_attempts_alert
  on public.quiz_attempts(alert);
