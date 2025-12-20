# Frontend Quiz Page Audit — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **File**: `app/quiz/page.tsx` (1268 lines)  
> **Focus**: Performance, re-renders, autosave, offline handling, heartbeat polling

---

## 1. Component Overview

### 1.1 File Statistics

| Metric | Value | Assessment |
|--------|-------|------------|
| **Lines of code** | 1268 | Too large for single component |
| **State variables** | 18 | High complexity |
| **useEffect hooks** | 13 | Re-render risk |
| **Event listeners** | 6 | Need cleanup verification |
| **Inline statements array** | 96 items (~100 lines) | Bundle bloat |

### 1.2 State Variables

```typescript
const [checkingAuth, setCheckingAuth] = useState(true)
const [allowCheck, setAllowCheck] = useState<null | boolean>(null)
const [candidateId, setCandidateId] = useState<string | null>(null)
const [personalData, setPersonalData] = useState<PersonalData | null>(null)
const [currentQuestion, setCurrentQuestion] = useState(0)
const [answers, setAnswers] = useState<QuizAnswer[]>([])
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)
const [showThankYou, setShowThankYou] = useState(false)
const [noAccess, setNoAccess] = useState(false)
const [candidateStatus, setCandidateStatus] = useState<...>('idle')
const [fatalDetails, setFatalDetails] = useState<...>(null)
const [isOnline, setIsOnline] = useState(true)
const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false)
const [sessionTimeoutSeconds, setSessionTimeoutSeconds] = useState(0)
const [retryKey, setRetryKey] = useState(0)
const [maintenanceMode, setMaintenanceMode] = useState(false)
```

---

## 2. Autosave Analysis

### 2.1 Answer Autosave

**Location**: Lines 588-628

```typescript
useEffect(() => {
  const saveAnswers = async () => {
    // ... save logic
  }
  const timer = setTimeout(saveAnswers, 1000) // 1s debounce
  return () => clearTimeout(timer)
}, [answers, statements])
```

| Aspect | Status | Notes |
|--------|--------|-------|
| **Debounce** | ✅ 1000ms | Reasonable interval |
| **Dependency array** | ⚠️ | Includes `statements` (constant) - unnecessary |
| **Double writes** | ⚠️ | No de-duplication if same answers |
| **Conflict resolution** | ❌ | Server overwrites without checking version |
| **Offline handling** | ❌ | Fails silently when offline |

**Finding M1**: Autosave lacks conflict resolution - rapid saves could cause race conditions on server.

### 2.2 Progress Autosave (Current Question)

**Location**: Lines 631-669

```typescript
useEffect(() => {
  const saveProgress = async () => {
    // ... save current question
  }
  const timer = setTimeout(saveProgress, 500) // 500ms debounce
  return () => clearTimeout(timer)
}, [currentQuestion])
```

| Aspect | Status | Notes |
|--------|--------|-------|
| **Debounce** | ✅ 500ms | Good for question navigation |
| **Auth token fetch** | ⚠️ | Gets token inside debounce (could be stale) |
| **Error handling** | ⚠️ | Logs but doesn't retry |

**Finding L1**: Progress save fetches token inside debounced function - could use stale token if session refreshed.

---

## 3. localStorage vs DB Sync

### 3.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      localStorage Keys                          │
├─────────────────────────────────────────────────────────────────┤
│ candidateId      → Set after candidate creation                 │
│ personalData     → Set after candidate creation                 │
│ quizAttemptId    → Set after attempt creation                   │
│ quizId           → Set after attempt creation                   │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Tables                             │
├─────────────────────────────────────────────────────────────────┤
│ candidates       → id, user_id, email, full_name                │
│ quiz_attempts    → id, user_id, quiz_id, current_question       │
│ answers          → attempt_id, candidate_id, payload            │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Race Conditions Identified

| Scenario | Risk | Evidence |
|----------|------|----------|
| **Multi-tab** | HIGH | Same user opens quiz in 2 tabs - both write to same attempt | 
| **Stale localStorage** | MEDIUM | Old candidateId cached after admin deletion | Lines 179-189 |
| **Online/offline toggle** | LOW | No queue for offline saves | Lines 715-730 |

**Finding M2**: No multi-tab detection - user could corrupt their own data by opening quiz twice.

### 3.3 localStorage Cleanup

**Current behavior** (Lines 179-189):
```typescript
// Always clear old candidate data and create fresh one
localStorage.removeItem('candidateId')
localStorage.removeItem('personalData')
localStorage.removeItem('quizAttemptId')
localStorage.removeItem('quizId')
```

**Assessment**: Good - clears stale data on each load. But still vulnerable to multi-tab race.

---

## 4. Event Listeners Cleanup

| Listener | Added | Removed | Status |
|----------|-------|---------|--------|
| `beforeunload` | Line 711 | Line 712 | ✅ |
| `online` | Line 720 | Line 726 | ✅ |
| `offline` | Line 721 | Line 727 | ✅ |
| `keydown` | Line 860 | Line 861 | ✅ |
| `attemptCreated` (custom) | Line 579 | Line 583 | ✅ |

**Assessment**: All event listeners properly cleaned up in useEffect return functions.

---

## 5. Heartbeat Polling

### 5.1 Current Implementation

**Location**: Lines 672-698

```typescript
useEffect(() => {
  let timer: any
  let stopped = false
  ;(async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    async function beat() {
      try {
        await fetch('/api/quiz/heartbeat', { ... })
      } catch {}
    }
    await beat() // Initial beat
    timer = setInterval(() => { if (!stopped) void beat() }, 30000)
  })()
  return () => { stopped = true; if (timer) clearInterval(timer) }
}, [])
```

| Aspect | Status | Notes |
|--------|--------|-------|
| **Interval** | ✅ 30s | Acceptable for activity tracking |
| **Token refresh** | ❌ | Token fetched once, never refreshed |
| **Backoff** | ❌ | No exponential backoff on failure |
| **Server load** | ✅ | ~120 requests/hour per user |
| **Cleanup** | ✅ | Interval cleared on unmount |

**Finding M3**: Heartbeat uses stale token - will fail silently after session refresh/expiry.

### 5.2 Session Timeout Check

**Location**: Lines 733-771

```typescript
timer = setInterval(checkSession, 30000) // Every 30s
```

| Aspect | Status | Notes |
|--------|--------|-------|
| **Interval** | ✅ | Same as heartbeat (30s) |
| **Warning threshold** | ✅ | 5 minutes before expiry |
| **Refresh action** | ✅ | `supabase.auth.refreshSession()` |

---

## 6. Re-render Analysis

### 6.1 useEffect Dependencies

| Effect | Dependencies | Runs On | Risk |
|--------|--------------|---------|------|
| Maintenance check | `[]` | Mount only | ✅ None |
| Auth guard | `[router]` | Mount + router change | ✅ Low |
| Allowlist check | `[checkingAuth, router]` | Auth complete | ✅ Low |
| Candidate creation | `[checkingAuth, allowCheck, candidateId, search, retryKey]` | Multiple | ⚠️ Complex |
| Attempt creation | `[checkingAuth, allowCheck, candidateStatus, candidateId]` | Multiple | ⚠️ Complex |
| Load progress | `[]` | Mount only | ✅ None |
| Save answers | `[answers, statements]` | Every answer change | ⚠️ Frequent |
| Save progress | `[currentQuestion]` | Every question change | ⚠️ Frequent |
| Heartbeat | `[]` | Mount only | ✅ None |
| beforeunload | `[candidateStatus, answers.length, showThankYou, isSubmitting]` | State changes | ⚠️ Frequent |
| Online/offline | `[]` | Mount only | ✅ None |
| Session timeout | `[]` | Mount only | ✅ None |
| Countdown timer | `[sessionTimeoutWarning, sessionTimeoutSeconds]` | Every second (when warning) | ⚠️ |
| Keyboard nav | `[currentQuestion, answers]` | Every question/answer | ⚠️ Frequent |

**Finding M4**: `handleAnswer` triggers cascade: `setAnswers` → save effect → `setCurrentQuestion` → progress effect. This causes 3+ renders per answer.

### 6.2 Console Logging in Render

**Location**: Lines 1117-1121, 1144, 1151, 1203

```typescript
console.log('[render] currentQuestion:', currentQuestion, ...)
console.log('[render] answers:', answers)
```

**Finding L2**: Debug logging in render path - performance impact in production.

---

## 7. Bundle Size Analysis

### 7.1 Inline Data

| Data | Lines | Size Estimate |
|------|-------|---------------|
| `statements` array | 14-111 | ~4.5 KB |
| Component code | 119-1249 | ~35 KB |

**Finding L3**: Statements array (96 items) is embedded inline. Could be moved to separate file for better code splitting.

### 7.2 Imports Analysis

```typescript
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Progress from '@/components/Progress'
import ErrorWall from '@/components/ErrorWall'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { type PersonalData, type QuizAnswer } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import { submitAnswers } from '@/lib/answers'
import { QUIZ_ID } from '@/lib/constants'
```

**Assessment**: Clean imports, no obvious bundle bloat from dependencies.

---

## 8. Findings Summary

### Critical (0)
None.

### High (0)
None.

### Medium (4)

| ID | Finding | Impact | Fix |
|----|---------|--------|-----|
| **M1** | Autosave lacks conflict resolution | Data corruption on rapid saves | Add version/timestamp check |
| **M2** | No multi-tab detection | User can corrupt own data | Add `BroadcastChannel` or lock |
| **M3** | Heartbeat uses stale token | Silent failures after 1hr | Re-fetch token before each beat |
| **M4** | Render cascade on answer | 3+ renders per click | Batch state updates |

### Low (3)

| ID | Finding | Impact | Fix |
|----|---------|--------|-----|
| **L1** | Progress save fetches token inside debounce | Stale token possible | Fetch token outside debounce |
| **L2** | Debug console.log in render | Performance overhead | Remove or feature-flag |
| **L3** | Statements array inline | Bundle size | Move to separate file |

---

## 9. Refactor Plan: Split into Modules

### Proposed Structure

```
app/quiz/
├── page.tsx                    # Main page wrapper (50 lines)
├── components/
│   ├── QuizContainer.tsx       # Main quiz logic container
│   ├── QuestionCard.tsx        # Single question display
│   ├── OfflineBanner.tsx       # Offline status banner
│   └── SessionWarning.tsx      # Session timeout warning
├── hooks/
│   ├── useQuizAuth.ts          # Auth guard + allowlist check
│   ├── useQuizProgress.ts      # Load/save progress + answers
│   ├── useHeartbeat.ts         # Heartbeat polling
│   ├── useOnlineStatus.ts      # Online/offline detection
│   └── useSessionTimeout.ts    # Session expiry warning
└── data/
    └── statements.ts           # Quiz statements array
```

### Module Breakdown

#### Module 1: `useQuizAuth.ts` (~150 lines)

**Responsibilities**:
- Auth guard (redirect if not logged in)
- Allowlist check
- Candidate creation/lookup

**State exported**:
```typescript
interface UseQuizAuthReturn {
  isLoading: boolean
  isAuthorized: boolean
  candidateId: string | null
  personalData: PersonalData | null
  error: { code: string; message: string } | null
  retry: () => void
}
```

#### Module 2: `useQuizProgress.ts` (~200 lines)

**Responsibilities**:
- Load quiz attempt + answers on mount
- Autosave answers (debounced)
- Autosave current question (debounced)
- localStorage sync

**State exported**:
```typescript
interface UseQuizProgressReturn {
  currentQuestion: number
  setCurrentQuestion: (q: number) => void
  answers: QuizAnswer[]
  addAnswer: (answer: QuizAnswer) => void
  isLoading: boolean
  isSaving: boolean
}
```

#### Module 3: `useHeartbeat.ts` (~50 lines)

**Responsibilities**:
- Periodic heartbeat to server
- Token refresh before each beat
- Backoff on failure

```typescript
function useHeartbeat(intervalMs: number = 30000): void
```

#### Module 4: `useOnlineStatus.ts` (~30 lines)

**Responsibilities**:
- Track navigator.onLine
- Event listener cleanup

```typescript
function useOnlineStatus(): boolean
```

#### Module 5: `useSessionTimeout.ts` (~80 lines)

**Responsibilities**:
- Check session expiry
- Show warning at 5 min remaining
- Countdown timer
- Refresh session action

```typescript
interface UseSessionTimeoutReturn {
  isWarning: boolean
  secondsRemaining: number
  refreshSession: () => Promise<void>
}
```

#### Module 6: `data/statements.ts` (~100 lines)

**Content**:
```typescript
export interface Statement {
  id: number
  text: string
  discOrder: string[]
}

export const STATEMENTS: Statement[] = [
  // ... 96 statements
]
```

---

## 10. Quick Wins (Implement Now)

### Quick Win 1: Remove Debug Logging

```typescript
// REMOVE these lines (1117-1121, 1144, 1151, 1203):
console.log('[render] currentQuestion:', ...)
console.log('[render] answers:', answers)
```

**Impact**: Reduces re-render overhead, cleaner console in production.

### Quick Win 2: Fix Dependency Arrays

```typescript
// Line 628 - remove `statements` (it's a constant)
}, [answers, statements])
// Change to:
}, [answers])
```

### Quick Win 3: Extract Statements Array

```typescript
// Create src/lib/data/quiz-statements.ts
export const QUIZ_STATEMENTS: Statement[] = [...]

// In page.tsx:
import { QUIZ_STATEMENTS } from '@/lib/data/quiz-statements'
```

**Impact**: Better code organization, potential code splitting benefit.

### Quick Win 4: Add Multi-Tab Lock (Simple Version)

```typescript
// Add at top of QuizInner:
useEffect(() => {
  const lockKey = 'quiz-tab-lock'
  const tabId = Math.random().toString(36).slice(2)
  
  // Try to acquire lock
  const existingLock = localStorage.getItem(lockKey)
  if (existingLock && existingLock !== tabId) {
    const lockTime = parseInt(localStorage.getItem(lockKey + '-time') || '0')
    // Lock expires after 5 minutes of inactivity
    if (Date.now() - lockTime < 5 * 60 * 1000) {
      setError('Quiz is al geopend in een ander tabblad')
      return
    }
  }
  
  localStorage.setItem(lockKey, tabId)
  localStorage.setItem(lockKey + '-time', Date.now().toString())
  
  // Refresh lock periodically
  const timer = setInterval(() => {
    localStorage.setItem(lockKey + '-time', Date.now().toString())
  }, 30000)
  
  return () => {
    clearInterval(timer)
    if (localStorage.getItem(lockKey) === tabId) {
      localStorage.removeItem(lockKey)
      localStorage.removeItem(lockKey + '-time')
    }
  }
}, [])
```

### Quick Win 5: Fix Heartbeat Token Refresh

```typescript
// In heartbeat effect, fetch fresh token each beat:
async function beat() {
  try {
    const { data } = await supabase.auth.getSession()
    const freshToken = data.session?.access_token
    if (!freshToken) return
    
    await fetch('/api/quiz/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshToken}`
      },
      body: JSON.stringify({})
    })
  } catch {}
}
```

---

## 11. Test Scenarios

### 11.1 Autosave Tests

```
Scenario 1: Rapid Answer Changes
1. Answer question 1
2. Immediately go back
3. Change answer
4. Check DB has correct final answer

Scenario 2: Offline Save
1. Go offline (DevTools)
2. Answer 5 questions
3. Go online
4. Verify answers saved to DB
```

### 11.2 Multi-Tab Tests

```
Scenario 1: Concurrent Tabs
1. Open quiz in Tab A
2. Answer 3 questions
3. Open quiz in Tab B (same user)
4. Answer 2 questions in Tab B
5. Return to Tab A
6. Verify no data corruption
```

### 11.3 Session Timeout Tests

```
Scenario 1: Session Expiry Warning
1. Start quiz
2. Wait until session has <5 minutes
3. Verify warning appears
4. Click "Verlengen"
5. Verify warning disappears
```

---

## 12. Evidence Index

| File | Lines | Relevant For |
|------|-------|--------------|
| `app/quiz/page.tsx` | 1-118 | Statements array, imports |
| `app/quiz/page.tsx` | 119-150 | State declarations |
| `app/quiz/page.tsx` | 588-628 | Answer autosave |
| `app/quiz/page.tsx` | 631-669 | Progress autosave |
| `app/quiz/page.tsx` | 672-698 | Heartbeat polling |
| `app/quiz/page.tsx` | 701-713 | beforeunload listener |
| `app/quiz/page.tsx` | 715-730 | Online/offline detection |
| `app/quiz/page.tsx` | 733-782 | Session timeout |
| `app/quiz/page.tsx` | 800-862 | Keyboard navigation |
| `app/quiz/page.tsx` | 864-913 | handleAnswer function |
| `app/quiz/page.tsx` | 923-1048 | submitQuiz function |
| `src/lib/answers.ts` | 1-30 | Answer submission helper |
| `src/components/Progress.tsx` | 1-23 | Progress bar component |
