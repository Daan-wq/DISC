-- =========================
-- 0) (Optioneel) Tabel-skeletons
--    Alleen aangemaakt als ze nog niet bestaan.
-- =========================
-- profiles removed in lean schema

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean default true
);

create table if not exists public.allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  quiz_id uuid references public.quizzes(id),
  status text not null check (status in ('pending','claimed','used','revoked')) default 'pending',
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  finished_at timestamptz,
  score numeric,
  result_payload jsonb
);

-- documents consolidated into quiz_attempts via pdf_path/pdf_created_at

-- =========================
-- 1) Helpers/indices
-- =========================
-- Genormaliseerde e-mail (lower + trim) voor veilige vergelijkingen
alter table if exists public.allowlist
  add column if not exists email_normalized text
  generated always as (lower(btrim(email))) stored;

-- Één row per e-mailadres in allowlist (aan te raden als quiz_id=NULL = toegang tot alle quizzes)
create unique index if not exists allowlist_email_unique_idx
  on public.allowlist (email_normalized);

-- Snelle lookups
create index if not exists ent_status_expires_idx
  on public.allowlist (status, expires_at);

create index if not exists qa_user_quiz_idx
  on public.quiz_attempts (user_id, quiz_id);

-- Unieke poging per (user, quiz) afdwingen
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'quiz_attempts_user_quiz_unique'
  ) then
    alter table public.quiz_attempts
      add constraint quiz_attempts_user_quiz_unique unique (user_id, quiz_id);
  end if;
end$$;

-- =========================
-- 2) RLS aanzetten
-- =========================
-- profiles table removed
alter table if exists public.allowlist       enable row level security;
alter table if exists public.quizzes         enable row level security;
alter table if exists public.quiz_attempts   enable row level security;
-- documents table removed (consolidated)
alter table if exists public.candidates      enable row level security;

-- =========================
-- 3) POLICIES
--    Altijd: DROP IF EXISTS → CREATE (geen IF NOT EXISTS gebruiken)
-- =========================

-- profiles policies removed in lean schema

-- ALLOWLIST: geen end-user toegang (alleen via service role / admin)
-- (dus: geen select/insert/update policies voor authenticated; default = deny)

-- QUIZZES: laten we lezen toestaan voor ingelogden (pas aan naar behoefte)
drop policy if exists quizzes_read_all on public.quizzes;
create policy quizzes_read_all on public.quizzes
  for select to authenticated
  using (true);

-- QUIZ_ATTEMPTS: alleen eigen rijen lezen
drop policy if exists quiz_attempts_select_own on public.quiz_attempts;
create policy quiz_attempts_select_own on public.quiz_attempts
  for select to authenticated
  using (auth.uid() = user_id);

-- QUIZ_ATTEMPTS: insert guard
-- voorwaarden:
--  - ingelogd
--  - e-mail staat in allowlist met status pending/claimed
--  - allowlist niet verlopen
--  - allowlist.quiz_id is NULL (toegang tot alle quizzes) OF equals de gekozen quiz
--  - nog GEEN eerdere attempt voor (user, quiz) — dit is extra afgedekt door UNIQUE constraint
drop policy if exists quiz_attempts_insert_guard on public.quiz_attempts;
create policy quiz_attempts_insert_guard on public.quiz_attempts
  for insert to authenticated
  with check (
    auth.uid() is not null
    and public.has_active_allowlist_entry((auth.jwt() ->> 'email'), quiz_attempts.quiz_id)
  );

-- QUIZ_ATTEMPTS: eigen poging mogen updaten (bijv. finished_at/resultaat)
drop policy if exists quiz_attempts_update_own on public.quiz_attempts;
create policy quiz_attempts_update_own on public.quiz_attempts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- documents policies removed (now using quiz_attempts.pdf_path)

-- CANDIDATES: eigen rijen lezen, invoegen en bijwerken
drop policy if exists candidates_select_own on public.candidates;
create policy candidates_select_own on public.candidates
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists candidates_insert_own on public.candidates;
create policy candidates_insert_own on public.candidates
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists candidates_update_own on public.candidates;
create policy candidates_update_own on public.candidates
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================
-- 4) Trigger: bij afronden attempt → allowlist.status = 'used'
-- =========================
create or replace function public.mark_allowlist_used_on_finish()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_email text;
begin
  -- Alleen reageren als finished_at net gezet/gewijzigd is
  if new.finished_at is not null
     and (old.finished_at is null or new.finished_at <> old.finished_at) then

    -- E-mail van de eigenaar van de attempt ophalen uit auth.users
    select lower(btrim(email)) into v_email
    from auth.users
    where id = new.user_id;

    if v_email is not null then
      update public.allowlist a
         set status = 'used'
       where a.email_normalized = v_email
         and (a.quiz_id is null or a.quiz_id = new.quiz_id);
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_mark_allowlist_used_on_finish on public.quiz_attempts;
create trigger trg_mark_allowlist_used_on_finish
after update on public.quiz_attempts
for each row
when (new.finished_at is not null)
execute function public.mark_allowlist_used_on_finish();
