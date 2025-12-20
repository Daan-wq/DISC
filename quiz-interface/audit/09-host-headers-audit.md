# Host Isolation + Headers + CSP + CORS Audit — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Scope**: Security headers, CORS, host-based routing, cookie scoping

---

## 1. Current Deployment Architecture

### 1.1 Single Deployment Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE NEXT.JS DEPLOYMENT                    │
├─────────────────────────────────────────────────────────────────┤
│  quiz.tlcprofielen.nl (or similar)                              │
│                                                                 │
│  ├── /                    → Landing page                        │
│  ├── /login               → User login (magic link)             │
│  ├── /quiz                → Quiz interface (user)               │
│  ├── /result/:id          → Results page (user)                 │
│  ├── /admin/login         → Admin login                         │
│  ├── /admin/*             → Admin dashboard (protected)         │
│  └── /api/*               → All API routes                      │
└─────────────────────────────────────────────────────────────────┘
```

**Assessment**: Quiz and admin are currently served from the **same origin**. No subdomain isolation.

---

## 2. Security Headers Analysis

### 2.1 Current Configuration

**Location**: `@c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/next.config.ts:38-81`

| Header | Value | Status |
|--------|-------|--------|
| **Content-Security-Policy** | Dev/Prod specific | ✅ |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | ✅ |
| **X-Frame-Options** | `SAMEORIGIN` | ✅ |
| **X-Content-Type-Options** | `nosniff` | ✅ |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | ✅ |
| **Permissions-Policy** | `geolocation=(), microphone=(), camera=(), payment=()` | ✅ |
| **X-XSS-Protection** | `1; mode=block` | ✅ (legacy) |

### 2.2 CSP Analysis

**Development CSP**:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com;
frame-src https://challenges.cloudflare.com;
object-src 'none';
base-uri 'self';
form-action 'self';
```

**Production CSP**:
```
default-src 'self';
script-src 'self' https://challenges.cloudflare.com;
style-src 'self' https:;
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com;
frame-src https://challenges.cloudflare.com;
object-src 'none';
base-uri 'self';
form-action 'self';
```

| Directive | Dev | Prod | Assessment |
|-----------|-----|------|------------|
| `script-src` | `'unsafe-inline' 'unsafe-eval'` | No unsafe | ✅ Strict in prod |
| `style-src` | `'unsafe-inline'` | `https:` | ⚠️ Prod allows any HTTPS |
| `connect-src` | Supabase + Cloudflare | Same | ✅ |
| `frame-src` | Cloudflare Turnstile | Same | ✅ |
| `object-src` | `'none'` | Same | ✅ |

**Finding L1**: Production `style-src 'self' https:` allows loading stylesheets from any HTTPS origin. Consider restricting to specific domains.

### 2.3 Missing Headers

| Header | Recommended Value | Impact |
|--------|-------------------|--------|
| `Cross-Origin-Opener-Policy` | `same-origin` | Prevents Spectre-style attacks |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin resource loading |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Required for SharedArrayBuffer |

**Finding L2**: Missing COOP/CORP/COEP headers. Low priority for this application but recommended for defense in depth.

---

## 3. CORS Configuration

### 3.1 API Routes Analysis

**Grep result**: No custom CORS headers found in application code.

| Route Type | CORS Headers | Assessment |
|------------|--------------|------------|
| `/api/public/*` | None (default) | ✅ Same-origin only |
| `/api/quiz/*` | None (default) | ✅ Same-origin only |
| `/api/admin/*` | None (default) | ✅ Same-origin only |
| `/api/auth/*` | None (default) | ✅ Same-origin only |

**Assessment**: No explicit CORS configuration means Next.js defaults to same-origin policy. This is **secure by default**.

### 3.2 Cross-Origin Requests

| External Service | Origin | Method |
|------------------|--------|--------|
| Supabase | `*.supabase.co` | Client SDK (browser) |
| Cloudflare Turnstile | `challenges.cloudflare.com` | iframe + script |

**Assessment**: External services use their own CORS policies. Application doesn't need to set Access-Control-Allow-Origin.

---

## 4. Host-Based Routing

### 4.1 Current State

**Middleware**: ❌ No `middleware.ts` file exists

**Host checking**: ❌ No host-based routing implemented

**Route protection**:
- Admin routes protected by `getAdminSession()` cookie check
- Quiz routes protected by Supabase auth (bearer token)
- No hostname validation

### 4.2 Risk: Cross-Path Access

| Attack Vector | Current Protection | Risk |
|---------------|-------------------|------|
| Quiz user accessing `/admin` | Session cookie required | ✅ Blocked |
| Admin accessing `/quiz` via admin.domain | Same session, valid | ⚠️ Allowed |
| CSRF from external site | `sameSite: 'lax'` cookie | ✅ Mitigated |

**Finding M1**: No host isolation - admin and quiz share same origin. Admin cookie is valid across all paths.

---

## 5. Cookie Configuration

### 5.1 Admin Session Cookie

**Location**: `@c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/src/server/admin/session.ts:51-59`

```typescript
store.set({
  name: COOKIE_NAME,           // 'admin_session'
  value: token,
  httpOnly: true,              // ✅ Not accessible via JS
  secure: process.env.NODE_ENV === 'production',  // ✅ HTTPS only in prod
  sameSite: 'lax',             // ✅ CSRF protection
  path: '/',                   // ⚠️ Valid for all paths
  maxAge: ttlMinutes * 60,     // ✅ Time-limited
})
```

| Attribute | Value | Assessment |
|-----------|-------|------------|
| `httpOnly` | `true` | ✅ XSS protected |
| `secure` | Prod only | ✅ HTTPS enforced |
| `sameSite` | `lax` | ✅ CSRF protected |
| `path` | `/` | ⚠️ Valid site-wide |
| `domain` | Not set | ⚠️ Current host only |

**Finding M2**: Admin cookie has `path: '/'`, meaning it's sent with requests to `/quiz/*` paths. If host isolation is implemented, cookie should be scoped to `/admin` or admin subdomain.

### 5.2 Supabase Auth Cookies

Supabase manages its own cookies:
- `sb-<project>-auth-token` - JWT stored in localStorage/cookie
- Domain: Current host (no cross-subdomain sharing)

**Assessment**: Supabase auth is already isolated to current host.

---

## 6. Findings Summary

### Critical (0)
None.

### High (0)
None.

### Medium (2)

| ID | Finding | Impact | Fix |
|----|---------|--------|-----|
| **M1** | No host isolation | Admin/quiz on same origin | Implement Option A or B below |
| **M2** | Admin cookie path too broad | Cookie sent to all routes | Scope to `/admin` path |

### Low (2)

| ID | Finding | Impact | Fix |
|----|---------|--------|-----|
| **L1** | Prod CSP `style-src https:` too permissive | Any HTTPS stylesheet allowed | Restrict to specific origins |
| **L2** | Missing COOP/CORP/COEP headers | Defense in depth | Add headers |

---

## 7. Recommendations

### Option A: Two Separate Deployments (Recommended for high-security)

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│     quiz.tlcprofielen.nl        │  │    admin.tlcprofielen.nl        │
├─────────────────────────────────┤  ├─────────────────────────────────┤
│  /                              │  │  /                              │
│  /login                         │  │  /login                         │
│  /quiz                          │  │  /dashboard                     │
│  /result/:id                    │  │  /allowlist                     │
│  /api/quiz/*                    │  │  /results                       │
│  /api/auth/*                    │  │  /api/admin/*                   │
│  /api/public/*                  │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘
         │                                      │
         └──────────── Shared Supabase ─────────┘
```

**Pros**:
- Complete isolation (different origins)
- Admin cookies cannot leak to quiz
- Can have different CSP policies
- Independent scaling

**Cons**:
- More complex deployment
- Need to split codebase
- Shared components need duplication or npm package

**Implementation**:
1. Create `/apps/quiz` and `/apps/admin` in monorepo (turborepo)
2. Deploy to separate Vercel/Netlify projects
3. Configure DNS: `quiz.tlcprofielen.nl`, `admin.tlcprofielen.nl`
4. Update Supabase auth callback URLs

### Option B: Middleware Host-Gate (Simpler, same deployment)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const QUIZ_HOST = process.env.QUIZ_HOST || 'quiz.tlcprofielen.nl'
const ADMIN_HOST = process.env.ADMIN_HOST || 'admin.tlcprofielen.nl'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.split(':')[0] || ''
  const path = req.nextUrl.pathname

  // Block admin paths on quiz host
  if (host === QUIZ_HOST && path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Block quiz paths on admin host
  if (host === ADMIN_HOST && (path.startsWith('/quiz') || path === '/login')) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  // Block cross-host API access
  if (host === QUIZ_HOST && path.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (host === ADMIN_HOST && path.startsWith('/api/quiz')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Pros**:
- Single deployment
- Same codebase
- Quick to implement

**Cons**:
- Still same origin technically
- Cookies still shared (can mitigate with path scoping)
- Less isolation than Option A

---

## 8. Quick Wins (Immediate Fixes)

### Quick Win 1: Scope Admin Cookie to `/admin`

```typescript
// src/server/admin/session.ts line 57
// Change:
path: '/',
// To:
path: '/admin',
```

**Impact**: Admin cookie only sent to `/admin/*` requests.

### Quick Win 2: Restrict CSP style-src

```typescript
// next.config.ts line 10
// Change:
style-src 'self' https:;
// To:
style-src 'self' 'unsafe-inline';
// Or with hash/nonce for specific inline styles
```

**Note**: May need `'unsafe-inline'` for Next.js hydration styles.

### Quick Win 3: Add Missing Security Headers

```typescript
// next.config.ts - add to headers array:
{
  key: 'Cross-Origin-Opener-Policy',
  value: 'same-origin',
},
{
  key: 'Cross-Origin-Resource-Policy',
  value: 'same-origin',
},
```

### Quick Win 4: Create Basic Middleware (Host Logging)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || 'unknown'
  const path = req.nextUrl.pathname
  
  // Log for monitoring (remove in production or use proper logging)
  console.log(`[middleware] ${host}${path}`)
  
  // Add host to response headers for debugging
  const response = NextResponse.next()
  response.headers.set('X-Served-Host', host)
  
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 9. Test Scenarios

### 9.1 Header Verification

```bash
# Test security headers
curl -I https://quiz.tlcprofielen.nl/

# Expected headers:
# Content-Security-Policy: default-src 'self'; ...
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

### 9.2 CORS Verification

```bash
# Test cross-origin request (should fail)
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://quiz.tlcprofielen.nl/api/quiz/answers/save

# Expected: No Access-Control-Allow-Origin header
```

### 9.3 Cookie Scope (after fix)

```javascript
// In browser console on /quiz page
document.cookie
// Should NOT show 'admin_session' cookie (if path is /admin)
```

---

## 10. Deployment Recommendation

### For Current State: Option B (Middleware Host-Gate)

Given the single-deployment architecture, implementing middleware host-gating is the quickest path to improved isolation:

1. **Create `middleware.ts`** with host-based routing
2. **Scope admin cookie** to `/admin` path
3. **Configure DNS** with two CNAMEs pointing to same deployment
4. **Update environment** with `QUIZ_HOST` and `ADMIN_HOST`

### For Future: Option A (Two Deployments)

If security requirements increase or if there's a need for:
- Different scaling profiles (quiz = high traffic, admin = low)
- Different CSP policies
- Complete cookie isolation
- Independent release cycles

Then migrate to turborepo with separate `/apps/quiz` and `/apps/admin` packages.

---

## 11. Evidence Index

| File | Lines | Relevant For |
|------|-------|--------------|
| `next.config.ts` | 1-91 | Security headers, CSP |
| `src/server/admin/session.ts` | 1-74 | Admin cookie config |
| `app/admin/(protected)/layout.tsx` | 1-14 | Admin route protection |
| (missing) `middleware.ts` | N/A | No host-based routing |
