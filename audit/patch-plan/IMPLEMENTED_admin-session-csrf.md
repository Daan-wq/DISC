# Admin Session & CSRF Hardening Implementation

> **Implemented**: 2024-12-18  
> **Finding**: Cookie hardening + CSRF mitigation  
> **Status**: Complete

---

## Summary

Implemented comprehensive CSRF protection and cookie hardening for admin session:
- Upgraded cookie `sameSite` from `lax` to `strict`
- Added Origin/Referer validation on all state-changing admin routes
- Created reusable CSRF validation helper

---

## Changes Made

### 1. Cookie Hardening

**File**: `src/server/admin/session.ts`

| Property | Before | After | Purpose |
|----------|--------|-------|---------|
| `httpOnly` | `true` | `true` | Prevent XSS access |
| `secure` | `true` (prod) | `true` (prod) | HTTPS only |
| `sameSite` | `lax` | `strict` | Stronger CSRF protection |
| `path` | `/admin` | `/admin` | Scope to admin routes |
| `domain` | (optional) | (optional) | Subdomain restriction |

**Why `strict` over `lax`?**
- `lax`: Cookie sent on top-level navigations (GET) from external sites
- `strict`: Cookie NEVER sent from external sites
- Admin panel doesn't need cross-site navigation, so `strict` is appropriate

### 2. CSRF Validation Helper

**File**: `src/server/admin/csrf.ts` (NEW)

```typescript
export function validateCsrf(req: NextRequest): string | null {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  // Validate against allowed origins
  if (origin) {
    if (!ALLOWED_ORIGINS.includes(origin.toLowerCase())) {
      return `Invalid Origin: ${origin}`
    }
  }
  
  // Fallback to Referer validation
  if (referer) {
    const refererOrigin = new URL(referer).origin
    if (!ALLOWED_ORIGINS.includes(refererOrigin.toLowerCase())) {
      return `Invalid Referer: ${refererOrigin}`
    }
  }
  
  return null // Valid
}
```

### 3. CSRF Protection on State-Changing Routes

Added `validateCsrf()` to all admin POST/DELETE routes:

| Route | Method | CSRF Protected |
|-------|--------|----------------|
| `/api/admin/candidates/delete` | DELETE | Yes |
| `/api/admin/allowlist/upsert` | POST | Yes |
| `/api/admin/allowlist/revoke` | POST | Yes |
| `/api/admin/allowlist/reset` | POST | Yes |
| `/api/admin/settings/maintenance` | POST | Yes |

**Example implementation:**
```typescript
import { validateCsrf } from '@/server/admin/csrf'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // CSRF validation
  const csrfError = validateCsrf(req)
  if (csrfError) {
    console.warn('[route] CSRF validation failed:', csrfError)
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }
  
  // ... rest of handler
}
```

### 4. Bug Fix: Missing `await` on `getAdminSession()`

**File**: `app/api/admin/allowlist/reset/route.ts`

```typescript
// Before (BUG - Promise always truthy):
if (!getAdminSession()) return ...

// After (FIXED):
const session = await getAdminSession()
if (!session) return ...
```

---

## Environment Variables

```bash
# Allowed origins for CSRF validation (comma-separated)
ADMIN_ALLOWED_ORIGINS=https://admin.tlcprofielen.nl

# In development, localhost is automatically added
```

---

## Security Checklist

| Check | Status |
|-------|--------|
| HttpOnly cookie | Yes |
| Secure cookie (HTTPS) | Yes (prod) |
| SameSite=Strict | Yes |
| Path scoped to /admin | Yes |
| Domain scoped (optional) | Yes |
| Origin/Referer validation | Yes |
| Rate limiting on login | Yes (existing) |
| 2FA support | Yes (existing) |

---

## Verification

### Manual Test: CSRF Block

```bash
# Should return 403 (invalid origin)
curl -X POST http://localhost:3000/api/admin/allowlist/upsert \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=..." \
  -d '{"email":"test@test.com"}'

# Expected: {"error":"Invalid request origin"}
```

### Manual Test: Cookie Attributes

```javascript
// In browser console on /admin page
document.cookie
// Should NOT show admin_session (httpOnly)

// In DevTools > Application > Cookies
// Verify: SameSite=Strict, Secure=true (prod), Path=/admin
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/server/admin/session.ts` | `sameSite: 'strict'` |
| `src/server/admin/csrf.ts` | NEW - CSRF validation helper |
| `app/api/admin/candidates/delete/route.ts` | Added CSRF validation |
| `app/api/admin/allowlist/upsert/route.ts` | Added CSRF validation |
| `app/api/admin/allowlist/revoke/route.ts` | Added CSRF validation |
| `app/api/admin/allowlist/reset/route.ts` | Added CSRF validation + fixed await |
| `app/api/admin/settings/maintenance/route.ts` | Added CSRF validation |

---

## Commits

```
fix(security): upgrade admin cookie sameSite to strict (C2)
feat(security): add CSRF validation helper (C2)
fix(security): add CSRF validation to state-changing admin routes (C2)
```
