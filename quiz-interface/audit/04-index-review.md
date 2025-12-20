# Index Review — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Branch**: `release-audit`  
> **Source**: `supabase/sql/*.sql`, API route analysis

---

## 1. Existing Indexes

### From Migration Files

| Table | Index Name | Columns | Type | Evidence |
|-------|-----------|---------|------|----------|
| `allowlist` | `unique_allowlist_email_global` | `email_normalized` (WHERE quiz_id IS NULL) | Unique partial | `01_schema.sql:28-30` |
| `allowlist` | `allowlist_email_unique_idx` | `email_normalized` | Unique | `02_policies.sql:44-45` |
| `allowlist` | `ent_status_expires_idx` | `status, expires_at` | B-tree | `02_policies.sql:48-49` |
| `quiz_attempts` | `idx_quiz_attempts_user_quiz` | `user_id, quiz_id` | B-tree | `01_schema.sql:49` |
| `quiz_attempts` | `idx_quiz_attempts_finished_at` | `finished_at` | B-tree | `01_schema.sql:50` |
| `quiz_attempts` | `idx_quiz_attempts_pdf_expires_at` | `pdf_expires_at` | B-tree | `01_schema.sql:51` |
| `quiz_attempts` | `idx_quiz_attempts_alert` | `alert` | B-tree | `01_schema.sql:52` |
| `quiz_attempts` | `idx_quiz_attempts_pdf_created_at` | `pdf_created_at` | B-tree | `04_m2_add_pdf_columns.sql:18-19` |
| `quiz_attempts` | `idx_quiz_attempts_email_status` | `email_status` | B-tree | `09_add_email_status.sql:8` |
| `quiz_attempts` | `qa_current_question_idx` | `current_question` | B-tree | `10_add_current_question.sql:9-10` |
| `quiz_attempts` | `qa_user_quiz_idx` | `user_id, quiz_id` | B-tree | `02_policies.sql:51-52` |
| `candidates` | `idx_candidates_user` | `user_id` | B-tree | `01_schema.sql:71` |
| `candidates` | `idx_candidates_user_quiz` | `user_id, quiz_id` | B-tree | `01_schema.sql:72` |
| `answers` | `idx_answers_attempt_id` | `attempt_id` | B-tree | `11_add_attempt_id_to_answers.sql:9-10` |

### Unique Constraints (implicit indexes)

| Table | Constraint | Columns | Evidence |
|-------|-----------|---------|----------|
| `allowlist` | Primary key | `id` | `01_schema.sql:16` |
| `allowlist` | Unique | `email_normalized, quiz_id` | `01_schema.sql:24` |
| `quiz_attempts` | Primary key | `id` | `01_schema.sql:34` |
| `quiz_attempts` | `quiz_attempts_user_quiz_unique` | `user_id, quiz_id` | `02_policies.sql:61-62` |
| `candidates` | Primary key | `id` | `01_schema.sql:59` |
| `candidates` | `candidates_user_quiz_unique` | `user_id, quiz_id` | `01_schema.sql:85` |
| `quizzes` | Primary key | `id` | `01_schema.sql:8` |

---

## 2. Query Analysis by Flow

### 2.1 Quiz Flow Queries

| Query | Table | Filter | Used Index | Performance | Evidence |
|-------|-------|--------|------------|-------------|----------|
| Check allowlist eligibility | `allowlist` | `email_normalized = ?, status IN (pending,claimed), expires_at` | `ent_status_expires_idx` | ✅ Good | `01_schema.sql:151-160` |
| Get/create attempt | `quiz_attempts` | `user_id = ?, quiz_id = ?` | `idx_quiz_attempts_user_quiz` | ✅ Good | `app/api/quiz/attempt/create/route.ts:36-44` |
| Update attempt progress | `quiz_attempts` | `id = ?` | Primary key | ✅ Good | `app/api/quiz/attempt/update/route.ts` |
| Save answers | `answers` | `attempt_id = ?` | `idx_answers_attempt_id` | ✅ Good | `app/api/quiz/answers/save/route.ts:42-46` |
| Get candidate | `candidates` | `user_id = ?, quiz_id = ?` | `idx_candidates_user_quiz` | ✅ Good | `app/api/candidates/create/route.ts:49-54` |
| Heartbeat upsert | `quiz_activity` | `user_id = ?, quiz_id = ?` | ⚠️ Unknown | Needs check | `app/api/quiz/heartbeat/route.ts:40-44` |

### 2.2 Admin Dashboard Queries

| Query | Table | Filter | Used Index | Performance | Evidence |
|-------|-------|--------|------------|-------------|----------|
| List all candidates | `candidates` | ORDER BY `created_at DESC` | ⚠️ None | **Needs index** | `app/api/admin/candidates/list/route.ts:16-19` |
| List all attempts | `quiz_attempts` | ORDER BY `started_at DESC` | ⚠️ None | **Needs index** | `app/api/admin/results/list/route.ts:17-33` |
| Get candidates by user_ids | `candidates` | `user_id IN (...)` | `idx_candidates_user` | ✅ Good | `app/api/admin/results/list/route.ts:44-47` |
| Get answers by candidate_ids | `answers` | `candidate_id IN (...)` | ⚠️ None | **Needs index** | `app/api/admin/results/list/route.ts:67-70` |
| Search allowlist | `allowlist` | `email ILIKE ?` OR `full_name ILIKE ?` | ⚠️ None | **Needs index** | `app/api/admin/allowlist/search/route.ts` |
| List admin events | `admin_events` | ORDER BY `created_at DESC` | ⚠️ Unknown | Needs check | `app/api/admin/events/list/route.ts` |
| Get live activity | `quiz_activity` | `heartbeat_at > ?` | ⚠️ Unknown | Needs check | `app/api/admin/activity/live/route.ts` |
| Find expired PDFs | `quiz_attempts` | `pdf_expires_at < now()` | `idx_quiz_attempts_pdf_expires_at` | ✅ Good | Cleanup job |

---

## 3. Missing Indexes

### HIGH Priority (Admin Performance)

| Table | Recommended Index | Reason | Query Evidence |
|-------|------------------|--------|----------------|
| `candidates` | `idx_candidates_created_at` | Admin list sorted by created_at | `app/api/admin/candidates/list/route.ts:19` |
| `quiz_attempts` | `idx_quiz_attempts_started_at` | Admin list sorted by started_at | `app/api/admin/results/list/route.ts:33` |
| `answers` | `idx_answers_candidate_id` | Join in admin results query | `app/api/admin/results/list/route.ts:70` |

**Recommended SQL:**
```sql
-- Admin dashboard performance indexes
CREATE INDEX IF NOT EXISTS idx_candidates_created_at 
  ON public.candidates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_started_at 
  ON public.quiz_attempts(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_answers_candidate_id 
  ON public.answers(candidate_id);
```

### MED Priority (Search Performance)

| Table | Recommended Index | Reason | Query Evidence |
|-------|------------------|--------|----------------|
| `allowlist` | `idx_allowlist_email_trigram` | ILIKE search on email | `app/api/admin/allowlist/search/route.ts` |
| `allowlist` | `idx_allowlist_full_name_trigram` | ILIKE search on name | `app/api/admin/allowlist/search/route.ts` |

**Recommended SQL (requires pg_trgm extension):**
```sql
-- Enable trigram extension for ILIKE performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for search
CREATE INDEX IF NOT EXISTS idx_allowlist_email_trigram 
  ON public.allowlist USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_allowlist_full_name_trigram 
  ON public.allowlist USING gin (full_name gin_trgm_ops);
```

### LOW Priority (Unknown Tables)

| Table | Recommended Index | Reason |
|-------|------------------|--------|
| `quiz_activity` | `(user_id, quiz_id)` | Upsert performance |
| `quiz_activity` | `(heartbeat_at)` | Live activity filter |
| `admin_events` | `(created_at DESC)` | Event list sorting |
| `admin_events` | `(type)` | Filter by event type |

---

## 4. Duplicate Index Analysis

| Table | Index 1 | Index 2 | Issue | Recommendation |
|-------|---------|---------|-------|----------------|
| `quiz_attempts` | `idx_quiz_attempts_user_quiz` | `qa_user_quiz_idx` | **Duplicate** | Remove one | 
| `allowlist` | `allowlist_email_unique_idx` | `unique_allowlist_email_global` | Overlapping | Keep both (different WHERE) |

**Evidence**: 
- `idx_quiz_attempts_user_quiz` created in `01_schema.sql:49`
- `qa_user_quiz_idx` created in `02_policies.sql:51-52`

**Fix:**
```sql
-- Remove duplicate index
DROP INDEX IF EXISTS qa_user_quiz_idx;
```

---

## 5. Index Usage Estimates

### Current Workload (100 users/day)

| Query Type | Frequency | Current Performance | With Missing Indexes |
|------------|-----------|--------------------|--------------------|
| Allowlist check | ~100/day | ✅ Fast (<10ms) | — |
| Attempt create/get | ~100/day | ✅ Fast (<10ms) | — |
| Answer save | ~1000/day | ✅ Fast (<10ms) | — |
| Admin results list | ~50/day | ⚠️ Moderate (50-200ms) | ✅ Fast (<20ms) |
| Admin candidates list | ~20/day | ⚠️ Moderate (50-200ms) | ✅ Fast (<20ms) |
| Allowlist search | ~30/day | ⚠️ Slow with ILIKE (100-500ms) | ✅ Fast (<50ms) |

### Scaling Considerations

| Users/Day | Current Status | Recommended Actions |
|-----------|----------------|---------------------|
| 100 | ✅ Fine | Add missing indexes for admin queries |
| 1,000 | ⚠️ Monitor | Required: all missing indexes |
| 10,000+ | 🔴 Bottleneck | Required: connection pooling, read replicas |

---

## 6. Constraint Review

### Existing Unique Constraints

| Table | Constraint | Columns | Purpose | Status |
|-------|-----------|---------|---------|--------|
| `allowlist` | Unique | `email_normalized, quiz_id` | Prevent duplicate entries | ✅ Good |
| `quiz_attempts` | `quiz_attempts_user_quiz_unique` | `user_id, quiz_id` | One attempt per user/quiz | ✅ Good |
| `candidates` | `candidates_user_quiz_unique` | `user_id, quiz_id` | One candidate per user/quiz | ✅ Good |

### Missing Constraints

| Table | Recommended Constraint | Reason |
|-------|----------------------|--------|
| `answers` | Unique on `attempt_id` | Prevent duplicate answer records per attempt |

**Recommended SQL:**
```sql
-- Ensure one answer record per attempt
ALTER TABLE public.answers 
  ADD CONSTRAINT answers_attempt_unique UNIQUE (attempt_id);
```

---

## 7. Summary & Recommendations

### Immediate Actions (Before Launch)

| Priority | Action | Impact |
|----------|--------|--------|
| **HIGH** | Add `idx_candidates_created_at` | Admin candidates list performance |
| **HIGH** | Add `idx_quiz_attempts_started_at` | Admin results list performance |
| **HIGH** | Add `idx_answers_candidate_id` | Admin results query join performance |
| **MED** | Remove duplicate `qa_user_quiz_idx` | Reduce index maintenance overhead |

### Post-Launch Actions

| Priority | Action | Impact |
|----------|--------|--------|
| **MED** | Add trigram indexes for search | ILIKE performance on allowlist |
| **LOW** | Add indexes to admin tables | Event/activity list performance |
| **LOW** | Add `answers_attempt_unique` constraint | Data integrity |

### Combined Migration Script

```sql
-- performance_indexes.sql
-- Run this migration before production launch

-- Admin dashboard performance
CREATE INDEX IF NOT EXISTS idx_candidates_created_at 
  ON public.candidates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_started_at 
  ON public.quiz_attempts(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_answers_candidate_id 
  ON public.answers(candidate_id);

-- Remove duplicate index
DROP INDEX IF EXISTS qa_user_quiz_idx;

-- Optional: Trigram search (requires extension)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_allowlist_email_trigram 
--   ON public.allowlist USING gin (email gin_trgm_ops);
```

---

## 8. Evidence Summary

| File | Indexes Defined |
|------|-----------------|
| `01_schema.sql` | 7 indexes |
| `02_policies.sql` | 3 indexes (1 duplicate) |
| `04_m2_add_pdf_columns.sql` | 3 indexes |
| `09_add_email_status.sql` | 1 index |
| `10_add_current_question.sql` | 1 index |
| `11_add_attempt_id_to_answers.sql` | 1 index |
| **Total** | 16 indexes (1 duplicate) |
