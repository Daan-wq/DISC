# API Validation & Idempotency Implementation

> **Implemented**: 2024-12-18  
> **Finding**: M3, M4 (Race condition, no idempotency)  
> **Status**: Complete

---

## Summary

Implemented comprehensive input validation and idempotency for write endpoints:
- Added Zod schemas to all write endpoints
- Implemented idempotency guard for `/api/quiz/finish`
- Fixed hardcoded QUIZ_ID references to use constants
- Fixed auth bug in attempt/update route

---

## Changes Made

### 1. `/api/quiz/finish` - Idempotency Guard (P5)

**Already implemented in Phase 1**, this is the core idempotency mechanism:

```typescript
// Idempotency guard: if PDF already exists, return cached result
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
  .is('finished_at', null)  // Only if not already set
  .select('id')
  .maybeSingle()

if (!claimed) {
  // Race condition handling...
}
```

**Behavior**:

| Scenario | Result |
|----------|--------|
| First call | PDF generated, stored, returned |
| Second call (PDF exists) | Cached result returned immediately |
| Concurrent calls | First wins, others wait and get cached |
| Concurrent calls (race) | 409 Conflict with retry hint |

### 2. `/api/candidates/create` - Zod Validation

**File**: `app/api/candidates/create/route.ts`

```typescript
import { z } from 'zod'
import { QUIZ_ID } from '@/lib/constants'

const BodySchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
})
```

**Changes**:
- Added Zod schema for input validation
- Changed hardcoded QUIZ_ID to use `@/lib/constants`
- Improved logging

### 3. `/api/quiz/attempt/create` - Constants Fix

**File**: `app/api/quiz/attempt/create/route.ts`

```typescript
import { QUIZ_ID } from '@/lib/constants'
```

**Changes**:
- Changed hardcoded QUIZ_ID to use constant

### 4. `/api/quiz/attempt/update` - Zod + Auth Fix

**File**: `app/api/quiz/attempt/update/route.ts`

```typescript
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

const BodySchema = z.object({
  attemptId: z.string().uuid(),
  currentQuestion: z.number().int().min(1).max(96),
})
```

**Changes**:
- Added Zod schema with UUID and range validation
- Fixed auth to use `supabase.auth.getUser()` instead of `supabaseAdmin.auth.getUser()`
- Simplified validation logic

---

## Validation Summary

| Route | Method | Zod Schema | Auth | Idempotent |
|-------|--------|------------|------|------------|
| `/api/quiz/finish` | POST | Yes | Bearer token | Yes |
| `/api/quiz/answers/save` | POST | Yes | Bearer token | N/A (upsert) |
| `/api/answers` | POST | Yes | Bearer token | N/A (upsert) |
| `/api/candidates/create` | POST | Yes | Bearer token | Yes (DB constraint) |
| `/api/quiz/attempt/create` | POST | No (empty body) | Bearer token | Yes (DB constraint) |
| `/api/quiz/attempt/update` | PATCH | Yes | Bearer token | Yes (idempotent update) |

---

## Idempotency Patterns Used

### 1. Database Unique Constraints

For `candidates/create` and `attempt/create`:
- Insert with unique constraint
- On conflict (23505), fetch existing record
- Return same result for repeated calls

### 2. Optimistic Locking

For `quiz/finish`:
- Update with `.is('finished_at', null)` condition
- Only first request wins
- Subsequent requests get cached result or 409

### 3. Upsert

For `answers/save`:
- Uses ON CONFLICT DO UPDATE
- Same input = same output

---

## Verification

### Test: Finish Idempotency

```bash
# First call - generates PDF
curl -X POST http://localhost:3000/api/quiz/finish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"attempt_id":"..."}'
# Returns: { "ok": true, "storage_path": "...", "cached": false }

# Second call - returns cached
curl -X POST http://localhost:3000/api/quiz/finish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"attempt_id":"..."}'
# Returns: { "ok": true, "storage_path": "...", "cached": true }
```

### Test: Validation Rejection

```bash
# Invalid UUID
curl -X PATCH http://localhost:3000/api/quiz/attempt/update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"attemptId":"not-a-uuid","currentQuestion":5}'
# Returns: 400 { "error": "Invalid payload" }

# Invalid question number
curl -X PATCH http://localhost:3000/api/quiz/attempt/update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"attemptId":"valid-uuid","currentQuestion":999}'
# Returns: 400 { "error": "Invalid payload" }
```

---

## Files Modified

| File | Change |
|------|--------|
| `app/api/quiz/finish/route.ts` | Idempotency guard (already in P5) |
| `app/api/candidates/create/route.ts` | Zod schema + constants |
| `app/api/quiz/attempt/create/route.ts` | Constants import |
| `app/api/quiz/attempt/update/route.ts` | Zod schema + auth fix |

---

## Commits

```
fix(api): add Zod validation to candidates/create (C3)
fix(api): use QUIZ_ID constant in attempt routes (C3)
fix(api): add Zod validation + fix auth in attempt/update (C3)
```
