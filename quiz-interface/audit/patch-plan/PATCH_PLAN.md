# Patch Plan — DISC Quiz Platform

> **Generated**: 2024-12-18  
> **Based on**: Consolidated findings from A2-A9 audits  
> **Total Patches**: 21 ordered by priority

---

## Patch Priority Order

```
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 1: BLOCKERS (Must fix before any production traffic)     │
│  ├── P1: Add auth to /api/quiz/answers/save (H1)                │
│  ├── P2: Add auth to /api/answers (H2)                          │
│  └── P3: Fix missing await in allowlist/revoke (M1)             │
├──────────────────────────────────────────────────────────────────┤
│  PHASE 2: SECURITY HARDENING (Before production)                │
│  ├── P4: Scope admin cookie to /admin path (M11)                │
│  ├── P5: Add PDF idempotency guard (M3+M4)                      │
│  ├── P6: Add request correlation ID middleware (H3)             │
│  └── P7: Create error.tsx boundary (M14)                        │
├──────────────────────────────────────────────────────────────────┤
│  PHASE 3: RELIABILITY (Shortly after launch)                    │
│  ├── P8: Add rate limiting to finish endpoint (M2)              │
│  ├── P9: Add PDF generation timeout (M5)                        │
│  ├── P10: Fix heartbeat stale token (M8)                        │
│  └── P11: Add multi-tab detection (M7)                          │
├──────────────────────────────────────────────────────────────────┤
│  PHASE 4: OBSERVABILITY (Week 1 post-launch)                    │
│  ├── P12: Add Sentry for error tracking (M17)                   │
│  ├── P13: Enhance audit logging (M12+M13)                       │
│  ├── P14: Document cleanup job scheduling (M16)                 │
│  └── P15: Add CI/CD pipeline (M18)                              │
├──────────────────────────────────────────────────────────────────┤
│  PHASE 5: POLISH (Ongoing)                                      │
│  ├── P16: Remove debug logging (L7)                             │
│  ├── P17: Extract statements to separate file (L8)              │
│  ├── P18: Add missing security headers (L10)                    │
│  ├── P19: Remove error details in production (L12)              │
│  ├── P20: Add PDF retry mechanism (M15)                         │
│  └── P21: Add data retention policies (L13)                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: BLOCKERS

### P1: Add Authentication to `/api/quiz/answers/save`

| Attribute | Value |
|-----------|-------|
| **Finding** | H1 |
| **Priority** | 🔴 BLOCKER |
| **Effort** | 30 min |
| **Risk if skipped** | Anyone can manipulate quiz answers |

**File**: `app/api/quiz/answers/save/route.ts`

**Patch**:
```typescript
// Add at top of POST handler (after imports)
export async function POST(req: NextRequest) {
  try {
    // === NEW: Auth check ===
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // === END NEW ===
    
    // Existing validation...
    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    // ...
    
    // === NEW: Ownership check ===
    const { data: cand } = await supabaseAdmin
      .from('candidates')
      .select('user_id')
      .eq('id', parsed.data.candidate_id)
      .single()
    
    if (!cand || cand.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // === END NEW ===
```

**Tests to add**:
```typescript
// tests/api/answers-save.spec.ts
describe('POST /api/quiz/answers/save', () => {
  it('returns 401 without auth token', async () => {
    const res = await fetch('/api/quiz/answers/save', { method: 'POST' })
    expect(res.status).toBe(401)
  })
  
  it('returns 403 for wrong user', async () => {
    // Create answer with User B's candidate ID, auth as User A
    const res = await fetch('/api/quiz/answers/save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({ candidate_id: userBCandidateId, ... })
    })
    expect(res.status).toBe(403)
  })
  
  it('returns 200 for correct user', async () => {
    const res = await fetch('/api/quiz/answers/save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({ candidate_id: userACandidateId, ... })
    })
    expect(res.status).toBe(200)
  })
})
```

---

### P2: Add Authentication to `/api/answers`

| Attribute | Value |
|-----------|-------|
| **Finding** | H2 |
| **Priority** | 🔴 BLOCKER |
| **Effort** | 30 min |
| **Risk if skipped** | Anyone can submit final quiz answers |

**File**: `app/api/answers/route.ts`

**Patch**: Same pattern as P1

**Tests to add**: Same pattern as P1

---

### P3: Fix Missing `await` on Admin Session Check

| Attribute | Value |
|-----------|-------|
| **Finding** | M1 |
| **Priority** | 🔴 BLOCKER |
| **Effort** | 5 min |
| **Risk if skipped** | Auth bypass on allowlist revoke |

**File**: `app/api/admin/allowlist/revoke/route.ts`

**Patch**:
```typescript
// Line 13
// FROM:
if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// TO:
const session = await getAdminSession()
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Tests to add**:
```typescript
// tests/api/admin-allowlist.spec.ts
describe('POST /api/admin/allowlist/revoke', () => {
  it('returns 401 without admin session', async () => {
    const res = await fetch('/api/admin/allowlist/revoke', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', quiz_id: QUIZ_ID })
    })
    expect(res.status).toBe(401)
  })
})
```

---

## PHASE 2: SECURITY HARDENING

### P4: Scope Admin Cookie to `/admin` Path

| Attribute | Value |
|-----------|-------|
| **Finding** | M11 |
| **Priority** | 🟠 HIGH |
| **Effort** | 5 min |
| **Risk if skipped** | Admin cookie sent with quiz requests |

**File**: `src/server/admin/session.ts`

**Patch**:
```typescript
// Line 57
// FROM:
path: '/',

// TO:
path: '/admin',
```

**Tests to add**:
```typescript
// Manual test: In browser console on /quiz page
document.cookie // Should NOT show 'admin_session'
```

---

### P5: Add PDF Idempotency Guard

| Attribute | Value |
|-----------|-------|
| **Finding** | M3 + M4 |
| **Priority** | 🟠 HIGH |
| **Effort** | 1 hour |
| **Risk if skipped** | Duplicate PDFs, duplicate emails |

**File**: `app/api/quiz/finish/route.ts`

**Patch** (add after ownership check ~line 97):
```typescript
// Idempotency: if PDF already exists, return early
if (attempt.pdf_path) {
  console.log('[finish] PDF already exists, returning cached result')
  return NextResponse.json({ 
    ok: true, 
    storage_path: attempt.pdf_path,
    pdf_filename: attempt.pdf_filename || 'DISC-rapport.pdf',
    cached: true 
  })
}

// Optimistic lock: only proceed if we can claim finished_at
const { data: claimed } = await supabaseAdmin
  .from('quiz_attempts')
  .update({ finished_at: new Date().toISOString() })
  .eq('id', attempt_id)
  .is('finished_at', null)
  .select('id')
  .maybeSingle()

if (!claimed) {
  // Race condition: another request is processing
  await new Promise(r => setTimeout(r, 2000))
  const { data: existing } = await supabaseAdmin
    .from('quiz_attempts')
    .select('pdf_path, pdf_filename')
    .eq('id', attempt_id)
    .single()
  
  if (existing?.pdf_path) {
    return NextResponse.json({ 
      ok: true, 
      storage_path: existing.pdf_path,
      pdf_filename: existing.pdf_filename,
      cached: true 
    })
  }
  return NextResponse.json({ error: 'Processing in progress' }, { status: 409 })
}
```

**Tests to add**:
```typescript
// tests/api/quiz-finish.spec.ts
describe('POST /api/quiz/finish idempotency', () => {
  it('returns cached result on second call', async () => {
    const res1 = await finishQuiz(attemptId)
    expect(res1.ok).toBe(true)
    
    const res2 = await finishQuiz(attemptId)
    expect(res2.ok).toBe(true)
    expect(res2.cached).toBe(true)
  })
  
  it('handles concurrent requests', async () => {
    const [res1, res2] = await Promise.all([
      finishQuiz(attemptId),
      finishQuiz(attemptId)
    ])
    // One should succeed, one should get cached or 409
    expect(res1.ok || res2.ok).toBe(true)
  })
})
```

---

### P6: Add Request Correlation ID Middleware

| Attribute | Value |
|-----------|-------|
| **Finding** | H3 |
| **Priority** | 🟠 HIGH |
| **Effort** | 30 min |
| **Risk if skipped** | Cannot trace requests in logs |

**File**: `middleware.ts` (create new)

**Patch**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || randomUUID()
  
  // Clone request headers to add request ID
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-request-id', requestId)
  
  // Create response with request ID header
  const response = NextResponse.next({
    request: { headers: requestHeaders }
  })
  response.headers.set('x-request-id', requestId)
  
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Tests to add**:
```bash
# Manual test
curl -I https://localhost:3000/api/public/maintenance-status
# Should include: x-request-id: <uuid>
```

---

### P7: Create Error Boundary

| Attribute | Value |
|-----------|-------|
| **Finding** | M14 |
| **Priority** | 🟠 HIGH |
| **Effort** | 15 min |
| **Risk if skipped** | Unhandled errors crash page |

**File**: `app/error.tsx` (create new)

**Patch**:
```typescript
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Er ging iets mis
        </h2>
        <p className="text-gray-600 mb-6">
          Er is een onverwachte fout opgetreden. Probeer het opnieuw of neem contact op met support.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  )
}
```

**Tests to add**:
```typescript
// tests/e2e/error-boundary.spec.ts
test('error boundary catches unhandled errors', async ({ page }) => {
  // Navigate to page that throws
  await page.goto('/test-error')
  await expect(page.locator('text=Er ging iets mis')).toBeVisible()
  await page.click('text=Opnieuw proberen')
})
```

---

## PHASE 3: RELIABILITY

### P8: Add Rate Limiting to Finish Endpoint

| Attribute | Value |
|-----------|-------|
| **Finding** | M2 |
| **Effort** | 30 min |

**File**: `app/api/quiz/finish/route.ts`

**Patch** (add after auth check):
```typescript
import { checkRateLimit } from '@/lib/rate-limiter'

// Rate limit: 3 finish attempts per user per minute
const rateLimitKey = `finish:${user.id}`
if (!checkRateLimit(rateLimitKey, 3, 60_000)) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

---

### P9: Add PDF Generation Timeout

| Attribute | Value |
|-----------|-------|
| **Finding** | M5 |
| **Effort** | 30 min |

**File**: `src/lib/services/pdf-generator.ts`

**Patch**:
```typescript
const PDF_TIMEOUT_MS = 60000

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout])
}

// In generatePDFFromTemplateStrict, wrap browser operations:
const browser = await withTimeout(
  puppeteer.launch({ headless: true, args: [...] }),
  10000,
  'Browser launch timed out'
)

// Wrap page.goto:
await withTimeout(
  page.goto(fileUrl, { waitUntil: 'networkidle0' }),
  30000,
  'Page load timed out'
)
```

---

### P10: Fix Heartbeat Stale Token

| Attribute | Value |
|-----------|-------|
| **Finding** | M8 |
| **Effort** | 15 min |

**File**: `app/quiz/page.tsx`

**Patch** (lines 672-698):
```typescript
// Replace the beat function:
async function beat() {
  try {
    // Fetch fresh token each beat
    const { data } = await supabase.auth.getSession()
    const freshToken = data.session?.access_token
    if (!freshToken) {
      console.warn('[heartbeat] No valid session')
      return
    }
    
    await fetch('/api/quiz/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshToken}`
      },
      body: JSON.stringify({})
    })
  } catch (err) {
    console.error('[heartbeat] failed:', err)
  }
}
```

---

### P11: Add Multi-Tab Detection

| Attribute | Value |
|-----------|-------|
| **Finding** | M7 |
| **Effort** | 30 min |

**File**: `app/quiz/page.tsx`

**Patch** (add at top of QuizInner component):
```typescript
// Multi-tab lock
useEffect(() => {
  const lockKey = 'quiz-tab-lock'
  const tabId = Math.random().toString(36).slice(2)
  
  const existingLock = localStorage.getItem(lockKey)
  const lockTime = parseInt(localStorage.getItem(lockKey + '-time') || '0')
  
  // Lock expires after 5 minutes of inactivity
  if (existingLock && existingLock !== tabId && Date.now() - lockTime < 5 * 60 * 1000) {
    setError('Quiz is al geopend in een ander tabblad. Sluit dit tabblad en gebruik het andere.')
    return
  }
  
  localStorage.setItem(lockKey, tabId)
  localStorage.setItem(lockKey + '-time', Date.now().toString())
  
  const timer = setInterval(() => {
    localStorage.setItem(lockKey + '-time', Date.now().toString())
  }, 30000)
  
  return () => {
    clearInterval(timer)
    if (localStorage.getItem(lockKey) === tabId) {
      localStorage.removeItem(lockKey)
      localStorage.removeItem(lockKey + '-time')
    }
  }
}, [])
```

---

## PHASE 4: OBSERVABILITY

### P12: Add Sentry Error Tracking

| Attribute | Value |
|-----------|-------|
| **Finding** | M17 |
| **Effort** | 2 hours |

**Steps**:
1. `npm install @sentry/nextjs`
2. Run `npx @sentry/wizard@latest -i nextjs`
3. Configure DSN in `.env`
4. Add to `next.config.ts`

---

### P13: Enhance Audit Logging

| Attribute | Value |
|-----------|-------|
| **Finding** | M12 + M13 |
| **Effort** | 2 hours |

**File**: Create `src/server/audit.ts`

---

### P14: Document Cleanup Job Scheduling

| Attribute | Value |
|-----------|-------|
| **Finding** | M16 |
| **Effort** | 30 min |

**File**: Create `docs/ops/cleanup-scheduling.md`

---

### P15: Add CI/CD Pipeline

| Attribute | Value |
|-----------|-------|
| **Finding** | M18 |
| **Effort** | 2 hours |

**File**: Create `.github/workflows/ci.yml`

---

## PHASE 5: POLISH

| Patch | Finding | Effort |
|-------|---------|--------|
| P16: Remove debug logging | L7 | 15 min |
| P17: Extract statements file | L8 | 30 min |
| P18: Add COOP/CORP headers | L10 | 15 min |
| P19: Remove error details | L12 | 30 min |
| P20: Add PDF retry | M15 | 1 hour |
| P21: Add retention policies | L13 | 2 hours |

---

## Go/No-Go Checklist

### 🚫 NO-GO (Cannot deploy if any fail)

| # | Check | Command | Required |
|---|-------|---------|----------|
| 1 | P1 implemented (H1 fix) | Code review | ✅ |
| 2 | P2 implemented (H2 fix) | Code review | ✅ |
| 3 | P3 implemented (M1 fix) | Code review | ✅ |
| 4 | TypeScript compiles | `npm run typecheck` | Exit 0 |
| 5 | ESLint passes | `npm run lint` | Exit 0 |
| 6 | Build succeeds | `npm run build` | Exit 0 |
| 7 | No high/critical vulnerabilities | `npm audit --audit-level=high` | Exit 0 |

### ⚠️ CONDITIONAL GO (Should fix, but can deploy with tracking)

| # | Check | Tracking Issue |
|---|-------|----------------|
| 8 | P4 implemented (cookie path) | Create ticket if not done |
| 9 | P5 implemented (idempotency) | Create ticket if not done |
| 10 | P6 implemented (request ID) | Create ticket if not done |
| 11 | P7 implemented (error boundary) | Create ticket if not done |

### ✅ POST-LAUNCH (Track in backlog)

| # | Check | Priority |
|---|-------|----------|
| 12 | P8-P11 implemented | Week 1 |
| 13 | P12-P15 implemented | Week 2 |
| 14 | P16-P21 implemented | Ongoing |

---

## Deployment Checklist

```bash
# Pre-deployment verification
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high

# Verify critical patches
grep -n "getUser(token)" app/api/quiz/answers/save/route.ts  # Should find auth
grep -n "getUser(token)" app/api/answers/route.ts            # Should find auth
grep -n "await getAdminSession" app/api/admin/allowlist/revoke/route.ts  # Should find await

# Run E2E tests (if available)
npm run test

# Deploy
# (via Vercel/Netlify integration or manual)

# Post-deploy smoke test
curl https://{domain}/api/public/maintenance-status
# Expected: {"enabled":false}
```

---

## Rollback Plan

If critical issues found post-deploy:

1. **Immediate**: Revert to previous Vercel/Netlify deployment
2. **If data corrupted**: 
   - Enable maintenance mode
   - Restore from Supabase backup
   - Communicate with affected users
3. **Post-mortem**: Document what went wrong, add to test suite

---

## Summary

| Phase | Patches | Total Effort | Target |
|-------|---------|--------------|--------|
| **1: Blockers** | P1-P3 | ~1 hour | Before any traffic |
| **2: Security** | P4-P7 | ~2 hours | Before production |
| **3: Reliability** | P8-P11 | ~2 hours | Week 1 |
| **4: Observability** | P12-P15 | ~6 hours | Week 2 |
| **5: Polish** | P16-P21 | ~5 hours | Ongoing |

**Total effort**: ~16 hours of implementation work
