# Surface Map — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Branch**: `release-audit`  
> **Status**: Read-only audit pass

---

## 1. Folder Structure & Core Components

### App Routes (`/app`)
- **`/app/page.tsx`** — Root landing page (redirects)
- **`/app/login/page.tsx`** — User login (magic link)
- **`/app/auth/callback/`** — Supabase auth callback handler
- **`/app/quiz/page.tsx`** — Main quiz interface (96 statements)
- **`/app/result/[id]/page.tsx`** — Result display stub
- **`/app/no-access/page.tsx`** — Access denied page
- **`/app/admin/login/page.tsx`** — Admin login page
- **`/app/admin/(protected)/`** — Protected admin dashboard:
  - `page.tsx` — Dashboard home
  - `allowlist/page.tsx` — Manage allowlist
  - `candidates/page.tsx` — View candidates
  - `results/page.tsx` — Quiz results
  - `events/page.tsx` — Audit events
  - `activity/page.tsx` — Live activity
  - `notifications/page.tsx` — System notifications
  - `settings/page.tsx` — App settings
  - `answers/[id]/page.tsx` — View individual answers

### Source Library (`/src/lib`)
- **`supabase.ts`** — Supabase client (anon + admin)
- **`constants.ts`** — QUIZ_ID constant
- **`rate-limiter.ts`** — In-memory rate limiting
- **`validations.ts`** — Zod schemas
- **`schema.ts`** — Type definitions
- **`disc/`** — DISC calculator (Excel-parity)
- **`services/pdf-generator.ts`** — Puppeteer PDF generation
- **`utils/`** — Utilities (placeholder-replacer, chart-generator, slugify)
- **`data/canonical-statements.ts`** — 96 DISC statements

### Server Code (`/src/server`)
- **`admin/session.ts`** — Admin session management (HMAC-signed cookies)
- **`admin/maintenance.ts`** — Maintenance mode logic
- **`email/mailer.ts`** — Nodemailer SMTP integration
- **`pdf/renderPdf.ts`** — PDF rendering with Puppeteer
- **`templates/`** — Email templates

### Supabase (`/supabase`)
- **`sql/`** — Database migrations (01-11)
- **`functions/`** — Edge functions (cleanup-expired-pdfs, etc.)
- **`email-templates/`** — Supabase email templates

---

## 2. API Routes — Auth Type & DB Tables

### Legend
- **anon** = No auth required
- **user** = Supabase JWT (Bearer token)
- **admin** = Admin session cookie (HMAC-signed)
- **service** = Uses `supabaseAdmin` (service role key)

### Public Routes (anon)

| Route | Method | Auth | DB Tables | Evidence |
|-------|--------|------|-----------|----------|
| `/api/public/maintenance-status` | GET | anon | `admin_settings` | `app/api/public/maintenance-status/route.ts:6-30` |
| `/api/auth/allowlist-check` | POST | anon | `allowlist` | `app/api/auth/allowlist-check/route.ts:32-113` |
| `/api/auth/request-magic-link` | POST | anon | `allowlist`, `candidates` (via admin) | `app/api/auth/request-magic-link/route.ts:35-192` |

### User Routes (Supabase JWT)

| Route | Method | Auth | DB Tables | Evidence |
|-------|--------|------|-----------|----------|
| `/api/candidates/create` | POST | user+service | `candidates` | `app/api/candidates/create/route.ts:10-74` |
| `/api/compute` | POST | user+service | `candidates` | `app/api/compute/route.ts:14-124` |
| `/api/answers` | POST | service | `answers` | `app/api/answers/route.ts:23-206` |
| `/api/quiz/attempt/create` | POST | user+service | `quiz_attempts` | `app/api/quiz/attempt/create/route.ts:9-82` |
| `/api/quiz/attempt/get` | POST | user+service | `quiz_attempts` | `app/api/quiz/attempt/get/route.ts` |
| `/api/quiz/attempt/update` | POST | user+service | `quiz_attempts` | `app/api/quiz/attempt/update/route.ts` |
| `/api/quiz/answers/save` | POST | user+service | `answers` | `app/api/quiz/answers/save/route.ts` |
| `/api/quiz/finish` | POST | user+service | `quiz_attempts`, `allowlist`, `notifications` | `app/api/quiz/finish/route.ts:36-290` |
| `/api/quiz/heartbeat` | POST | user+service | `quiz_activity` | `app/api/quiz/heartbeat/route.ts:15-53` |
| `/api/documents/signed-url` | POST | user+service | `quiz_attempts` | `app/api/documents/signed-url/route.ts:10-62` |

### Admin Routes (Session Cookie)

| Route | Method | Auth | DB Tables | Evidence |
|-------|--------|------|-----------|----------|
| `/api/admin/login` | POST | anon→admin | `admin_users`, `admin_events` | `app/api/admin/login/route.ts:18-170` |
| `/api/admin/logout` | POST | admin | — | `app/api/admin/logout/route.ts` |
| `/api/admin/candidates/list` | GET | admin+service | `candidates` | `app/api/admin/candidates/list/route.ts:5-31` |
| `/api/admin/candidates/delete` | DELETE | admin+service | `candidates`, `answers`, `admin_events` | `app/api/admin/candidates/delete/route.ts` |
| `/api/admin/results/list` | GET | admin+service | `quiz_attempts`, `candidates`, `answers` | `app/api/admin/results/list/route.ts:5-106` |
| `/api/admin/allowlist/search` | GET | admin+service | `allowlist` | `app/api/admin/allowlist/search/route.ts` |
| `/api/admin/allowlist/upsert` | POST | admin+service | `allowlist`, `admin_events` | `app/api/admin/allowlist/upsert/route.ts:17-73` |
| `/api/admin/allowlist/revoke` | POST | admin+service | `allowlist`, `admin_events` | `app/api/admin/allowlist/revoke/route.ts` |
| `/api/admin/allowlist/reset` | POST | admin+service | `allowlist`, `admin_events` | `app/api/admin/allowlist/reset/route.ts` |
| `/api/admin/allowlist/import` | POST | admin+service | `allowlist` | `app/api/admin/allowlist/import/route.ts` |
| `/api/admin/allowlist/bulk-import` | POST | admin+service | `allowlist` | `app/api/admin/allowlist/bulk-import/route.ts` |
| `/api/admin/events/list` | GET | admin+service | `admin_events` | `app/api/admin/events/list/route.ts` |
| `/api/admin/notifications/list` | GET | admin+service | `notifications` | `app/api/admin/notifications/list/route.ts` |
| `/api/admin/activity/live` | GET | admin+service | `quiz_activity` | `app/api/admin/activity/live/route.ts` |
| `/api/admin/metrics/live-count` | GET | admin+service | `quiz_activity` | `app/api/admin/metrics/live-count/route.ts` |
| `/api/admin/settings/maintenance` | GET/POST | admin+service | `admin_settings`, `admin_events` | `app/api/admin/settings/maintenance/route.ts` |
| `/api/admin/pdf-download` | GET | admin+service | `quiz_attempts` | `app/api/admin/pdf-download/route.ts` |
| `/api/admin/answers/[id]` | GET | admin+service | `answers` | `app/api/admin/answers/[id]/route.ts` |
| `/api/admin/templates/email-preview` | GET | admin | — | `app/api/admin/templates/email-preview/route.ts` |
| `/api/admin/export/[type]` | GET | admin | — | `app/api/admin/export/[type]/route.ts` (stub) |
| `/api/admin/debug/results` | GET | admin+service | `quiz_attempts` | `app/api/admin/debug/results/route.ts` |
| `/api/admin/2fa/status` | GET | admin+service | `admin_users` | `app/api/admin/2fa/status/route.ts` |
| `/api/admin/2fa/generate` | POST | admin+service | `admin_users` | `app/api/admin/2fa/generate/route.ts` |
| `/api/admin/2fa/verify` | POST | admin+service | `admin_users` | `app/api/admin/2fa/verify/route.ts` |
| `/api/admin/2fa/disable` | POST | admin+service | `admin_users` | `app/api/admin/2fa/disable/route.ts` |

---

## 3. Environment Variables

### Supabase
| Variable | Used In | Evidence |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts:4` | Client-side Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:5` | Client-side anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase.ts:6` | **SENSITIVE** - Admin DB access |

### Admin Authentication
| Variable | Used In | Evidence |
|----------|---------|----------|
| `ADMIN_SESSION_SECRET` | `src/server/admin/session.ts:12` | **SENSITIVE** - HMAC signing key |
| `ADMIN_SESSION_TTL_MINUTES` | `app/api/admin/login/route.ts:153` | Session duration (default: 480) |
| `ADMIN_IP_WHITELIST` | `app/api/admin/login/route.ts:33` | Comma-separated IP list |

### SMTP (Email)
| Variable | Used In | Evidence |
|----------|---------|----------|
| `SMTP_HOST` | `src/server/email/mailer.ts:6` | SMTP server hostname |
| `SMTP_PORT` | `src/server/email/mailer.ts:7` | SMTP port (default: 587) |
| `SMTP_USER` | `src/server/email/mailer.ts:10` | **SENSITIVE** - SMTP username |
| `SMTP_PASS` | `src/server/email/mailer.ts:11` | **SENSITIVE** - SMTP password |
| `FROM_EMAIL` | `src/server/email/mailer.ts:36,165` | Sender email address |

### Cloudflare Turnstile
| Variable | Used In | Evidence |
|----------|---------|----------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `app/api/admin/login/route.ts:87` | Client-side site key |
| `TURNSTILE_SECRET_KEY` | `app/api/admin/login/route.ts:70` | **SENSITIVE** - Server verification |

### Application
| Variable | Used In | Evidence |
|----------|---------|----------|
| `NEXT_PUBLIC_BASE_URL` | `app/api/auth/request-magic-link/route.ts:12,93` | Base URL for links |
| `NEXT_PUBLIC_SITE_URL` | `app/api/admin/allowlist/upsert/route.ts:50` | Site URL for emails |
| `NODE_ENV` | `app/api/admin/login/route.ts:72`, `src/server/admin/session.ts:55` | Environment mode |
| `COMPANY_NAME` | `app/api/quiz/finish/route.ts:203` | Company name in emails |
| `TEMPLATE_PATH` | `src/lib/services/pdf-generator.ts:46,54` | PDF template location |

---

## 4. Cookies

### Admin Session Cookie

| Name | Set In | Flags | Evidence |
|------|--------|-------|----------|
| `admin_session` | `src/server/admin/session.ts:51-59` | `httpOnly: true`, `secure: NODE_ENV=production`, `sameSite: 'lax'`, `path: '/'` | Lines 51-59 |

**Details:**
```typescript
// src/server/admin/session.ts:51-59
store.set({
  name: COOKIE_NAME,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: ttlMinutes * 60,
})
```

**Notes:**
- HMAC-signed with `ADMIN_SESSION_SECRET` using SHA-256
- Contains: `{ u: username, exp: epochMs }`
- Verified with `crypto.timingSafeEqual()` for timing-attack resistance
- Evidence: `src/server/admin/session.ts:33`

---

## 5. External Calls

### 5.1 Supabase (Database + Auth + Storage)

| Operation | Used In | Evidence |
|-----------|---------|----------|
| `supabase.auth.getUser(token)` | Multiple user routes | `app/api/quiz/finish/route.ts:56` |
| `supabase.auth.signInWithOtp()` | Magic link | `app/api/auth/request-magic-link/route.ts:117` |
| `supabaseAdmin.auth.admin.listUsers()` | Candidate creation | `app/api/auth/request-magic-link/route.ts:152` |
| `supabaseAdmin.from('*').select/insert/update/upsert` | All DB operations | Multiple routes |
| `supabaseAdmin.storage.from('quiz-docs')` | PDF upload/download | `app/api/quiz/finish/route.ts:156-168` |
| `supabaseAdmin.storage.from('quiz-docs').createSignedUrl()` | Signed PDF URLs | `app/api/documents/signed-url/route.ts:50` |

### 5.2 SMTP (Nodemailer)

| Operation | Used In | Evidence |
|-----------|---------|----------|
| `transporter.sendMail()` | Send rapport email | `src/server/email/mailer.ts:45` |
| `transporter.sendMail()` | Send allowlist invitation | `src/server/email/mailer.ts:173` |

**Config:**
```typescript
// src/server/email/mailer.ts:5-13
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})
```

### 5.3 Cloudflare Turnstile

| Operation | Used In | Evidence |
|-----------|---------|----------|
| `fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify')` | Admin login CAPTCHA | `app/api/admin/login/route.ts:94-98` |

**Details:**
```typescript
// app/api/admin/login/route.ts:94-98
const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: form.toString(),
})
```

### 5.4 Puppeteer (PDF Generation)

| Operation | Used In | Evidence |
|-----------|---------|----------|
| `puppeteer.launch()` | PDF rendering | `src/lib/services/pdf-generator.ts:147-157` |
| `page.goto(file://)` | Load HTML template | `src/lib/services/pdf-generator.ts:169` |
| `page.pdf()` | Generate PDF buffer | `src/lib/services/pdf-generator.ts:474-481` |

**Puppeteer Args:**
```typescript
// src/lib/services/pdf-generator.ts:149-156
args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--allow-file-access-from-files',
  '--enable-local-file-accesses',
  '--disable-web-security',  // ⚠️ SECURITY CONCERN
  '--font-render-hinting=medium'
]
```

### 5.5 Client-Side Fetch Calls

| Target | Used In | Evidence |
|--------|---------|----------|
| `/api/auth/allowlist-check` | Login page | `app/login/page.tsx` |
| `/api/auth/request-magic-link` | Login page | `app/login/page.tsx` |
| `/api/candidates/create` | Quiz page | `app/quiz/page.tsx` |
| `/api/quiz/attempt/create` | Quiz page | `app/quiz/page.tsx` |
| `/api/quiz/heartbeat` | Quiz page (30s interval) | `app/quiz/page.tsx` |
| `/api/compute` | Quiz page | `app/quiz/page.tsx` |
| `/api/answers` | Quiz page | `app/quiz/page.tsx` |
| `/api/quiz/finish` | Quiz page | `app/quiz/page.tsx` |
| `/api/public/maintenance-status` | Quiz page | `app/quiz/page.tsx` |
| `/api/admin/*` | Admin pages | `app/admin/(protected)/*` |

---

## 6. Database Tables Used

| Table | Used By | Operations |
|-------|---------|------------|
| `admin_users` | Admin login, 2FA | SELECT, UPDATE |
| `admin_events` | Audit logging | INSERT, SELECT |
| `admin_settings` | Maintenance mode | SELECT, UPSERT |
| `allowlist` | Access control | SELECT, INSERT, UPDATE, UPSERT |
| `candidates` | User profiles | SELECT, INSERT |
| `quiz_attempts` | Quiz sessions | SELECT, INSERT, UPDATE |
| `answers` | Quiz answers | SELECT, INSERT, UPDATE |
| `quiz_activity` | Heartbeat tracking | UPSERT, SELECT |
| `notifications` | System notifications | INSERT, SELECT |
| `quizzes` | Quiz catalog | SELECT |

---

## 7. Summary Statistics

- **Total API Routes**: 38
- **Admin Routes**: 25 (require session cookie)
- **User Routes**: 10 (require Supabase JWT)
- **Public Routes**: 3 (no auth)
- **Sensitive Env Vars**: 5 (service key, session secret, SMTP creds, Turnstile secret)
- **Cookies**: 1 (admin_session with proper flags)
- **External Services**: 4 (Supabase, SMTP, Turnstile, Puppeteer)
