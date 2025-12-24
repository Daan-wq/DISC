# Host Isolation Implementation

> **Implemented**: 2024-12-18  
> **Finding**: M10 (No host isolation)  
> **Status**: Complete

---

## Summary

Implemented host-based routing to enforce isolation between quiz and admin subdomains:
- `quiz.tlcprofielen.nl` - Quiz-only routes
- `admin.tlcprofielen.nl` - Admin-only routes

---

## Changes Made

### 1. Middleware Host Isolation

**File**: `middleware.ts`

Added host-based route blocking:

```typescript
// Host isolation configuration
const QUIZ_HOSTS = (process.env.QUIZ_HOSTS || 'quiz.tlcprofielen.nl,localhost').split(',')
const ADMIN_HOSTS = (process.env.ADMIN_HOSTS || 'admin.tlcprofielen.nl').split(',')

// Paths that should only be accessible on specific hosts
const ADMIN_PATHS = ['/admin', '/api/admin']
const QUIZ_PATHS = ['/quiz', '/api/quiz', '/api/answers', '/api/candidates', '/api/auth', '/api/documents', '/login', '/auth', '/result', '/no-access']
```

**Behavior**:

| Host | Path | Result |
|------|------|--------|
| `quiz.tlcprofielen.nl` | `/admin/*` | 404 Not Found |
| `quiz.tlcprofielen.nl` | `/api/admin/*` | 404 Not Found |
| `admin.tlcprofielen.nl` | `/quiz/*` | Redirect to `/admin/login` |
| `admin.tlcprofielen.nl` | `/api/quiz/*` | Redirect to `/admin/login` |
| `admin.tlcprofielen.nl` | `/login` | Redirect to `/admin/login` |

### 2. Admin Cookie Domain Scoping

**File**: `src/server/admin/session.ts`

Added domain restriction for admin session cookie:

```typescript
const ADMIN_COOKIE_DOMAIN = process.env.ADMIN_COOKIE_DOMAIN || undefined

store.set({
  name: COOKIE_NAME,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/admin',
  maxAge: ttlMinutes * 60,
  ...(ADMIN_COOKIE_DOMAIN && { domain: ADMIN_COOKIE_DOMAIN }),
})
```

**Cookie Properties**:

| Property | Value | Purpose |
|----------|-------|---------|
| `path` | `/admin` | Only sent to admin routes |
| `domain` | `admin.tlcprofielen.nl` (when set) | Only valid on admin subdomain |
| `httpOnly` | `true` | Not accessible via JavaScript |
| `secure` | `true` (prod) | HTTPS only |
| `sameSite` | `lax` | CSRF protection |

---

## Environment Variables

Add these to your production environment:

```bash
# Host isolation
QUIZ_HOSTS=quiz.tlcprofielen.nl
ADMIN_HOSTS=admin.tlcprofielen.nl

# Cookie domain (optional - restricts cookie to admin subdomain only)
ADMIN_COOKIE_DOMAIN=admin.tlcprofielen.nl
```

For local development:
```bash
# Default allows localhost for quiz
QUIZ_HOSTS=quiz.tlcprofielen.nl,localhost
ADMIN_HOSTS=admin.tlcprofielen.nl,localhost
# Don't set ADMIN_COOKIE_DOMAIN in dev (cookies work on localhost without domain)
```

---

## Verification

### Manual Tests

**Test 1: Quiz host blocks admin routes**
```bash
# Should return 404
curl -I -H "Host: quiz.tlcprofielen.nl" http://localhost:3000/admin
curl -I -H "Host: quiz.tlcprofielen.nl" http://localhost:3000/api/admin/login
```

**Test 2: Admin host blocks quiz routes**
```bash
# Should return 302 redirect to /admin/login
curl -I -H "Host: admin.tlcprofielen.nl" http://localhost:3000/quiz
curl -I -H "Host: admin.tlcprofielen.nl" http://localhost:3000/login
```

**Test 3: Request ID header present**
```bash
# Should include x-request-id in response headers
curl -I http://localhost:3000/
```

### Automated Verification Script

```typescript
// tests/host-isolation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Host Isolation', () => {
  test('quiz host returns 404 for admin routes', async ({ request }) => {
    const response = await request.get('/admin', {
      headers: { Host: 'quiz.tlcprofielen.nl' }
    })
    expect(response.status()).toBe(404)
  })

  test('admin host redirects quiz routes to admin login', async ({ request }) => {
    const response = await request.get('/quiz', {
      headers: { Host: 'admin.tlcprofielen.nl' },
      maxRedirects: 0
    })
    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toContain('/admin/login')
  })

  test('request includes x-request-id header', async ({ request }) => {
    const response = await request.get('/')
    expect(response.headers()['x-request-id']).toBeTruthy()
  })
})
```

---

## DNS Configuration

Both subdomains should point to the same deployment:

```
quiz.tlcprofielen.nl   CNAME   your-vercel-deployment.vercel.app
admin.tlcprofielen.nl  CNAME   your-vercel-deployment.vercel.app
```

---

## Security Impact

| Before | After |
|--------|-------|
| Admin routes accessible on any host | Admin routes only on `admin.*` |
| Quiz routes accessible on any host | Quiz routes only on `quiz.*` |
| Admin cookie valid site-wide | Admin cookie scoped to `/admin` path |
| Admin cookie shared across subdomains | Admin cookie restricted to admin subdomain |

---

## Commits

```
fix(security): implement host isolation middleware (C1)
fix(security): add admin cookie domain scoping (C1)
```
