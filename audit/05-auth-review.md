# Auth & Session Security Review — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Branch**: `release-audit`  
> **Scope**: Magic link, admin login, session management, cookies, CSRF

---

## 1. Magic Link Flow

### 1.1 Flow Overview

```
User enters email → POST /api/auth/request-magic-link → Allowlist check → Supabase OTP → Email sent
User clicks link → /auth/callback → Supabase processes hash → Session created → Redirect to /quiz
```

### 1.2 Request Endpoint

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Input validation** | ✅ Zod schema | `app/api/auth/request-magic-link/route.ts:8-19` |
| **Email normalization** | ✅ lowercase + trim | `route.ts:48` |
| **Redirect URL validation** | ✅ Same domain check | `route.ts:10-16` |
| **Allowlist check** | ✅ Before sending OTP | `route.ts:54-90` |
| **Rate limiting** | ✅ Supabase built-in + UI cooldown | `route.ts:129-138`, `login/page.tsx:91-97` |

### 1.3 Allowlist Check Endpoint

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Rate limiting** | ✅ 5 per minute per email hash | `app/api/auth/allowlist-check/route.ts:12-29` |
| **Privacy-safe logging** | ✅ Only logs hash prefix | `route.ts:53` |
| **No enumeration leak** | ✅ Returns `eligible: false` for all error cases | `route.ts:41, 80, 96, 102, 106, 112` |

### 1.4 Callback Route

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Error handling** | ✅ Shows expired link message | `app/auth/callback/page.tsx:15-23` |
| **Session verification** | ✅ Uses `onAuthStateChange` | `callback/page.tsx:40-46` |
| **Redirect param** | ✅ From URL param | `callback/page.tsx:30` |

### 1.5 Quiz Page Guard

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Auth check** | ✅ `getUser()` on mount | `app/quiz/page.tsx:173-177` |
| **Redirect to login** | ✅ With return URL | `page.tsx:175-176` |
| **Session refresh** | ✅ Periodic check every 30s | `page.tsx:735-760` |

---

## 2. Enumeration Analysis

### 2.1 Magic Link Request

| Response | When | Leaks Info? |
|----------|------|-------------|
| `{ sent: false, reason: 'NO_ACCESS' }` | Email not on allowlist | ⚠️ **YES** - reveals email not allowed |
| `{ sent: false, reason: 'SUPABASE_RATE_LIMIT' }` | Rate limited | ✅ No |
| `{ sent: true }` | Success | ✅ No |

**Risk**: LOW - Attackers can determine if an email is on the allowlist, but:
- Allowlist is private (admin-managed)
- Rate limiting prevents bulk enumeration
- No password/account info revealed

**Recommendation**: Consider returning generic `sent: true` even for non-allowlist emails (silent failure). However, this makes UX worse for legitimate users who mistype their email.

### 2.2 Allowlist Check Endpoint

| Response | When | Leaks Info? |
|----------|------|-------------|
| `{ eligible: false }` | Not on allowlist | ✅ No - generic |
| `{ eligible: false, reason: 'ALREADY_USED' }` | Already completed quiz | ⚠️ **YES** - reveals status |
| `{ eligible: true }` | On allowlist | ✅ Expected |

**Risk**: LOW - `ALREADY_USED` reveals that email has taken the quiz, but rate limiting (5/min) prevents bulk scanning.

---

## 3. Admin Login Security

### 3.1 Authentication Flow

```
Admin enters credentials → POST /api/admin/login → Rate limit check → Turnstile verify → 
DB lookup → bcrypt compare → 2FA check (if enabled) → Session cookie set
```

### 3.2 Security Controls

| Control | Status | Implementation | Evidence |
|---------|--------|----------------|----------|
| **Password hashing** | ✅ bcrypt | `bcrypt.compare()` | `app/api/admin/login/route.ts:128` |
| **Rate limiting (IP)** | ✅ 5 attempts / 15 min | In-memory limiter | `route.ts:46-55` |
| **Rate limiting (user)** | ✅ 3 attempts / 15 min | In-memory limiter | `route.ts:58-67` |
| **IP whitelist** | ✅ Optional via env | `ADMIN_IP_WHITELIST` | `route.ts:33-43` |
| **Turnstile CAPTCHA** | ✅ Cloudflare | Skip in dev localhost | `route.ts:69-108` |
| **2FA (TOTP)** | ✅ Optional per admin | `otplib` authenticator | `route.ts:134-145` |
| **Audit logging** | ✅ All attempts logged | `admin_events` table | `route.ts:123, 130, 142, 155` |

### 3.3 2FA Implementation

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Secret generation** | ✅ `authenticator.generateSecret()` | `app/api/admin/2fa/generate/route.ts:18` |
| **QR code generation** | ✅ `qrcode.toDataURL()` | `generate/route.ts:22` |
| **Code verification** | ✅ `authenticator.check()` | `verify/route.ts:35` |
| **Secret storage** | ✅ In `admin_users.totp_secret` | `verify/route.ts:57-63` |
| **Session required** | ✅ Checks `getAdminSession()` | `generate/route.ts:12`, `verify/route.ts:21` |

**Risk**: None identified. Standard TOTP implementation.

---

## 4. Session Management

### 4.1 Admin Session (Custom JWT-like)

| Aspect | Value | Evidence |
|--------|-------|----------|
| **Cookie name** | `admin_session` | `src/server/admin/session.ts:4` |
| **Token format** | `{data}.{hmac}` | `session.ts:23` |
| **Signing algorithm** | HMAC-SHA256 | `session.ts:22` |
| **Secret requirement** | Min 16 chars | `session.ts:13-14` |
| **Payload** | `{ u: username, exp: timestamp }` | `session.ts:6-9` |
| **Default TTL** | 480 minutes (8 hours) | `login/route.ts:153` |
| **Timing-safe compare** | ✅ `crypto.timingSafeEqual()` | `session.ts:33` |

### 4.2 Cookie Flags

| Flag | Value | Status | Evidence |
|------|-------|--------|----------|
| **HttpOnly** | `true` | ✅ Prevents XSS theft | `session.ts:54` |
| **Secure** | `true` (prod) | ✅ HTTPS only in prod | `session.ts:55` |
| **SameSite** | `lax` | ✅ CSRF protection | `session.ts:56` |
| **Path** | `/` | ✅ | `session.ts:57` |
| **MaxAge** | TTL in seconds | ✅ | `session.ts:58` |

### 4.3 User Session (Supabase Auth)

| Aspect | Value | Evidence |
|--------|-------|----------|
| **Provider** | Supabase Auth (magic link) | `supabase.auth.signInWithOtp()` |
| **Token storage** | Supabase managed (localStorage) | Supabase default |
| **Session refresh** | ✅ `refreshSession()` on warning | `quiz/page.tsx:749` |
| **Expiry check** | ✅ Every 30 seconds | `quiz/page.tsx:735-760` |

---

## 5. CSRF Protection

### 5.1 Next.js Default Protection

| Mechanism | Status | Details |
|-----------|--------|---------|
| **SameSite cookies** | ✅ `lax` | Prevents cross-origin POST with cookies |
| **No GET mutations** | ✅ | All state changes use POST/DELETE |

### 5.2 Admin Route Protection

| Route | Method | Auth Check | CSRF Safe? |
|-------|--------|------------|------------|
| `/api/admin/login` | POST | Turnstile + rate limit | ✅ |
| `/api/admin/logout` | POST | None needed | ✅ |
| `/api/admin/allowlist/upsert` | POST | `getAdminSession()` | ✅ |
| `/api/admin/allowlist/revoke` | POST | `getAdminSession()` | ✅ |
| `/api/admin/candidates/delete` | DELETE | `getAdminSession()` | ✅ |
| `/api/admin/settings/maintenance` | POST | `getAdminSession()` | ✅ |
| `/api/admin/2fa/*` | POST | `getAdminSession()` | ✅ |

**Analysis**: SameSite=Lax cookies + session verification on all admin routes provides adequate CSRF protection. No additional CSRF tokens needed.

### 5.3 User Route Protection

| Route | Method | Auth Check | CSRF Safe? |
|-------|--------|------------|------------|
| `/api/auth/request-magic-link` | POST | Allowlist check | ✅ |
| `/api/quiz/finish` | POST | Bearer token + user_id match | ✅ |
| `/api/compute` | POST | Bearer token + candidate ownership | ✅ |
| `/api/answers` | POST | Bearer token + candidate ownership | ✅ |

---

## 6. Replay & Session Fixation

### 6.1 Admin Session

| Attack | Protected? | Mechanism | Evidence |
|--------|------------|-----------|----------|
| **Replay** | ✅ | Expiry timestamp in token | `session.ts:36` |
| **Session fixation** | ✅ | New token on login | `session.ts:44-59` |
| **Token theft** | ✅ | HttpOnly + Secure cookies | `session.ts:54-55` |

### 6.2 User Session (Supabase)

| Attack | Protected? | Mechanism |
|--------|------------|-----------|
| **Replay** | ✅ | Supabase token expiry |
| **Session fixation** | ✅ | New session on magic link click |
| **Token theft** | ⚠️ | localStorage (XSS vulnerable) |

**Note**: Supabase stores tokens in localStorage by default, which is XSS-vulnerable. However, the strict CSP mitigates this risk significantly.

---

## 7. Security Headers

| Header | Value | Status | Evidence |
|--------|-------|--------|----------|
| **CSP** | Strict (prod) | ✅ | `next.config.ts:10` |
| **HSTS** | 1 year, preload | ✅ | `next.config.ts:49-51` |
| **X-Frame-Options** | SAMEORIGIN | ✅ | `next.config.ts:54-56` |
| **X-Content-Type-Options** | nosniff | ✅ | `next.config.ts:59-61` |
| **Referrer-Policy** | strict-origin-when-cross-origin | ✅ | `next.config.ts:64-66` |
| **Permissions-Policy** | Restrictive | ✅ | `next.config.ts:69-71` |
| **X-XSS-Protection** | 1; mode=block | ✅ | `next.config.ts:74-76` |

---

## 8. Findings Summary

### Critical (0)
None identified.

### High (0)
None identified.

### Medium (1)

| ID | Finding | Risk | Fix | Evidence |
|----|---------|------|-----|----------|
| M1 | `ALREADY_USED` response reveals quiz completion status | Information disclosure | Return generic `eligible: false` without reason | `allowlist-check/route.ts:65` |

### Low (2)

| ID | Finding | Risk | Fix | Evidence |
|----|---------|------|-----|----------|
| L1 | `NO_ACCESS` reveals allowlist status | Information disclosure | Silent failure (tradeoff: worse UX) | `request-magic-link/route.ts:85` |
| L2 | In-memory rate limiter resets on deploy | Rate limit bypass | Use Redis in production | `rate-limiter.ts:12`, `allowlist-check/route.ts:11` |

### Info (2)

| ID | Finding | Note | Evidence |
|----|---------|------|----------|
| I1 | Supabase uses localStorage for tokens | XSS risk mitigated by CSP | Supabase default |
| I2 | Admin session uses custom JWT | Consider switching to Supabase admin auth | `session.ts` |

---

## 9. Recommended Actions

### Before Production

| Priority | Action | Effort |
|----------|--------|--------|
| **MED** | Remove `ALREADY_USED` reason from allowlist-check response | 5 min |
| **LOW** | Consider Redis rate limiter for production scaling | 2 hours |

### Post-Production

| Priority | Action | Effort |
|----------|--------|--------|
| **LOW** | Consider silent failure for non-allowlist emails | 10 min |
| **INFO** | Monitor for rate limit bypass attempts after deploys | Ongoing |

---

## 10. Test Proposals

### 10.1 Magic Link Flow

```bash
# Test 1: Valid allowlist email
curl -X POST http://localhost:3000/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "allowed@example.com"}'
# Expected: { "sent": true }

# Test 2: Non-allowlist email
curl -X POST http://localhost:3000/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "notallowed@example.com"}'
# Expected: { "sent": false, "reason": "NO_ACCESS" }

# Test 3: Rate limiting (6 rapid requests)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/allowlist-check \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com"}'
done
# Expected: 5th request returns 429
```

### 10.2 Admin Login

```bash
# Test 1: Invalid credentials
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@test.com", "password": "wrong"}'
# Expected: 401 Unauthorized

# Test 2: Rate limiting (4 failed attempts)
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin@test.com", "password": "wrong"}'
done
# Expected: 4th request returns 429

# Test 3: Missing Turnstile token (production)
curl -X POST https://production.url/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@test.com", "password": "correct"}'
# Expected: 400 "Captcha token missing"
```

### 10.3 Session Security

```bash
# Test 1: Access protected route without session
curl http://localhost:3000/api/admin/candidates/list
# Expected: 401 or redirect to login

# Test 2: Expired session token
# Manually craft token with past exp, verify rejection

# Test 3: Tampered session token
# Modify payload, verify HMAC rejection
```

---

## 11. Evidence Index

| File | Lines | Relevant For |
|------|-------|--------------|
| `app/login/page.tsx` | 1-229 | Login UI, rate limit cooldown |
| `app/auth/callback/page.tsx` | 1-144 | Magic link callback |
| `app/api/auth/request-magic-link/route.ts` | 1-193 | Magic link request, allowlist check |
| `app/api/auth/allowlist-check/route.ts` | 1-116 | Allowlist pre-check, rate limiting |
| `app/api/admin/login/route.ts` | 1-170 | Admin auth, bcrypt, 2FA, Turnstile |
| `app/api/admin/logout/route.ts` | 1-8 | Session clear |
| `app/api/admin/2fa/generate/route.ts` | 1-34 | TOTP setup |
| `app/api/admin/2fa/verify/route.ts` | 1-79 | TOTP verification |
| `src/server/admin/session.ts` | 1-74 | Session management, cookie flags |
| `src/lib/rate-limiter.ts` | 1-104 | Rate limiting utility |
| `next.config.ts` | 1-91 | Security headers |
| `app/quiz/page.tsx` | 170-760 | User auth guards, session refresh |
