# Observability & Ops Readiness Audit — DISC Quiz Platform

> **Generated**: 2024-12-18  
> **Scope**: Logging, audit trail, error handling, metrics, cleanup jobs

---

## 1. Request Tracing

### 1.1 Correlation ID / Request ID

**Status**: ❌ Not Implemented

| Check | Result |
|-------|--------|
| Request ID header (`x-request-id`) | Not found |
| Correlation ID in logs | Not found |
| Distributed tracing (OpenTelemetry, etc.) | Not found |

**Finding H1**: No request correlation. Logs cannot be traced across API calls.

**Evidence**: Grep search for `request.id`, `requestId`, `correlation`, `traceId`, `x-request-id` found no matches in application code.

**Impact**:
- Cannot trace a user's session across multiple API calls
- Debugging production issues requires timestamp correlation
- No way to link frontend errors to backend logs

---

## 2. Audit Log Completeness

### 2.1 Current Audit Events

**Table**: `admin_events`

| Event Type | Logged | Actor | Payload |
|------------|--------|-------|---------|
| `admin_login_success` | ✅ | username | `{}` |
| `admin_login_failed` | ✅ | username | `{ reason: '...' }` |
| `admin_login_blocked` | ✅ | 'unknown' | `{ reason, ip }` |
| `candidate_deleted` | ✅ | admin username | `{ candidate_id, user_id }` |
| `allowlist_upsert` | ✅ | 'admin' | `{ email_normalized, quiz_id }` |
| `allowlist_revoke` | ✅ | 'admin' | `{ email, quiz_id }` |
| `allowlist_reset` | ✅ | 'admin' | `{ email, quiz_id }` |
| `allowlist_bulk_import` | ✅ | 'admin' | `{ count }` |
| `MAINTENANCE_MODE_TOGGLE` | ✅ | admin email | `{ enabled }` |

### 2.2 Missing Audit Events

| Action | Currently Logged | Should Log |
|--------|------------------|------------|
| PDF download by admin | ❌ | ✅ |
| Quiz attempt viewed by admin | ❌ | ✅ |
| Answers viewed by admin | ❌ | ✅ |
| Admin session extended | ❌ | ✅ |
| Admin logout | ❌ | ✅ |
| Admin 2FA setup | ❌ | ✅ |

**Finding M1**: Incomplete audit trail for admin read operations (viewing results, downloading PDFs).

### 2.3 Audit Log Quality Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Actor hardcoded as `'admin'` | `allowlist/*.ts` | Cannot identify which admin |
| No timestamp in payload | All events | Relies only on `created_at` |
| No request context | All events | No IP, user agent, session ID |
| Fire-and-forget (no await) | Some routes | Event may not persist |

**Finding M2**: Audit events lack context (IP, session ID) and some use hardcoded actor.

**Evidence**:
```typescript
// @c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/app/api/admin/allowlist/upsert/route.ts:71
await supabaseAdmin.from('admin_events').insert({ type, actor: 'admin', payload })
```

---

## 3. Error Handling & Logging

### 3.1 Server-Side Logging

| Pattern | Usage | Assessment |
|---------|-------|------------|
| `console.log` | Extensive | ⚠️ Verbose, no levels |
| `console.error` | Error cases | ✅ Present |
| `console.warn` | Warnings | ✅ Present |
| Structured logging | Not used | ❌ Missing |
| Log aggregation | Not configured | ❌ Missing |

**Evidence**: `/api/quiz/finish/route.ts` has 20+ console.log statements for debugging.

```typescript
// @c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/app/api/quiz/finish/route.ts:38
console.log('=== /api/quiz/finish START ===')
```

**Finding L1**: Console logging is verbose but unstructured. No log levels, no JSON format for aggregation.

### 3.2 Error Boundaries (Frontend)

| Component | Error Boundary | Assessment |
|-----------|---------------|------------|
| Global error | ❌ Not found | Missing `app/error.tsx` |
| Page-level error | ❌ Not found | No `error.tsx` in routes |
| `ErrorWall` component | ✅ Exists | Manual error display |

**Finding M3**: No React Error Boundaries. Unhandled errors crash entire page.

**Evidence**: No `error.tsx` or `global-error.tsx` files found in `/app` directory.

### 3.3 API Error Responses

| Pattern | Consistency | Example |
|---------|-------------|---------|
| Error format | ⚠️ Inconsistent | `{ error: '...' }` vs `{ error: '...', code: '...' }` |
| Status codes | ✅ Appropriate | 400, 401, 403, 404, 500 |
| Stack traces in prod | ✅ Not exposed | Only in development |
| Error details in prod | ⚠️ Sometimes exposed | `details: error.message` |

**Finding L2**: Some routes expose error details in production responses.

**Evidence**:
```typescript
// @c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/app/api/quiz/finish/route.ts:288
return NextResponse.json({ error: 'Unhandled', details: e?.message || String(e) }, { status: 500 })
```

---

## 4. PDF Failure Tracking

### 4.1 PDF Generation Failures

| Aspect | Status | Details |
|--------|--------|---------|
| Traceability | ⚠️ Partial | Console logs only |
| Retry mechanism | ❌ None | Single attempt |
| Dead-letter queue | ❌ None | Failed PDFs not queued |
| Failure notifications | ❌ None | Admin not notified |

**Finding M4**: PDF generation has no retry mechanism or failure queue.

**Evidence**: `generatePDFFromTemplate` throws on failure with no retry logic.

### 4.2 Email Failures

| Aspect | Status | Details |
|--------|--------|---------|
| Traceability | ✅ Good | Logged to `notifications` table |
| Retry mechanism | ❌ None | Single attempt |
| Failure notifications | ✅ Recorded | `severity: 'error'` in notifications |
| Admin visibility | ✅ Yes | `/api/admin/notifications/list` |

**Evidence**:
```typescript
// @c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/app/api/quiz/finish/route.ts:259
await supabaseAdmin.from('notifications').insert({
  severity: 'error',
  source: 'mailer',
  message: 'Failed to email PDF to user',
```

### 4.3 Notification Types

**Table**: `notifications`

| Source | Severity | Message Pattern |
|--------|----------|-----------------|
| `mailer` | `success` | `PDF emailed to {email}` |
| `mailer` | `error` | `Failed to email PDF to user` |

**Finding L3**: Only email outcomes are recorded. PDF generation failures not persisted.

---

## 5. Retention & Cleanup

### 5.1 PDF Cleanup Job

**Location**: `supabase/functions/cleanup-expired-pdfs/index.ts`

| Aspect | Status | Details |
|--------|--------|---------|
| Function exists | ✅ | Edge Function deployed |
| Logic correct | ✅ | Finds `pdf_expires_at < now()` |
| Storage cleanup | ✅ | Deletes from `quiz-docs` bucket |
| DB cleanup | ✅ | Sets `pdf_path = null` |
| Scheduling | ⚠️ Manual | Requires external cron trigger |

**Finding M5**: Cleanup job exists but requires external scheduling (not Supabase pg_cron).

**Evidence**:
```typescript
// @c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/supabase/functions/cleanup-expired-pdfs/index.ts:11
// Verify this is a cron request (optional: check authorization header)
const authHeader = req.headers.get("authorization")
```

**Required Setup**:
```bash
# External cron (e.g., cron-job.org, GitHub Actions)
curl -X POST https://{project}.supabase.co/functions/v1/cleanup-expired-pdfs \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}"
```

### 5.2 Other Data Retention

| Data Type | Retention Policy | Cleanup Job |
|-----------|------------------|-------------|
| PDFs | 180 days | ✅ cleanup-expired-pdfs |
| Audit logs (`admin_events`) | Forever | ❌ None |
| Notifications | Forever | ❌ None |
| Quiz activity (heartbeats) | Forever | ❌ None |
| Answers | Forever | ❌ None |

**Finding L4**: No retention policies for audit logs, notifications, or heartbeat data.

---

## 6. Metrics & Monitoring

### 6.1 Current Metrics

| Metric | Endpoint | Source |
|--------|----------|--------|
| Live quiz count | `/api/admin/metrics/live-count` | `quiz_activity` table |

**Evidence**:
```typescript
// @c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/app/api/admin/metrics/live-count/route.ts:13
const { count, error } = await supabaseAdmin
  .from('quiz_activity')
  .select('user_id', { count: 'exact', head: true })
  .gte('heartbeat_at', threshold)
```

### 6.2 Missing Metrics

| Metric | Value | Priority |
|--------|-------|----------|
| Quiz completion rate | % of started → finished | High |
| PDF generation success rate | % successful | High |
| Email delivery rate | % sent successfully | High |
| API error rate | 5xx responses | High |
| Average quiz duration | Time from start to finish | Medium |
| API response times | P50, P95, P99 latency | Medium |
| Active admin sessions | Current logged-in admins | Low |

**Finding M6**: No application performance monitoring (APM) or metrics collection.

### 6.3 External Monitoring

| Service | Configured | Status |
|---------|------------|--------|
| Sentry | ❌ | Not found |
| Datadog | ❌ | Not found |
| New Relic | ❌ | Not found |
| Vercel Analytics | Unknown | Depends on deployment |

---

## 7. Findings Summary

### High (1)

| ID | Finding | Impact | Fix |
|----|---------|--------|-----|
| **H1** | No request correlation ID | Cannot trace requests across services | Add middleware to inject `x-request-id` |

### Medium (6)

| ID | Finding | Impact | Fix |
|----|---------|--------|-----|
| **M1** | Incomplete audit trail | Admin reads not logged | Add audit for view/download actions |
| **M2** | Audit events lack context | Cannot identify admin or source | Include session ID, IP, user agent |
| **M3** | No React Error Boundaries | Uncaught errors crash page | Add `error.tsx` files |
| **M4** | No PDF retry mechanism | Single failure = user impact | Add retry with exponential backoff |
| **M5** | Cleanup requires external cron | May not run if cron fails | Document or use pg_cron |
| **M6** | No APM/metrics collection | Cannot monitor health | Add Sentry or similar |

### Low (4)

| ID | Finding | Impact | Fix |
|----|---------|--------|-----|
| **L1** | Unstructured logging | Hard to aggregate/query | Use structured JSON logging |
| **L2** | Error details exposed | Information disclosure | Remove `details` in production |
| **L3** | PDF failures not persisted | Admin unaware of issues | Log to notifications table |
| **L4** | No retention for audit/heartbeat | DB grows indefinitely | Add cleanup policies |

---

## 8. Recommendations

### 8.1 Quick Wins (Immediate)

#### 1. Add Request ID Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || randomUUID()
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)
  return response
}
```

#### 2. Add Global Error Boundary

```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('[global-error]', error)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">Er ging iets mis</h2>
        <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded">
          Opnieuw proberen
        </button>
      </div>
    </div>
  )
}
```

#### 3. Remove Error Details in Production

```typescript
// In catch blocks:
const isDev = process.env.NODE_ENV === 'development'
return NextResponse.json(
  { error: 'Internal server error', ...(isDev && { details: e.message }) },
  { status: 500 }
)
```

#### 4. Add PDF Failure Notification

```typescript
// In pdf-generator.ts catch block:
await supabaseAdmin.from('notifications').insert({
  severity: 'error',
  source: 'pdf-generator',
  message: `PDF generation failed for attempt ${attemptId}`,
  metadata: { error: e.message, profileCode }
})
```

### 8.2 Medium-Term Improvements

#### 1. Structured Logging Helper

```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  requestId?: string
  userId?: string
  [key: string]: unknown
}

export function log(entry: LogEntry) {
  const output = {
    timestamp: new Date().toISOString(),
    ...entry,
  }
  console.log(JSON.stringify(output))
}

// Usage:
log({ level: 'info', message: 'PDF generated', requestId, userId, duration: 1234 })
```

#### 2. Enhanced Audit Helper

```typescript
// src/server/audit.ts
interface AuditEvent {
  type: string
  actor: string
  payload: Record<string, unknown>
  context: {
    ip?: string
    userAgent?: string
    sessionId?: string
    requestId?: string
  }
}

export async function auditLog(event: AuditEvent) {
  await supabaseAdmin.from('admin_events').insert({
    type: event.type,
    actor: event.actor,
    payload: {
      ...event.payload,
      _context: event.context,
    },
  })
}
```

#### 3. PDF Retry with Backoff

```typescript
async function generatePDFWithRetry(options: PDFOptions, maxRetries = 3): Promise<Buffer> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generatePDFFromTemplate(options)
    } catch (e) {
      lastError = e as Error
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}
```

### 8.3 Long-Term Recommendations

| Area | Recommendation | Priority |
|------|----------------|----------|
| **APM** | Add Sentry for error tracking and performance | High |
| **Metrics** | Add Prometheus metrics or use Vercel Analytics | Medium |
| **Alerting** | Set up PagerDuty/Slack alerts for critical errors | Medium |
| **Log aggregation** | Use Datadog, Logtail, or similar for log search | Medium |
| **Retention** | Add pg_cron job for audit log rotation (e.g., 1 year) | Low |

---

## 9. Cleanup Job Scheduling Options

### Option A: External Cron (Current)

```yaml
# GitHub Actions workflow
name: PDF Cleanup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-expired-pdfs" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### Option B: Supabase pg_cron (Recommended)

```sql
-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Schedule HTTP call to edge function
select cron.schedule(
  'cleanup-expired-pdfs',
  '0 2 * * *',  -- Daily at 2 AM
  $$
  select net.http_post(
    url := 'https://{project}.supabase.co/functions/v1/cleanup-expired-pdfs',
    headers := '{"Authorization": "Bearer {service_role_key}"}'::jsonb
  );
  $$
);
```

---

## 10. Evidence Index

| File | Lines | Relevant For |
|------|-------|--------------|
| `app/api/admin/login/route.ts` | 38, 50, 62, 123, 130, 142, 155, 163 | Audit logging |
| `app/api/admin/allowlist/*.ts` | various | Audit with hardcoded actor |
| `app/api/quiz/finish/route.ts` | 38-290 | Console logging, email notifications |
| `app/api/admin/notifications/list/route.ts` | 1-28 | Notifications query |
| `app/api/admin/events/list/route.ts` | 1-33 | Audit events query |
| `app/api/admin/metrics/live-count/route.ts` | 1-26 | Only metrics endpoint |
| `supabase/functions/cleanup-expired-pdfs/index.ts` | 1-122 | PDF cleanup job |
| `supabase/sql/01_schema.sql` | 1-165 | Table definitions |
| `src/components/ErrorWall.tsx` | 1-30 | Manual error display |
