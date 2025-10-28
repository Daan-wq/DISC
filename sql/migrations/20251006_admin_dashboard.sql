-- Admin Dashboard migrations (idempotent)
-- Enable gen_random_uuid if available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Allowlist additions
ALTER TABLE public.allowlist ADD COLUMN IF NOT EXISTS trainer_email text;
ALTER TABLE public.allowlist ADD COLUMN IF NOT EXISTS send_pdf_user boolean DEFAULT true NOT NULL;
ALTER TABLE public.allowlist ADD COLUMN IF NOT EXISTS send_pdf_trainer boolean DEFAULT false NOT NULL;
ALTER TABLE public.allowlist ADD COLUMN IF NOT EXISTS theme text DEFAULT 'default' NOT NULL;

-- Quiz attempts metadata
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS pdf_path text;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- Admin events (audit log)
CREATE TABLE IF NOT EXISTS public.admin_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  type text not null,
  actor text not null,
  payload jsonb
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  severity text not null check (severity in ('info','warning','error','success')),
  source text not null,
  message text not null,
  meta jsonb
);

-- Live quiz activity heartbeats
CREATE TABLE IF NOT EXISTS public.quiz_activity (
  user_id uuid not null,
  quiz_id uuid not null,
  heartbeat_at timestamptz not null,
  primary key (user_id, quiz_id)
);
