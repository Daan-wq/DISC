# Admin Session Fix - Refresh Logout Issue

## Problem Description
Admin users were being logged out immediately after browser refresh (F5), despite having a session TTL of 480 minutes.

## Root Cause Analysis

### Classification: Category 3 - Server-side interpretation fault

The issue was caused by two problems:

### Problem 1: Next.js App Router Caching
The protected layout (`apps/admin/app/(protected)/layout.tsx`) was potentially being cached by Next.js, causing stale authentication state.

**Evidence:**
- No `dynamic = 'force-dynamic'` export in the layout
- Server components in App Router can be cached by default
- The `cookies()` call should disable caching, but explicit is more reliable

### Problem 2: Duplicate Token Generation
The login route (`apps/admin/app/api/admin/login/route.ts`) was using TWO methods to set the session cookie:

```typescript
// Method 1: cookies() API - creates token with timestamp T1
await setAdminSession(submittedUser, ttl)

// Method 2: Set-Cookie header - creates token with timestamp T2
const sessionCookie = createSessionCookie(submittedUser, ttl)
```

Both methods create different tokens because they call `Date.now()` at different times. This could cause:
- Race conditions in cookie storage
- Inconsistent token validation

## Fixes Applied

### Fix 1: Force Dynamic Rendering
**File:** `apps/admin/app/(protected)/layout.tsx`

Added explicit dynamic export to prevent caching:
```typescript
export const dynamic = 'force-dynamic'
```

### Fix 2: Single Cookie Method
**File:** `apps/admin/app/api/admin/login/route.ts`

Removed duplicate cookie setting, now only uses Set-Cookie header:
```typescript
// Use Set-Cookie header only - more reliable than cookies() API
const sessionCookie = createSessionCookie(submittedUser, ttl)
```

## Files Modified

| File | Change |
|------|--------|
| `apps/admin/app/(protected)/layout.tsx` | Added `export const dynamic = 'force-dynamic'` |
| `apps/admin/app/api/admin/login/route.ts` | Removed `setAdminSession()` call, kept only Set-Cookie header |

## Cookie Configuration

The admin session cookie has the following properties:

| Property | Value | Notes |
|----------|-------|-------|
| Name | `admin_session` | |
| Path | `/` | Default, configurable via `ADMIN_COOKIE_PATH` |
| HttpOnly | `true` | Prevents JS access |
| SameSite | `Lax` | CSRF protection |
| Secure | `true` (prod only) | HTTPS only in production |
| Max-Age | `28800` (480 min) | Configurable via `ADMIN_SESSION_TTL_MINUTES` |
| Domain | (not set) | Scoped to exact host |

## Verification Checklist

### Development (localhost)
- [ ] Login succeeds and redirects to dashboard
- [ ] Refresh (F5) keeps user on dashboard
- [ ] Cookie visible in DevTools (Application > Cookies)
- [ ] Cookie has correct Max-Age (~28800 seconds)
- [ ] No `Secure` flag on localhost

### Production (HTTPS)
- [ ] Login succeeds and redirects to dashboard
- [ ] Refresh (F5) keeps user on dashboard
- [ ] Cookie has `Secure` flag
- [ ] Cookie has `HttpOnly` flag
- [ ] Cookie has `SameSite=Lax`
- [ ] Session persists for 480 minutes (8 hours)

### Browser DevTools Verification

1. **After Login - Check Set-Cookie Header:**
   - Open Network tab
   - Find `/api/admin/login` request
   - Response Headers should contain:
     ```
     Set-Cookie: admin_session=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800
     ```

2. **Before Refresh - Check Cookie Header:**
   - Refresh page
   - Find document request in Network tab
   - Request Headers should contain:
     ```
     Cookie: admin_session=...
     ```

3. **Verify Cookie Storage:**
   - Open Application tab > Cookies
   - Find `admin_session` cookie
   - Verify all properties match expected values

## Running Playwright Tests

```bash
# Install Playwright browsers (first time)
npx playwright install

# Run admin session tests
npx playwright test --project=admin-app

# Run with UI
npx playwright test --project=admin-app --ui

# Run specific test
npx playwright test admin-session.spec.ts --project=admin-app
```

### Test Environment Variables
```bash
TEST_ADMIN_EMAIL=your-test-admin@example.com
TEST_ADMIN_PASSWORD=your-test-password
```

## Troubleshooting

### Cookie not being set
1. Check browser console for blocked Set-Cookie warnings
2. Verify `ADMIN_SESSION_SECRET` is set (min 16 chars)
3. Check if Secure flag is blocking on http://

### Cookie not being sent
1. Check Domain matches exactly
2. Check Path matches request path
3. Verify SameSite policy allows the request

### Session invalid after refresh
1. Check server logs for `[session]` messages
2. Verify `ADMIN_SESSION_SECRET` is the same across requests
3. Check for clock skew issues

## Related Files

- `src/server/admin/session.ts` - Session management functions
- `apps/admin/app/api/admin/login/route.ts` - Login endpoint
- `apps/admin/app/(protected)/layout.tsx` - Protected layout with auth check
- `tests/admin-session.spec.ts` - Playwright regression tests
