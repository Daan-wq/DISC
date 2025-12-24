# Schema Summary — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Branch**: `release-audit`  
> **Source**: `supabase/sql/*.sql` (11 migration files)

---

## 1. Tables Overview

### Core Tables (in migrations)

| Table | Purpose | Primary Key | Foreign Keys | Evidence |
|-------|---------|-------------|--------------|----------|
| `quizzes` | Quiz catalog | `id` (uuid) | — | `01_schema.sql:7-11` |
| `allowlist` | Pre-authorized users | `id` (uuid) | `quiz_id → quizzes` | `01_schema.sql:15-25` |
| `quiz_attempts` | User quiz sessions | `id` (uuid) | `quiz_id → quizzes`, `user_id → auth.users` | `01_schema.sql:33-47` |
| `candidates` | User identity data | `id` (uuid) | `user_id → auth.users`, `quiz_id → quizzes` | `01_schema.sql:58-65` |

### Admin Tables (not in migrations - created via Supabase Dashboard)

| Table | Purpose | Used In | Evidence |
|-------|---------|---------|----------|
| `admin_users` | Admin accounts + 2FA | Admin login, 2FA routes | `app/api/admin/login/route.ts` |
| `admin_events` | Audit logging | All admin actions | `app/api/admin/login/route.ts:38` |
| `admin_settings` | App settings (maintenance) | Maintenance mode | `app/api/admin/settings/maintenance/route.ts` |
| `answers` | Quiz answers storage | Answer submission | `app/api/answers/route.ts` |
| `notifications` | System notifications | Quiz finish | `app/api/quiz/finish/route.ts` |
| `quiz_activity` | Live heartbeat tracking | Heartbeat API | `app/api/quiz/heartbeat/route.ts` |

### Storage Buckets

| Bucket | Access | Purpose | Evidence |
|--------|--------|---------|----------|
| `quiz-docs` | Private | PDF storage | `03_storage.sql:3` |

---

## 2. Table Schemas (Detailed)

### 2.1 `quizzes`
```sql
-- 01_schema.sql:7-11
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean not null default true
);
```

### 2.2 `allowlist`
```sql
-- 01_schema.sql:15-25
create table if not exists public.allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  full_name text,
  quiz_id uuid references public.quizzes(id),
  status text not null default 'pending' 
    check (status in ('pending','claimed','used','revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email_normalized, quiz_id)
);
```

**Additional columns** (from code inspection, not in migrations):
- `trainer_email` - Trainer email for PDF delivery
- `send_pdf_user` - Boolean flag
- `send_pdf_trainer` - Boolean flag
- `theme` - Enum ('tlc', 'imk')

### 2.3 `quiz_attempts`
```sql
-- 01_schema.sql:33-47 + migrations
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric,
  result_payload jsonb,
  pdf_path text,              -- 04_m2_add_pdf_columns.sql
  pdf_filename text,          -- 04_m2_add_pdf_columns.sql
  pdf_created_at timestamptz, -- 04_m2_add_pdf_columns.sql
  pdf_expires_at timestamptz, -- 04_m2_add_pdf_columns.sql
  alert boolean default false,-- 04_m2_add_pdf_columns.sql
  email_status text default 'pending' 
    check (email_status in ('pending', 'sent', 'failed')), -- 09_add_email_status.sql
  email_error text,           -- 09_add_email_status.sql
  current_question integer default 1 
    check (current_question >= 1 and current_question <= 86), -- 10_add_current_question.sql
  unique (user_id, quiz_id)
);
```

### 2.4 `candidates`
```sql
-- 01_schema.sql:58-65
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  constraint candidates_user_quiz_unique unique (user_id, quiz_id)
);
```

### 2.5 `answers` (inferred from code)
```sql
-- Not in migrations, inferred from app/api/answers/route.ts
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id),
  quiz_session_id uuid,
  attempt_id uuid references public.quiz_attempts(id) on delete cascade, -- 11_add_attempt_id_to_answers.sql
  raw_answers jsonb,
  answers_export_txt text,
  payload jsonb,
  created_at timestamptz default now()
);
```

---

## 3. Constraints

### Unique Constraints

| Table | Constraint | Columns | Evidence |
|-------|-----------|---------|----------|
| `allowlist` | `(email_normalized, quiz_id)` | Prevents duplicate entries | `01_schema.sql:24` |
| `allowlist` | `unique_allowlist_email_global` | Single global entry per email | `01_schema.sql:28-30` |
| `quiz_attempts` | `quiz_attempts_user_quiz_unique` | One attempt per (user, quiz) | `02_policies.sql:55-64` |
| `candidates` | `candidates_user_quiz_unique` | One candidate per (user, quiz) | `01_schema.sql:83-86` |

### Check Constraints

| Table | Column | Values | Evidence |
|-------|--------|--------|----------|
| `allowlist` | `status` | `pending`, `claimed`, `used`, `revoked` | `01_schema.sql:21` |
| `quiz_attempts` | `email_status` | `pending`, `sent`, `failed` | `09_add_email_status.sql:5` |
| `quiz_attempts` | `current_question` | `1-86` | `10_add_current_question.sql:6` |

---

## 4. Triggers

| Trigger | Table | Event | Function | Purpose | Evidence |
|---------|-------|-------|----------|---------|----------|
| `trg_set_quiz_attempts_user_id` | `quiz_attempts` | BEFORE INSERT | `set_quiz_attempts_user_id()` | Set user_id from auth context | `01_schema.sql:100-104` |
| `trg_set_default_quiz_id` | `quiz_attempts` | BEFORE INSERT | `set_default_quiz_id()` | Set default quiz_id | `01_schema.sql:117-121` |
| `trg_claim_allowlist_on_attempt` | `quiz_attempts` | AFTER INSERT | `claim_allowlist_on_attempt()` | Mark allowlist as 'claimed' | `01_schema.sql:137-141` |
| `trg_mark_allowlist_used_on_finish` | `quiz_attempts` | AFTER UPDATE | `mark_allowlist_used_on_finish()` | Mark allowlist as 'used' | `02_policies.sql:172-177` |

---

## 5. Functions

| Function | Security | Purpose | Evidence |
|----------|----------|---------|----------|
| `set_quiz_attempts_user_id()` | SECURITY DEFINER | Auto-set user_id on insert | `01_schema.sql:90-98` |
| `set_default_quiz_id()` | SECURITY DEFINER | Auto-set quiz_id on insert | `01_schema.sql:107-115` |
| `claim_allowlist_on_attempt()` | SECURITY DEFINER | Update allowlist status | `01_schema.sql:124-135` |
| `mark_allowlist_used_on_finish()` | SECURITY DEFINER | Update allowlist status | `02_policies.sql:142-170` |
| `has_active_allowlist_entry(email, quiz_id)` | SECURITY DEFINER | Check allowlist eligibility | `01_schema.sql:144-162` |

**Note**: All SECURITY DEFINER functions have `set search_path = public` to prevent search_path injection attacks.

---

## 6. Gap Analysis

### ⚠️ Missing Migration Files

| Table | Issue | Risk | Recommendation |
|-------|-------|------|----------------|
| `answers` | Schema not in migrations | Schema drift, inconsistent deployments | Create migration file |
| `admin_users` | Schema not in migrations | Manual setup required per environment | Create migration file |
| `admin_events` | Schema not in migrations | Audit table schema unknown | Create migration file |
| `admin_settings` | Schema not in migrations | Settings schema unknown | Create migration file |
| `notifications` | Schema not in migrations | Notification schema unknown | Create migration file |
| `quiz_activity` | Schema not in migrations | Heartbeat table schema unknown | Create migration file |

### ⚠️ Allowlist Column Mismatch

| Column | In Migration | In Code | Issue |
|--------|--------------|---------|-------|
| `trainer_email` | ❌ | ✅ | Used in upsert but not in migration |
| `send_pdf_user` | ❌ | ✅ | Used in upsert but not in migration |
| `send_pdf_trainer` | ❌ | ✅ | Used in upsert but not in migration |
| `theme` | ❌ | ✅ | Used in upsert but not in migration |

---

## 7. Summary Statistics

- **Tables in migrations**: 4 (quizzes, allowlist, quiz_attempts, candidates)
- **Tables in code only**: 6 (answers, admin_users, admin_events, admin_settings, notifications, quiz_activity)
- **Triggers**: 4
- **Functions**: 5
- **Unique constraints**: 4
- **Check constraints**: 3
- **Storage buckets**: 1 (quiz-docs, private)
