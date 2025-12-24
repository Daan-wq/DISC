# Deploy Checklist - PDF Processing Fix

## Changes Made

### 1. Fix 401 on `/api/quiz/answers/save`
- **File**: `app/quiz/page.tsx`
- **Change**: Added Authorization header to saveAnswers fetch call
- **Root cause**: Client was not sending Bearer token while endpoint required it

### 2. New PDF Processing State Machine
- **Migration**: `supabase/sql/12_add_pdf_processing_status.sql`
- **New columns on `quiz_attempts`**:
  - `pdf_status` (text): `'pending'` | `'processing'` | `'done'` | `'failed'`
  - `processing_started_at` (timestamptz): When processing started
  - `processing_token` (text): Unique token for the claim
  - `pdf_error` (text): Error message if failed

### 3. Refactored `/api/quiz/finish`
- **File**: `app/api/quiz/finish/route.ts`
- **Changes**:
  - New TTL-based claim logic (3 min timeout for stale locks)
  - Uses `pdf_status` instead of `finished_at` for locking
  - Returns 202 with Retry-After instead of 409 when processing
  - Sets `pdf_status='failed'` on errors for retry

### 4. PDF Rendering Optimization
- **File**: `src/lib/services/pdf-generator.ts`
- **Changes**:
  - Changed `waitUntil: 'networkidle0'` to `waitUntil: 'load'` (faster)
  - Added timing logs: browser launch, render, merge

---

## Supabase Migration Steps

Run the migration in Supabase SQL Editor:

```sql
-- Copy contents of supabase/sql/12_add_pdf_processing_status.sql
```

Or run via CLI:
```bash
supabase db push
```

---

## Vercel Settings

### Required Environment Variables
| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Already configured |
| `QUIZ_SITE_URL` | `https://disc-quiz-interface.vercel.app` |

### Optional (for Browserless fallback)
| Variable | Description |
|----------|-------------|
| `BROWSERLESS_WS_URL` | WebSocket URL for remote browser (e.g., `wss://chrome.browserless.io?token=YOUR_TOKEN`) |

### Function Configuration
- `maxDuration = 60` requires **Vercel Pro** plan
- If on Hobby plan, PDF generation may timeout

---

## Verification Checklist

### After Deploy:

1. **Test answers/save (no more 401)**:
   - Start quiz, answer a few questions
   - Check Vercel logs: `[answers-save] Auth check - hasAuthHeader: true hasToken: true`

2. **Test PDF generation**:
   - Complete quiz
   - Check Vercel logs for timing:
     ```
     [pdf] Browser launched in XXXms
     [pdf] All pages rendered in XXXms
     [pdf] PDF merged in XXXms, total: XXXms
     ```

3. **Test idempotency**:
   - Call finish twice for same attempt
   - Second call should return `cached: true`

4. **Test stale lock recovery**:
   - If previous request timed out, new request should claim after 3 min

---

## Rollback

If issues occur:

1. Revert the code changes (git revert)
2. Migration is additive (new columns), no rollback needed
3. Existing data is unaffected (new columns default to pending)

---

## Monitoring

Check these log patterns in Vercel:

- `[answers-save] Auth check` - Verify token is present
- `[finish] pdf_status:` - Current state before processing
- `[finish] Successfully claimed processing lock` - Lock acquired
- `[pdf] Browser launched in` - Chromium startup time
- `[pdf] total:` - Total PDF generation time
