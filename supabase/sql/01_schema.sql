-- Enable required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- profiles table removed in lean schema

-- quizzes: catalog of quizzes
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean not null default true
);

-- allowlist: pre-authorized identities who may take a quiz
-- Normalize email via generated column for unique constraint
create table if not exists public.allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  full_name text,
  quiz_id uuid references public.quizzes(id),
  status text not null default 'pending' check (status in ('pending','claimed','used','revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email_normalized, quiz_id)
);

-- Ensure a single global (quiz_id IS NULL) entry per email
create unique index if not exists unique_allowlist_email_global
  on public.allowlist(email_normalized)
  where quiz_id is null;

-- quiz_attempts: one attempt per (user, quiz)
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric,
  result_payload jsonb,
  pdf_path text,
  pdf_filename text,
  pdf_created_at timestamptz,
  pdf_expires_at timestamptz,
  alert boolean default false,
  unique (user_id, quiz_id)
);

create index if not exists idx_quiz_attempts_user_quiz on public.quiz_attempts(user_id, quiz_id);
create index if not exists idx_quiz_attempts_finished_at on public.quiz_attempts(finished_at);
create index if not exists idx_quiz_attempts_pdf_expires_at on public.quiz_attempts(pdf_expires_at);
create index if not exists idx_quiz_attempts_alert on public.quiz_attempts(alert);

-- documents: generated PDFs registry
-- documents table removed in lean schema (consolidated into quiz_attempts)

-- candidates: store captured identity details for quiz participants
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Ensure columns exist if table was created earlier
alter table if exists public.candidates
  add column if not exists quiz_id uuid references public.quizzes(id) on delete cascade;

create index if not exists idx_candidates_user on public.candidates(user_id);
create index if not exists idx_candidates_user_quiz on public.candidates(user_id, quiz_id);

-- Drop old unique if present, then add the desired (user_id, quiz_id)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'candidates_user_unique'
  ) then
    alter table public.candidates drop constraint candidates_user_unique;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'candidates_user_quiz_unique'
  ) then
    alter table public.candidates add constraint candidates_user_quiz_unique unique (user_id, quiz_id);
  end if;
end$$;

-- Helper: set user_id on quiz_attempts inserts from auth context when omitted
create or replace function public.set_quiz_attempts_user_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_quiz_attempts_user_id on public.quiz_attempts;
create trigger trg_set_quiz_attempts_user_id
before insert on public.quiz_attempts
for each row
execute function public.set_quiz_attempts_user_id();

-- If quiz_id is omitted, set it to the first active quiz (single-quiz mode)
create or replace function public.set_default_quiz_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.quiz_id is null then
    select id into new.quiz_id from public.quizzes where is_active is true limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_default_quiz_id on public.quiz_attempts;
create trigger trg_set_default_quiz_id
before insert on public.quiz_attempts
for each row
execute function public.set_default_quiz_id();

-- Optional: mark allowlist as claimed once an attempt is created
create or replace function public.claim_allowlist_on_attempt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.allowlist a
    set status = 'claimed'
  where (a.quiz_id = new.quiz_id or a.quiz_id is null)
    and a.email_normalized = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    and a.status in ('pending','claimed')
    and (a.expires_at is null or a.expires_at > now());
  return new;
end;
$$;

drop trigger if exists trg_claim_allowlist_on_attempt on public.quiz_attempts;
create trigger trg_claim_allowlist_on_attempt
after insert on public.quiz_attempts
for each row
execute function public.claim_allowlist_on_attempt();

-- RPC: has_active_allowlist_entry(email, quiz)
create or replace function public.has_active_allowlist_entry(p_email text, p_quiz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowlist a
    where (
      a.quiz_id = p_quiz_id
      or a.quiz_id is null
      or p_quiz_id is null
    )
      and a.email_normalized = lower(btrim(p_email))
      and a.status in ('pending','claimed')
      and (a.expires_at is null or a.expires_at > now())
  );
$$;

grant execute on function public.has_active_allowlist_entry(text, uuid) to anon, authenticated;
