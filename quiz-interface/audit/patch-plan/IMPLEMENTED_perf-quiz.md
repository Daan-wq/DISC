# Quiz Performance Optimizations Implementation

> **Implemented**: 2024-12-18  
> **Finding**: M7 (Excessive DB writes), L9 (Polling overhead)  
> **Status**: Complete

---

## Summary

Implemented performance optimizations to reduce database writes and server load:
- Duplicate write prevention using refs to track last saved state
- Increased debounce intervals for autosave operations
- Adaptive heartbeat interval with backoff for long sessions
- Added telemetry counters for monitoring

---

## Changes Made

### 1. Duplicate Write Prevention

**File**: `app/quiz/page.tsx`

Added refs to track last saved state:

```typescript
// Performance: Track last saved state to prevent duplicate writes
const lastSavedAnswersRef = useRef<string>('')
const lastSavedQuestionRef = useRef<number>(-1)
const saveCountRef = useRef({ answers: 0, progress: 0, heartbeat: 0, skipped: 0 })
```

**Answers Save**:
```typescript
const answersHash = letters.join('')

// Skip if nothing changed since last save
if (answersHash === lastSavedAnswersRef.current) {
  saveCountRef.current.skipped++
  return
}
// ... save and update ref
lastSavedAnswersRef.current = answersHash
```

**Progress Save**:
```typescript
// Skip if nothing changed since last save
if (questionNumber === lastSavedQuestionRef.current) {
  return
}
// ... save and update ref
lastSavedQuestionRef.current = questionNumber
```

### 2. Increased Debounce Intervals

| Operation | Before | After | Reduction |
|-----------|--------|-------|-----------|
| Answers save | 1000ms | 1500ms | -33% writes |
| Progress save | 500ms | 1000ms | -50% writes |

**Rationale**: Users typically don't need sub-second persistence. The increased intervals still provide good UX while significantly reducing DB load.

### 3. Adaptive Heartbeat Interval

**Before**: Fixed 30-second interval for entire session

**After**: Adaptive interval with backoff:
- First 5 beats: 30 seconds (2.5 minutes)
- After 5 beats: 60 seconds

```typescript
// Adaptive interval: 30s for first 5 beats, then 60s
// This reduces long-session load by ~50% while maintaining activity detection
const scheduleNext = () => {
  if (stopped) return
  const interval = beatCount < 5 ? 30000 : 60000
  timer = setTimeout(() => {
    if (!stopped) {
      void beat().then(scheduleNext)
    }
  }, interval)
}
```

**Impact for 30-minute session**:
- Before: 60 heartbeats
- After: 5 + 25 = 30 heartbeats (-50%)

### 4. Telemetry Counters

Added counters for monitoring performance:

```typescript
saveCountRef.current = { answers: 0, progress: 0, heartbeat: 0, skipped: 0 }
```

Logged on each save:
```
[answers-save] Saved 48 answers (total: 3 skipped: 12)
```

This allows monitoring:
- How many saves actually happen
- How many are skipped due to no changes
- Heartbeat count per session

### 5. QUIZ_ID Constant

**File**: `app/api/quiz/heartbeat/route.ts`

Changed from hardcoded value to constant:

```typescript
import { QUIZ_ID } from '@/lib/constants'
```

---

## Performance Impact

### Expected Reduction in DB Writes

| Operation | Scenario | Before | After | Reduction |
|-----------|----------|--------|-------|-----------|
| **Answers** | User clicks same answer | 1 write | 0 writes | -100% |
| **Answers** | Fast navigation | 1 write/sec | 1 write/1.5s | -33% |
| **Progress** | Fast navigation | 1 write/0.5s | 1 write/1s | -50% |
| **Heartbeat** | 30-min session | 60 beats | 30 beats | -50% |

### Overall Estimate

For a typical 20-minute quiz session:
- **Before**: ~150 DB operations
- **After**: ~60-80 DB operations
- **Reduction**: ~50%

---

## Verification

### Check Console Logs

During quiz, look for:
```
[answers-save] Saved 48 answers (total: 3 skipped: 12)
```

The `skipped` count shows duplicate prevention working.

### Monitor Heartbeat Interval

After 2.5 minutes, heartbeat interval should increase from 30s to 60s.

### Supabase Dashboard

Check `quiz_activity` table write frequency before/after deployment.

---

## Files Modified

| File | Change |
|------|--------|
| `app/quiz/page.tsx` | Added useRef, duplicate prevention, telemetry |
| `app/api/quiz/heartbeat/route.ts` | Use QUIZ_ID constant |

---

## Commits

```
perf(quiz): add duplicate write prevention + increased debounce (C5)
perf(quiz): add adaptive heartbeat interval with backoff (C5)
refactor(api): use QUIZ_ID constant in heartbeat route (C5)
```
