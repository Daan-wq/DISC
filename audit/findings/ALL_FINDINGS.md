# Consolidated Security & Quality Findings — DISC Quiz Platform

> **Generated**: 2024-12-18  
> **Sources**: A2-A9 Audit Reports  
> **Total Findings**: 34 (3 High, 18 Medium, 13 Low)

---

## Summary Dashboard

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 **HIGH** | 3 | Requires immediate fix before production |
| 🟠 **MEDIUM** | 18 | Should fix before production |
| 🟡 **LOW** | 13 | Fix when convenient |

---

## 🔴 HIGH SEVERITY (3)

### H1: No Authentication on `/api/quiz/answers/save`

| Attribute | Value |
|-----------|-------|
| **Source** | A4 - API Audit |
| **Route** | `POST /api/quiz/answers/save` |
| **Risk** | Anyone with candidate/attempt IDs can save answers for any user |
| **Impact** | Data tampering, quiz manipulation |
| **Evidence** | `app/api/quiz/answers/save/route.ts` - No token check |

**Fix**: Add Bearer token auth + ownership check
```typescript
const token = req.headers.get('authorization')?.slice(7)
if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const { data: userRes } = await supabase.auth.getUser(token)
if (!userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// Verify candidate belongs to user
```

---

### H2: No Authentication on `/api/answers`

| Attribute | Value |
|-----------|-------|
| **Source** | A4 - API Audit |
| **Route** | `POST /api/answers` |
| **Risk** | Anyone with candidate ID can submit final answers |
| **Impact** | Quiz completion for unauthorized users |
| **Evidence** | `app/api/answers/route.ts` - No token check |

**Fix**: Same as H1 - add Bearer token auth + ownership check

---

### H3: No Request Correlation ID

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | All API routes |
| **Risk** | Cannot trace requests across services or debug production issues |
| **Impact** | Severe debugging difficulty, no distributed tracing |
| **Evidence** | No `x-request-id` header implementation found |

**Fix**: Add middleware to inject `x-request-id`
```typescript
// middleware.ts
const requestId = req.headers.get('x-request-id') || randomUUID()
response.headers.set('x-request-id', requestId)
```

---

## 🟠 MEDIUM SEVERITY (18)

### M1: Missing `await` on Admin Session Check

| Attribute | Value |
|-----------|-------|
| **Source** | A4 - API Audit |
| **Route** | `POST /api/admin/allowlist/revoke` |
| **Risk** | Auth bypass - Promise object is truthy, check always passes |
| **Evidence** | `app/api/admin/allowlist/revoke/route.ts:13` |

**Fix**: Add `await` before `getAdminSession()`
```typescript
// FROM: if (!getAdminSession()) return ...
// TO: const session = await getAdminSession(); if (!session) return ...
```

---

### M2: No Rate Limiting on PDF Generation

| Attribute | Value |
|-----------|-------|
| **Source** | A4 - API Audit |
| **Route** | `POST /api/quiz/finish` |
| **Risk** | Resource exhaustion via repeated PDF generation |
| **Evidence** | No rate limit check in finish route |

**Fix**: Add rate limit (3 per minute per user)

---

### M3: Race Condition on `finished_at` Check

| Attribute | Value |
|-----------|-------|
| **Source** | A5 - PDF Audit |
| **Route** | `POST /api/quiz/finish` |
| **Risk** | Concurrent requests both see `finished_at = null`, generate duplicate PDFs |
| **Evidence** | `app/api/quiz/finish/route.ts:100-105` |

**Fix**: Use optimistic locking with `.is('finished_at', null)`

---

### M4: No Idempotency on PDF Generation

| Attribute | Value |
|-----------|-------|
| **Source** | A5 - PDF Audit |
| **Route** | `POST /api/quiz/finish` |
| **Risk** | Duplicate PDFs, wasted resources, duplicate emails |
| **Evidence** | No `pdf_path` check before generating |

**Fix**: Check `attempt.pdf_path` exists before generating

---

### M5: No Timeout on PDF Generation

| Attribute | Value |
|-----------|-------|
| **Source** | A5 - PDF Audit |
| **Component** | `pdf-generator.ts` |
| **Risk** | Malformed template could hang indefinitely |
| **Evidence** | No explicit timeout on Puppeteer operations |

**Fix**: Wrap operations with `Promise.race([generatePDF(), timeout(60000)])`

---

### M6: Autosave Lacks Conflict Resolution

| Attribute | Value |
|-----------|-------|
| **Source** | A6 - Frontend Audit |
| **Component** | `app/quiz/page.tsx:588-628` |
| **Risk** | Data corruption on rapid saves |
| **Evidence** | No version/timestamp check on save |

**Fix**: Add version or timestamp-based conflict detection

---

### M7: No Multi-Tab Detection

| Attribute | Value |
|-----------|-------|
| **Source** | A6 - Frontend Audit |
| **Component** | `app/quiz/page.tsx` |
| **Risk** | User can corrupt own data by opening quiz in multiple tabs |
| **Evidence** | No BroadcastChannel or localStorage lock |

**Fix**: Add localStorage-based tab lock

---

### M8: Heartbeat Uses Stale Token

| Attribute | Value |
|-----------|-------|
| **Source** | A6 - Frontend Audit |
| **Component** | `app/quiz/page.tsx:672-698` |
| **Risk** | Silent heartbeat failures after session refresh |
| **Evidence** | Token fetched once on mount, never refreshed |

**Fix**: Fetch fresh token before each heartbeat

---

### M9: Render Cascade on Answer

| Attribute | Value |
|-----------|-------|
| **Source** | A6 - Frontend Audit |
| **Component** | `app/quiz/page.tsx` |
| **Risk** | 3+ renders per answer click, performance impact |
| **Evidence** | `handleAnswer` triggers cascade of state updates |

**Fix**: Batch state updates or use reducer

---

### M10: No Host Isolation

| Attribute | Value |
|-----------|-------|
| **Source** | A7 - Headers Audit |
| **Component** | Deployment architecture |
| **Risk** | Admin and quiz share same origin |
| **Evidence** | No `middleware.ts`, single deployment |

**Fix**: Implement middleware host-gate or split deployment

---

### M11: Admin Cookie Path Too Broad

| Attribute | Value |
|-----------|-------|
| **Source** | A7 - Headers Audit |
| **Component** | `src/server/admin/session.ts:57` |
| **Risk** | Admin cookie sent with all requests including `/quiz/*` |
| **Evidence** | `path: '/'` in cookie config |

**Fix**: Change `path: '/'` to `path: '/admin'`

---

### M12: Incomplete Audit Trail

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | Admin read operations |
| **Risk** | PDF downloads, result views not logged |
| **Evidence** | No audit for `/api/admin/pdf-download`, `/api/admin/results/list` |

**Fix**: Add audit logging for read operations

---

### M13: Audit Events Lack Context

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | `app/api/admin/allowlist/*.ts` |
| **Risk** | Cannot identify which admin, no IP/session info |
| **Evidence** | Actor hardcoded as `'admin'` |

**Fix**: Include session ID, IP, user agent in payload

---

### M14: No React Error Boundaries

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | `app/` directory |
| **Risk** | Unhandled errors crash entire page |
| **Evidence** | No `error.tsx` files found |

**Fix**: Create `app/error.tsx` and `app/global-error.tsx`

---

### M15: No PDF Retry Mechanism

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | `pdf-generator.ts` |
| **Risk** | Single failure = user impact |
| **Evidence** | No retry logic, throws immediately |

**Fix**: Add retry with exponential backoff

---

### M16: Cleanup Requires External Cron

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | `supabase/functions/cleanup-expired-pdfs` |
| **Risk** | May not run if cron fails |
| **Evidence** | Edge function requires external trigger |

**Fix**: Document in ops runbook or use pg_cron

---

### M17: No APM/Metrics Collection

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | Entire application |
| **Risk** | Cannot monitor application health |
| **Evidence** | No Sentry, Datadog, or similar configured |

**Fix**: Add Sentry for error tracking

---

### M18: No CI/CD Pipeline

| Attribute | Value |
|-----------|-------|
| **Source** | A9 - Test Gates Audit |
| **Component** | `.github/workflows/` |
| **Risk** | No automated testing before deploy |
| **Evidence** | Directory does not exist |

**Fix**: Create GitHub Actions workflow

---

---

## 🟡 LOW SEVERITY (13)

### L1: No UUID Validation on Candidate Delete

| Attribute | Value |
|-----------|-------|
| **Source** | A4 - API Audit |
| **Route** | `DELETE /api/admin/candidates/delete` |
| **Risk** | Invalid IDs rejected by DB (low impact) |
| **Fix** | Add Zod UUID validation |

---

### L2: Zod Errors Expose Field Details

| Attribute | Value |
|-----------|-------|
| **Source** | A4 - API Audit |
| **Routes** | Various user-facing routes |
| **Risk** | Minor information disclosure |
| **Fix** | Acceptable for user-facing validation |

---

### L3: Error Details Exposed in Bulk Import

| Attribute | Value |
|-----------|-------|
| **Source** | A4 - API Audit |
| **Route** | `POST /api/admin/allowlist/bulk-import` |
| **Risk** | Admin-only, low impact |
| **Fix** | Acceptable (admin sees details) |

---

### L4: Unable to Verify Path Sanitization

| Attribute | Value |
|-----------|-------|
| **Source** | A5 - PDF Audit |
| **File** | `src/lib/utils/slugify.ts` |
| **Risk** | Path traversal (unlikely) |
| **Fix** | Manual code review |

---

### L5: No Size Limit on PDF Attachment

| Attribute | Value |
|-----------|-------|
| **Source** | A5 - PDF Audit |
| **Component** | Email sending |
| **Risk** | Email bounce if >25MB |
| **Fix** | Add size check before email |

---

### L6: Progress Save Uses Stale Token

| Attribute | Value |
|-----------|-------|
| **Source** | A6 - Frontend Audit |
| **Component** | `app/quiz/page.tsx:631-669` |
| **Risk** | Stale token after session refresh |
| **Fix** | Fetch token outside debounce |

---

### L7: Debug Logging in Render Path

| Attribute | Value |
|-----------|-------|
| **Source** | A6 - Frontend Audit |
| **Component** | `app/quiz/page.tsx:1117-1121` |
| **Risk** | Performance overhead in production |
| **Fix** | Remove or feature-flag console.log |

---

### L8: Statements Array Inline

| Attribute | Value |
|-----------|-------|
| **Source** | A6 - Frontend Audit |
| **Component** | `app/quiz/page.tsx:14-111` |
| **Risk** | Bundle size (~4.5KB) |
| **Fix** | Move to separate file |

---

### L9: CSP style-src Too Permissive

| Attribute | Value |
|-----------|-------|
| **Source** | A7 - Headers Audit |
| **Component** | `next.config.ts:10` |
| **Risk** | Any HTTPS stylesheet allowed |
| **Fix** | Restrict to specific origins |

---

### L10: Missing COOP/CORP/COEP Headers

| Attribute | Value |
|-----------|-------|
| **Source** | A7 - Headers Audit |
| **Component** | `next.config.ts` |
| **Risk** | Missing defense in depth |
| **Fix** | Add headers for Spectre protection |

---

### L11: Unstructured Logging

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | All API routes |
| **Risk** | Hard to aggregate/query logs |
| **Fix** | Use structured JSON logging |

---

### L12: Error Details Exposed in Production

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Component** | Various catch blocks |
| **Risk** | Information disclosure |
| **Fix** | Remove `details` field in production |

---

### L13: No Retention for Audit/Heartbeat Data

| Attribute | Value |
|-----------|-------|
| **Source** | A8 - Observability Audit |
| **Tables** | `admin_events`, `quiz_activity`, `notifications` |
| **Risk** | DB grows indefinitely |
| **Fix** | Add pg_cron cleanup job |

---

## Cross-Reference Matrix

| Finding | Audit | File | Line |
|---------|-------|------|------|
| H1 | A4 | `app/api/quiz/answers/save/route.ts` | - |
| H2 | A4 | `app/api/answers/route.ts` | - |
| H3 | A8 | (missing) `middleware.ts` | - |
| M1 | A4 | `app/api/admin/allowlist/revoke/route.ts` | 13 |
| M2 | A4 | `app/api/quiz/finish/route.ts` | - |
| M3 | A5 | `app/api/quiz/finish/route.ts` | 100-105 |
| M4 | A5 | `app/api/quiz/finish/route.ts` | - |
| M5 | A5 | `src/lib/services/pdf-generator.ts` | 147-156 |
| M6 | A6 | `app/quiz/page.tsx` | 588-628 |
| M7 | A6 | `app/quiz/page.tsx` | - |
| M8 | A6 | `app/quiz/page.tsx` | 672-698 |
| M9 | A6 | `app/quiz/page.tsx` | - |
| M10 | A7 | (missing) `middleware.ts` | - |
| M11 | A7 | `src/server/admin/session.ts` | 57 |
| M12 | A8 | Various admin routes | - |
| M13 | A8 | `app/api/admin/allowlist/*.ts` | - |
| M14 | A8 | (missing) `app/error.tsx` | - |
| M15 | A8 | `src/lib/services/pdf-generator.ts` | - |
| M16 | A8 | `supabase/functions/cleanup-expired-pdfs` | - |
| M17 | A8 | (missing) Sentry config | - |
| M18 | A9 | (missing) `.github/workflows/` | - |
