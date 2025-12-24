# API Route-by-Route Audit — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Total Routes**: 38  
> **Priority Focus**: /api/quiz/finish, /api/compute, /api/admin/*, allowlist, pdf-download

---

## 1. Priority Routes

### 1.1 `/api/quiz/finish` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Bearer token required | `route.ts:45-54` |
| **Authz** | ✅ | User must own attempt (`user_id` + `quiz_id` match) | `route.ts:95-97` |
| **Validation** | ✅ | Zod schema: `attempt_id` (UUID), `placeholderData` (nested) | `route.ts:14-34` |
| **DB ops** | Service role | `quiz_attempts`, `allowlist`, `notifications`, Storage | `route.ts:83-192` |
| **Error handling** | ✅ | No validation details in prod | `route.ts:71-76` |
| **Idempotency** | ✅ | `finished_at` only set if null | `route.ts:100-105` |
| **Rate limiting** | ❌ | None (heavy operation) | — |

**Findings**:
- **M1**: No rate limiting on PDF generation (resource intensive)
- **I1**: Error details exposed in `details` field on 500 errors

---

### 1.2 `/api/compute` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Bearer token required | `route.ts:20-31` |
| **Authz** | ✅ | Candidate must belong to user | `route.ts:77-80` |
| **Validation** | ✅ | Zod: `candidateId` (UUID), `answers` (48 items) | `route.ts:6-12` |
| **DB ops** | Service role | `candidates` (read only) | `route.ts:41-45` |
| **Error handling** | ⚠️ | Zod errors expose `details` | `route.ts:113-116` |
| **Idempotency** | ✅ | Pure computation, no side effects | — |
| **Rate limiting** | ❌ | None | — |

**Findings**:
- **L1**: Zod validation errors expose field details (low risk - expected behavior)

---

### 1.3 `/api/admin/pdf-download` (GET)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Admin session required | `route.ts:16-18` |
| **Authz** | ✅ | Admin-only | `getAdminSession()` |
| **Validation** | ✅ | Zod: `attempt_id` (UUID) | `route.ts:6-8, 28-30` |
| **DB ops** | Service role | `quiz_attempts` (read), Storage (signed URL) | `route.ts:34-56` |
| **Error handling** | ✅ | Generic errors | `route.ts:40-60` |
| **Idempotency** | ✅ | Read-only | — |
| **Rate limiting** | ❌ | None (admin only) | — |

**Status**: ✅ Secure

---

### 1.4 `/api/admin/allowlist/upsert` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Admin session | `route.ts:19-20` |
| **Authz** | ✅ | Admin-only | `getAdminSession()` |
| **Validation** | ✅ | Zod: email, full_name, quiz_id, trainer_email, theme, toggles | `route.ts:7-15` |
| **DB ops** | Service role | `allowlist` (upsert), `admin_events` (audit) | `route.ts:30-46` |
| **Error handling** | ✅ | Generic "DB error" | `route.ts:44` |
| **Idempotency** | ✅ | Upsert on `email_normalized,quiz_id` | `route.ts:40` |
| **Rate limiting** | ❌ | None (admin only) | — |
| **Audit logging** | ✅ | `allowlist_upsert` event | `route.ts:46` |

**Status**: ✅ Secure

---

### 1.5 `/api/admin/allowlist/bulk-import` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Admin session | `route.ts:23` |
| **Authz** | ✅ | Admin-only | `getAdminSession()` |
| **Validation** | ✅ | Zod: array of rows with same schema as upsert | `route.ts:7-19` |
| **DB ops** | Service role | `allowlist` (batch upsert) | `route.ts:51-54` |
| **Error handling** | ⚠️ | Exposes `details` in error | `route.ts:58, 92` |
| **Idempotency** | ✅ | Upsert on `email_normalized` | `route.ts:53` |
| **Rate limiting** | ❌ | None | — |
| **Audit logging** | ✅ | `allowlist_bulk_import` event | `route.ts:61` |

**Findings**:
- **L2**: Error details exposed (admin-only, acceptable)

---

### 1.6 `/api/admin/allowlist/revoke` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ⚠️ | Missing `await` on session check | `route.ts:13` |
| **Authz** | ✅ | Admin-only | — |
| **Validation** | ✅ | Zod: email, quiz_id | `route.ts:6-9` |
| **DB ops** | Service role | `allowlist` (update status) | `route.ts:23-28` |
| **Audit logging** | ✅ | `allowlist_revoke` event | `route.ts:31` |

**Findings**:
- **M2**: Missing `await` on `getAdminSession()` - **BUG** (returns Promise, not checked)

---

### 1.7 `/api/admin/candidates/delete` (DELETE)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Admin session | `route.ts:7-9` |
| **Authz** | ✅ | Admin-only | `getAdminSession()` |
| **Validation** | ⚠️ | Only query param check, no UUID validation | `route.ts:16-20` |
| **DB ops** | Service role | `answers`, `quiz_attempts`, `candidates` (cascade delete) | `route.ts:36-67` |
| **Error handling** | ✅ | Generic errors | — |
| **Audit logging** | ✅ | `candidate_deleted` event | `route.ts:71` |

**Findings**:
- **L3**: No UUID format validation on `id` param (trusts DB to reject invalid)

---

## 2. Quiz Flow Routes

### 2.1 `/api/quiz/answers/save` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ❌ | **NO AUTH** | No token check |
| **Authz** | ❌ | **NO OWNERSHIP CHECK** | — |
| **Validation** | ✅ | Zod: attempt_id, candidate_id, answers (1-48) | `route.ts:5-10` |
| **DB ops** | Service role | `answers` (upsert by attempt_id) | `route.ts:42-90` |
| **Idempotency** | ✅ | Upsert pattern | `route.ts:59-77` |

**Findings**:
- **H1**: No authentication - anyone can save answers if they know IDs

---

### 2.2 `/api/quiz/attempt/create` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Bearer token required | `route.ts:17-31` |
| **Authz** | ✅ | Creates for authenticated user only | `route.ts:36-44` |
| **Validation** | ⚠️ | No body validation (uses hardcoded QUIZ_ID) | `route.ts:7` |
| **DB ops** | Service role | `quiz_attempts` (insert or fetch existing) | `route.ts:36-70` |
| **Idempotency** | ✅ | Handles unique violation | `route.ts:50-70` |

**Status**: ✅ Secure

---

### 2.3 `/api/quiz/attempt/update` (PATCH)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Bearer token required | `route.ts:15-29` |
| **Authz** | ✅ | Updates only user's own attempt | `route.ts:49` |
| **Validation** | ✅ | Manual: attemptId required, currentQuestion 1-86 | `route.ts:34-39` |
| **DB ops** | Service role | `quiz_attempts` (update) | `route.ts:45-49` |

**Status**: ✅ Secure

---

### 2.4 `/api/quiz/heartbeat` (POST)

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ✅ | Bearer token required | `route.ts:22-34` |
| **Authz** | ✅ | Upserts for authenticated user only | `route.ts:40-44` |
| **Validation** | ✅ | Zod: quiz_id (optional UUID) | `route.ts:8-10` |
| **DB ops** | Service role | `quiz_activity` (upsert) | `route.ts:40-44` |
| **Idempotency** | ✅ | Upsert by user_id + quiz_id | — |

**Status**: ✅ Secure

---

### 2.5 `/api/answers` (POST) - Final Submission

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **Authn** | ❌ | **NO AUTH** | No token check |
| **Authz** | ❌ | **NO OWNERSHIP CHECK** | — |
| **Validation** | ✅ | Zod: candidate_id, 48 answers exactly | `route.ts:12-18` |
| **DB ops** | Service role | `answers` (insert/update) | `route.ts:157-178` |
| **Idempotency** | ✅ | Handles unique violation on quiz_session_id | `route.ts:164-178` |

**Findings**:
- **H2**: No authentication - same issue as `/api/quiz/answers/save`

---

## 3. Admin Routes Summary

| Route | Method | Auth | Validation | Audit Log | Issues |
|-------|--------|------|------------|-----------|--------|
| `/api/admin/login` | POST | Turnstile + rate limit | ✅ Zod | ✅ | — |
| `/api/admin/logout` | POST | — | — | ❌ | — |
| `/api/admin/2fa/generate` | POST | ✅ Session | — | ❌ | — |
| `/api/admin/2fa/verify` | POST | ✅ Session | ✅ Zod | ❌ | — |
| `/api/admin/2fa/disable` | POST | ✅ Session | — | ❌ | — |
| `/api/admin/2fa/status` | GET | ✅ Session | — | — | — |
| `/api/admin/allowlist/search` | GET | ✅ Session | Query params | — | — |
| `/api/admin/allowlist/upsert` | POST | ✅ Session | ✅ Zod | ✅ | — |
| `/api/admin/allowlist/revoke` | POST | ⚠️ Missing await | ✅ Zod | ✅ | **M2** |
| `/api/admin/allowlist/reset` | POST | ✅ Session | ✅ Zod | ✅ | — |
| `/api/admin/allowlist/bulk-import` | POST | ✅ Session | ✅ Zod | ✅ | — |
| `/api/admin/allowlist/import` | POST | ✅ Session | — | — | — |
| `/api/admin/candidates/list` | GET | ✅ Session | — | — | — |
| `/api/admin/candidates/delete` | DELETE | ✅ Session | Query param | ✅ | L3 |
| `/api/admin/results/list` | GET | ✅ Session | — | — | — |
| `/api/admin/answers/[id]` | GET | ✅ Session | Path param | — | — |
| `/api/admin/events/list` | GET | ✅ Session | — | — | — |
| `/api/admin/notifications/list` | GET | ✅ Session | — | — | — |
| `/api/admin/activity/live` | GET | ✅ Session | — | — | — |
| `/api/admin/metrics/live-count` | GET | ✅ Session | — | — | — |
| `/api/admin/settings/maintenance` | GET/POST | ✅ Session | Manual bool check | ✅ | — |
| `/api/admin/pdf-download` | GET | ✅ Session | ✅ Zod | — | — |
| `/api/admin/export/[type]` | GET | ❌ Stub | — | — | Disabled |
| `/api/admin/templates/email-preview` | GET | ✅ Session | — | — | — |
| `/api/admin/debug/results` | GET | ✅ Session | — | — | Debug only |

---

## 4. Public/Auth Routes

| Route | Method | Auth | Validation | Rate Limit | Issues |
|-------|--------|------|------------|------------|--------|
| `/api/auth/request-magic-link` | POST | Allowlist | ✅ Zod | Supabase | — |
| `/api/auth/allowlist-check` | POST | — | ✅ Zod | ✅ 5/min | — |
| `/api/public/maintenance-status` | GET | — | — | ❌ | — |

---

## 5. User Routes

| Route | Method | Auth | Authz | Validation | Issues |
|-------|--------|------|-------|------------|--------|
| `/api/candidates/create` | POST | ✅ Bearer | Own user | Manual | — |
| `/api/documents/signed-url` | POST | ✅ Bearer | Own attempt | ✅ Zod | — |
| `/api/compute` | POST | ✅ Bearer | Own candidate | ✅ Zod | — |
| `/api/quiz/finish` | POST | ✅ Bearer | Own attempt | ✅ Zod | M1 |
| `/api/quiz/attempt/create` | POST | ✅ Bearer | Own user | — | — |
| `/api/quiz/attempt/update` | PATCH | ✅ Bearer | Own attempt | Manual | — |
| `/api/quiz/attempt/get` | GET | ✅ Bearer | Own attempt | — | — |
| `/api/quiz/heartbeat` | POST | ✅ Bearer | Own user | — | — |
| `/api/quiz/answers/save` | POST | ❌ **NONE** | ❌ | ✅ Zod | **H1** |
| `/api/answers` | POST | ❌ **NONE** | ❌ | ✅ Zod | **H2** |

---

## 6. Findings Summary

### Critical (0)
None.

### High (2)

| ID | Route | Issue | Risk | Fix |
|----|-------|-------|------|-----|
| **H1** | `/api/quiz/answers/save` | No authentication | Anyone with IDs can save answers | Add Bearer token auth + ownership check |
| **H2** | `/api/answers` | No authentication | Anyone with IDs can submit final answers | Add Bearer token auth + ownership check |

### Medium (2)

| ID | Route | Issue | Risk | Fix |
|----|-------|-------|------|-----|
| **M1** | `/api/quiz/finish` | No rate limiting | Resource exhaustion (PDF generation) | Add rate limit (e.g., 3/min per user) |
| **M2** | `/api/admin/allowlist/revoke` | Missing `await` on session check | Auth bypass | Add `await` before `getAdminSession()` |

### Low (3)

| ID | Route | Issue | Risk | Fix |
|----|-------|-------|------|-----|
| **L1** | `/api/compute` | Zod errors expose field details | Minor info leak | Acceptable for user-facing validation |
| **L2** | `/api/admin/allowlist/bulk-import` | Error details exposed | Admin-only, low risk | Acceptable |
| **L3** | `/api/admin/candidates/delete` | No UUID validation on ID param | Invalid IDs rejected by DB | Add Zod UUID validation |

---

## 7. Recommended Fixes

### High Priority (Before Production)

**H1 + H2: Add auth to answer routes**

```typescript
// /api/quiz/answers/save/route.ts - Add at top of POST handler:
const authHeader = req.headers.get('authorization') || ''
const token = authHeader.toLowerCase().startsWith('bearer ')
  ? authHeader.slice(7).trim()
  : null
if (!token) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
const { data: userRes } = await supabase.auth.getUser(token)
if (!userRes?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Add ownership check: verify candidate belongs to user
const { data: cand } = await supabaseAdmin
  .from('candidates')
  .select('user_id')
  .eq('id', candidate_id)
  .single()
if (!cand || cand.user_id !== userRes.user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**M2: Fix missing await**

```typescript
// /api/admin/allowlist/revoke/route.ts line 13
// FROM:
if (!getAdminSession()) return ...
// TO:
const session = await getAdminSession()
if (!session) return ...
```

### Medium Priority

**M1: Add rate limiting to /api/quiz/finish**

```typescript
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

// At start of POST handler:
const clientIp = getClientIp(req.headers)
const userRateKey = `finish:user:${user.id}`
if (!checkRateLimit(userRateKey, 3, 60 * 1000)) { // 3 per minute
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

---

## 8. Idempotency & Race Conditions

| Route | Idempotent? | Race Safe? | Notes |
|-------|-------------|------------|-------|
| `/api/quiz/finish` | ✅ | ⚠️ | `finished_at` check, but PDF could be generated twice on rapid calls |
| `/api/quiz/attempt/create` | ✅ | ✅ | Handles unique violation |
| `/api/answers` | ✅ | ✅ | Upsert on unique key |
| `/api/quiz/answers/save` | ✅ | ✅ | Upsert pattern |
| `/api/admin/allowlist/upsert` | ✅ | ✅ | Upsert on conflict |
| `/api/admin/candidates/delete` | ⚠️ | ⚠️ | No idempotency key, could error on double-click |

**Note**: Most routes use upsert patterns which handle concurrent calls gracefully.

---

## 9. Service Role Dependencies

All routes that modify data use `supabaseAdmin` (service role), which bypasses RLS:

| Table | Routes Using Service Role |
|-------|--------------------------|
| `quiz_attempts` | finish, attempt/create, attempt/update, candidates/delete |
| `candidates` | candidates/create, candidates/delete, compute |
| `answers` | answers, answers/save, candidates/delete |
| `allowlist` | all allowlist routes, finish |
| `quiz_activity` | heartbeat |
| `admin_events` | all admin mutation routes |
| `admin_settings` | maintenance |
| `notifications` | finish |

**Risk**: If service role key is leaked, all data is accessible. Key is only on server (env var).

---

## 10. Evidence Index

| File | Key Security Features |
|------|----------------------|
| `app/api/quiz/finish/route.ts` | Bearer auth, ownership check, Zod validation |
| `app/api/compute/route.ts` | Bearer auth, candidate ownership |
| `app/api/admin/login/route.ts` | Turnstile, rate limiting, bcrypt, 2FA |
| `app/api/admin/pdf-download/route.ts` | Admin session, UUID validation |
| `app/api/admin/allowlist/upsert/route.ts` | Admin session, Zod, audit log |
| `app/api/admin/allowlist/revoke/route.ts` | **BUG: missing await** |
| `app/api/quiz/answers/save/route.ts` | **NO AUTH** |
| `app/api/answers/route.ts` | **NO AUTH** |
| `src/server/admin/session.ts` | HMAC signing, timing-safe compare |
| `src/lib/rate-limiter.ts` | In-memory rate limiting |
