# RLS Matrix — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Branch**: `release-audit`  
> **Source**: `supabase/sql/02_policies.sql`, `07_m6_rls_index_review.sql`

---

## 1. RLS Status Overview

| Table | RLS Enabled | Evidence |
|-------|-------------|----------|
| `quizzes` | ✅ Yes | `02_policies.sql:71` |
| `allowlist` | ✅ Yes | `02_policies.sql:70` |
| `quiz_attempts` | ✅ Yes | `02_policies.sql:72` |
| `candidates` | ✅ Yes | `02_policies.sql:74` |
| `answers` | ⚠️ Unknown | Not in migrations |
| `admin_users` | ⚠️ Unknown | Not in migrations |
| `admin_events` | ⚠️ Unknown | Not in migrations |
| `admin_settings` | ⚠️ Unknown | Not in migrations |
| `notifications` | ⚠️ Unknown | Not in migrations |
| `quiz_activity` | ⚠️ Unknown | Not in migrations |

---

## 2. Policy Matrix by Table

### 2.1 `quizzes`

| Operation | Role | Policy Name | Condition | Evidence |
|-----------|------|-------------|-----------|----------|
| **SELECT** | authenticated | `quizzes_read_all` | `USING (true)` | `02_policies.sql:88-90` |
| **INSERT** | — | None | ❌ Denied | Default deny |
| **UPDATE** | — | None | ❌ Denied | Default deny |
| **DELETE** | — | None | ❌ Denied | Default deny |
| **SELECT** | anon | — | ❌ Denied | Default deny |
| **ALL** | service_role | — | ✅ Bypasses RLS | Supabase default |

**Risk**: LOW — Read-only access for authenticated users is appropriate for quiz catalog.

---

### 2.2 `allowlist`

| Operation | Role | Policy Name | Condition | Evidence |
|-----------|------|-------------|-----------|----------|
| **SELECT** | authenticated | None | ❌ Denied | `02_policies.sql:83-84` |
| **INSERT** | authenticated | None | ❌ Denied | Default deny |
| **UPDATE** | authenticated | None | ❌ Denied | Default deny |
| **DELETE** | authenticated | None | ❌ Denied | Default deny |
| **ALL** | anon | — | ❌ Denied | Default deny |
| **ALL** | service_role | — | ✅ Bypasses RLS | Supabase default |

**Risk**: NONE — Allowlist is admin-only via service role. Users cannot read/modify.

**Note**: The `has_active_allowlist_entry()` function is SECURITY DEFINER and grants indirect read access for eligibility checks.

---

### 2.3 `quiz_attempts`

| Operation | Role | Policy Name | Condition | Evidence |
|-----------|------|-------------|-----------|----------|
| **SELECT** | authenticated | `quiz_attempts_select_own` | `auth.uid() = user_id` | `02_policies.sql:94-96` |
| **INSERT** | authenticated | `quiz_attempts_insert_guard` | `auth.uid() IS NOT NULL AND has_active_allowlist_entry(email, quiz_id)` | `02_policies.sql:106-111` |
| **UPDATE** | authenticated | `quiz_attempts_update_own_limited` | `auth.uid() = user_id AND pdf_path IS NULL AND pdf_created_at IS NULL` | `07_m6_rls_index_review.sql:36-43` |
| **DELETE** | authenticated | None | ❌ Denied | Default deny |
| **ALL** | anon | — | ❌ Denied | Default deny |
| **ALL** | service_role | — | ✅ Bypasses RLS | Supabase default |

**Risks & Analysis**:

| Risk | Severity | Description | Evidence |
|------|----------|-------------|----------|
| ✅ SELECT properly scoped | — | Users can only read their own attempts | `auth.uid() = user_id` |
| ✅ INSERT requires allowlist | — | Users must be on allowlist to create attempt | `has_active_allowlist_entry()` check |
| ✅ UPDATE prevents PDF tampering | — | Users cannot modify after PDF exists | `pdf_path IS NULL` check |
| ⚠️ No DELETE policy | LOW | Users cannot delete their attempts (intended) | Default deny |

---

### 2.4 `candidates`

| Operation | Role | Policy Name | Condition | Evidence |
|-----------|------|-------------|-----------|----------|
| **SELECT** | authenticated | `candidates_select_own` | `auth.uid() = user_id` | `02_policies.sql:124-126` |
| **INSERT** | authenticated | `candidates_insert_own` | `auth.uid() = user_id` | `02_policies.sql:129-131` |
| **UPDATE** | authenticated | `candidates_update_own` | `auth.uid() = user_id` (USING + WITH CHECK) | `02_policies.sql:134-137` |
| **DELETE** | authenticated | None | ❌ Denied | Default deny |
| **ALL** | anon | — | ❌ Denied | Default deny |
| **ALL** | service_role | — | ✅ Bypasses RLS | Supabase default |

**Risk**: LOW — Standard ownership pattern. Users can only access their own candidate records.

---

### 2.5 `answers`

| Operation | Role | Policy Name | Condition | Evidence |
|-----------|------|-------------|-----------|----------|
| **SELECT** | authenticated | `answers_crud_by_owner` | `candidate_id IN (SELECT c.id FROM candidates c WHERE c.user_id = auth.uid())` | Dashboard (2024-12-17) |
| **INSERT** | authenticated | `answers_crud_by_owner` | Same as above | Dashboard (2024-12-17) |
| **UPDATE** | authenticated | `answers_crud_by_owner` | Same as above | Dashboard (2024-12-17) |
| **DELETE** | authenticated | `answers_crud_by_owner` | Same as above | Dashboard (2024-12-17) |
| **ALL** | anon | — | Denied | Default deny |
| **ALL** | service_role | — | ✅ Bypasses RLS | Supabase default |

**Status**: ✅ FIXED (2024-12-17)
- **Previous**: Policy used email matching (`lower(c.email) = lower(auth.email())`)
- **Current**: Policy uses user_id matching (`c.user_id = auth.uid()`)
- **Why changed**: Consistent with other tables, more robust (email can change, user_id cannot)
- **Note**: API routes use `supabaseAdmin` (service role), so this policy is defense-in-depth

---

### 2.6 `admin_users` (⚠️ NOT IN MIGRATIONS)

| Operation | Role | Policy | Risk | Evidence |
|-----------|------|--------|------|----------|
| **ALL** | authenticated | ⚠️ UNKNOWN | **BLOCKER** | No migration file |
| **ALL** | service_role | ✅ Bypasses | — | Supabase default |

**Gap Analysis**:
- **What**: Admin credentials table has no documented RLS
- **Risk**: If RLS disabled, any authenticated user could read admin password hashes and TOTP secrets
- **Evidence**: Used in `app/api/admin/login/route.ts` via service role
- **Recommendation**: **MUST** verify RLS is enabled with NO authenticated user policies

---

### 2.7 `admin_events` (⚠️ NOT IN MIGRATIONS)

| Operation | Role | Policy | Risk | Evidence |
|-----------|------|--------|------|----------|
| **ALL** | authenticated | ⚠️ UNKNOWN | **MED** | No migration file |
| **ALL** | service_role | ✅ Bypasses | — | Supabase default |

**Gap Analysis**:
- **What**: Audit log table has no documented RLS
- **Risk**: If readable, exposes admin activity and IP addresses
- **Recommendation**: Verify RLS enabled, no authenticated user access

---

### 2.8 `admin_settings` (⚠️ NOT IN MIGRATIONS)

| Operation | Role | Policy | Risk | Evidence |
|-----------|------|--------|------|----------|
| **ALL** | authenticated | ⚠️ UNKNOWN | **MED** | No migration file |
| **ALL** | service_role | ✅ Bypasses | — | Supabase default |

**Gap Analysis**:
- **What**: Settings table has no documented RLS
- **Risk**: If writable, users could toggle maintenance mode
- **Recommendation**: Verify RLS enabled, no authenticated user access

---

### 2.9 `notifications` (⚠️ NOT IN MIGRATIONS)

| Operation | Role | Policy | Risk | Evidence |
|-----------|------|--------|------|----------|
| **ALL** | authenticated | ⚠️ UNKNOWN | **LOW** | No migration file |
| **ALL** | service_role | ✅ Bypasses | — | Supabase default |

**Recommendation**: Verify RLS enabled

---

### 2.10 `quiz_activity` (⚠️ NOT IN MIGRATIONS)

| Operation | Role | Policy | Risk | Evidence |
|-----------|------|--------|------|----------|
| **ALL** | authenticated | ⚠️ UNKNOWN | **MED** | No migration file |
| **ALL** | service_role | ✅ Bypasses | — | Supabase default |

**Gap Analysis**:
- **What**: Heartbeat tracking table has no documented RLS
- **Risk**: If readable, exposes who is currently taking quiz (privacy)
- **Recommendation**: Verify RLS enabled, consider ownership policy

---

## 3. Critical Gaps Summary

| Table | Gap | Severity | Fix Required |
|-------|-----|----------|--------------|
| `admin_users` | No RLS in migrations | **BLOCKER** | Verify RLS enabled in Supabase Dashboard |
| `answers` | ✅ FIXED | — | Policy `answers_crud_by_owner` added (2024-12-17) |
| `admin_events` | No RLS in migrations | **MED** | Verify RLS enabled, deny authenticated |
| `admin_settings` | No RLS in migrations | **MED** | Verify RLS enabled, deny authenticated |
| `quiz_activity` | No RLS in migrations | **MED** | Verify RLS enabled |
| `notifications` | No RLS in migrations | **LOW** | Verify RLS enabled |

---

## 4. Policy Condition Analysis

### 4.1 Client-Controlled Field Dependencies

| Policy | Field | Source | Risk | Evidence |
|--------|-------|--------|------|----------|
| `quiz_attempts_insert_guard` | `(auth.jwt() ->> 'email')` | JWT claim | ✅ Safe — server-controlled | `02_policies.sql:110` |
| `quiz_attempts_insert_guard` | `quiz_attempts.quiz_id` | Request body | ⚠️ User-controlled | `02_policies.sql:110` |

**Analysis**: The `quiz_id` is user-controlled but validated against allowlist. This is acceptable since the allowlist check ensures the user is authorized for that specific quiz.

### 4.2 SECURITY DEFINER Functions

| Function | Risk | Mitigation | Evidence |
|----------|------|------------|----------|
| `has_active_allowlist_entry()` | Indirect allowlist read | Limited to boolean result | `01_schema.sql:144-162` |
| `claim_allowlist_on_attempt()` | Writes to allowlist | Only changes status | `01_schema.sql:124-135` |
| `mark_allowlist_used_on_finish()` | Writes to allowlist | Only changes status | `02_policies.sql:142-170` |
| `set_quiz_attempts_user_id()` | Sets user_id | Uses `auth.uid()` | `01_schema.sql:90-98` |
| `set_default_quiz_id()` | Sets quiz_id | Reads from quizzes | `01_schema.sql:107-115` |

All functions have `set search_path = public` to prevent search_path injection. ✅

---

## 5. Recommended Actions

### BLOCKER (Must verify before production)

1. **Verify `admin_users` RLS**
   - Check in Supabase Dashboard: Table Editor → admin_users → RLS
   - Expected: RLS enabled, NO policies for authenticated role
   - Risk if not: Password hashes and TOTP secrets exposed

### ~~HIGH Priority~~ ✅ COMPLETED

2. **~~Add `answers` RLS migration~~** — DONE (2024-12-17)
   - Policy `answers_crud_by_owner` created via Supabase Dashboard
   - Uses `user_id` matching (not email) for consistency

### MED Priority

3. **Document all admin tables** in migrations for reproducible deployments
4. **Verify `admin_events`, `admin_settings`, `quiz_activity`** have RLS enabled

---

## 6. Storage RLS

### `quiz-docs` Bucket

| Access | Policy | Evidence |
|--------|--------|----------|
| Public | ❌ Private bucket | `03_storage.sql:3` |
| Authenticated | ❌ No policies | Default deny |
| Service Role | ✅ Full access | Supabase default |
| Signed URLs | ✅ Used for downloads | `app/api/documents/signed-url/route.ts:50` |

**Status**: ✅ Secure — PDFs only accessible via signed URLs generated by service role.
