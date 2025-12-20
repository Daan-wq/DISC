# Final Pre-Deployment Checklist

> **Generated**: 2024-12-18  
> **Branch**: `release-fixes`  
> **Commits**: 20 commits ahead of `main`

---

## Go/No-Go Criteria

### BLOCKERS - Must All Be Closed

| ID | Finding | Status | Commit |
|----|---------|--------|--------|
| H1 | No auth on /api/quiz/answers/save | CLOSED | `26e280b` |
| H2 | No auth on /api/answers | CLOSED | `26e280b` |
| M1 | Missing await on getAdminSession | CLOSED | `33625ed` |
| H3 | No request correlation IDs | CLOSED | `0103ead` |
| M3 | PDF race condition | CLOSED | `512e946` |
| M4 | No PDF idempotency | CLOSED | `512e946` |

**Status**: [x] ALL BLOCKERS CLOSED

---

## Build & Test Verification

### Automated Checks

| Check | Command | Status | Notes |
|-------|---------|--------|-------|
| Lint | `npm run lint` | PASS | 0 errors, 163 warnings |
| TypeScript | `npm run typecheck` | PASS | No errors |
| Build | `npm run build` | PASS | 40 pages compiled |
| Dependency Audit | `npm audit --audit-level=high` | PASS | 0 high/critical, 5 moderate |

### Manual Verification Required

| Check | How to Verify | Status |
|-------|---------------|--------|
| Unit tests | `npm run test` | PENDING |
| E2E tests | `npx playwright test` | PENDING |
| Secret scan | `npx secretlint .` | PENDING |

---

## Security Fixes Verification

### C1: Host Isolation

| Check | Expected | Status |
|-------|----------|--------|
| Quiz host blocks admin routes | `quiz.*/admin` returns 404 | PENDING |
| Admin host blocks quiz routes | `admin.*/quiz` redirects to `/admin/login` | PENDING |
| x-request-id header present | Response includes `x-request-id` | PASS |

**Verify with:**
```bash
curl -I -H "Host: quiz.tlcprofielen.nl" http://localhost:3000/admin
# Expected: 404

curl -I -H "Host: admin.tlcprofielen.nl" http://localhost:3000/quiz
# Expected: 302 → /admin/login
```

### C2: CSRF + Cookie Hardening

| Check | Expected | Status |
|-------|----------|--------|
| Admin cookie sameSite=strict | Cookie attribute | PASS |
| Admin cookie path=/admin | Cookie attribute | PASS |
| CSRF validation on state-changing routes | 403 on invalid Origin | PASS |

**Routes with CSRF validation:**
- [x] `/api/admin/candidates/delete`
- [x] `/api/admin/allowlist/upsert`
- [x] `/api/admin/allowlist/revoke`
- [x] `/api/admin/allowlist/reset`
- [x] `/api/admin/settings/maintenance`

### C3: API Validation + Idempotency

| Check | Expected | Status |
|-------|----------|--------|
| Quiz finish idempotency | Second call returns `cached: true` | PASS |
| Zod validation on write routes | 400 on invalid payload | PASS |
| QUIZ_ID constant used | No hardcoded UUIDs | PASS |

### C4: PDF Injection Hardening

| Check | Expected | Status |
|-------|----------|--------|
| HTML escaping in placeholders | `<script>` escaped | PASS |
| External requests blocked | Only file:// and data: allowed | PASS |

### C5: Performance Optimizations

| Check | Expected | Status |
|-------|----------|--------|
| Duplicate write prevention | Skipped count logged | PASS |
| Increased debounce intervals | 1500ms answers, 1000ms progress | PASS |
| Adaptive heartbeat | 30s → 60s after 5 beats | PASS |

---

## Environment Variables Check

### Required for Production

| Variable | Purpose | Set? |
|----------|---------|------|
| `SUPABASE_URL` | Database connection | REQUIRED |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB access | REQUIRED |
| `SUPABASE_ANON_KEY` | Client DB access | REQUIRED |
| `ADMIN_SESSION_SECRET` | Session signing (min 16 chars) | REQUIRED |
| `TURNSTILE_SECRET_KEY` | Captcha verification | REQUIRED |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Captcha widget | REQUIRED |
| `RESEND_API_KEY` | Email sending | REQUIRED |

### Host Isolation (New)

| Variable | Purpose | Recommended Value |
|----------|---------|-------------------|
| `QUIZ_HOSTS` | Allowed quiz hostnames | `quiz.tlcprofielen.nl` |
| `ADMIN_HOSTS` | Allowed admin hostnames | `admin.tlcprofielen.nl` |
| `ADMIN_COOKIE_DOMAIN` | Cookie domain restriction | `admin.tlcprofielen.nl` |
| `ADMIN_ALLOWED_ORIGINS` | CSRF allowed origins | `https://admin.tlcprofielen.nl` |

---

## Database (RLS) Verification

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| `quiz_attempts` | Yes | User can only access own attempts |
| `answers` | Yes | User can only access own answers |
| `candidates` | Yes | User can only access own profile |
| `allowlist` | Yes | Admin-only access |
| `admin_users` | Yes | Admin-only access |
| `admin_events` | Yes | Admin-only insert |

**Verify with:**
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## Admin Authentication Verification

| Check | Expected | Status |
|-------|----------|--------|
| Password hashed with bcrypt | Yes | PASS |
| 2FA support (TOTP) | Optional, working | PASS |
| Rate limiting on login | 5/IP/15min, 3/user/15min | PASS |
| IP whitelist support | Optional, working | PASS |
| Session expiry | Configurable TTL | PASS |

---

## PDF Generation Verification

| Check | Expected | Status |
|-------|----------|--------|
| Idempotent finish | Same PDF on retry | PASS |
| 180-day retention | `pdf_expires_at` set | PASS |
| Signed URLs for download | 1-hour validity | PASS |
| External requests blocked | Request interception | PASS |
| Placeholders escaped | HTML entities | PASS |

---

## Deployment Recommendation

### Option A: Single Deployment with Middleware (Current)

```
quiz.tlcprofielen.nl  →  [Vercel]  →  Middleware routes
admin.tlcprofielen.nl →  [Vercel]  →  based on Host header
```

**Pros**: Simple, single deployment  
**Cons**: Relies on middleware for isolation

### Option B: Two Deployments (Recommended for Maximum Isolation)

```
quiz.tlcprofielen.nl  →  [Vercel Quiz]   APP_MODE=quiz
admin.tlcprofielen.nl →  [Vercel Admin]  APP_MODE=admin
```

**Pros**: Physical isolation, separate scaling  
**Cons**: Two deployments to manage

**If using Option B, add to each deployment:**
```bash
# Quiz deployment
APP_MODE=quiz

# Admin deployment  
APP_MODE=admin
```

And update middleware to check `APP_MODE` for additional safety.

---

## Final Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |
| Security | | | |

---

## Rollback Plan

If issues occur post-deployment:

1. **Immediate**: Revert to previous deployment in Vercel
2. **Database**: No schema migrations in this release (safe)
3. **Monitoring**: Check `admin_events` table for errors
4. **Contact**: [Add emergency contact]

---

## Post-Deployment Verification

After deployment, verify:

1. [ ] Quiz login flow works
2. [ ] Admin login flow works (with 2FA if enabled)
3. [ ] PDF generation completes
4. [ ] Email delivery works
5. [ ] Host isolation blocks cross-access
6. [ ] Check `admin_events` for any errors
