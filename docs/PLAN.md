# Data Consistency Fix: Allowlist Frontend ↔ Database Sync

Eliminate hidden database state by ensuring the admin dashboard always shows the complete allowlist, preventing upsert conflicts from invisible 'revoked' records.

---

## Problem Statement

**Root Cause:** The allowlist search API filters out 'revoked' records by default (line 22: `query.in('status', ['pending', 'claimed', 'used'])`), creating a situation where:
1. Database contains a record (status: 'revoked')
2. Admin dashboard doesn't show it (filtered out)
3. Admin tries to upsert same email
4. Database rejects with conflict error
5. Admin sees "Upsert failed" with no explanation

**Impact:** Admin cannot see full database state, leading to misleading errors and confusion about what records exist.

---

## Architecture Principle

**Single Source of Truth:** Database is the only source of truth. Frontend must reflect 100% of database state, with filters applied **transparently** (user knows what's hidden).

```
┌─────────────────────────────────────────────────────┐
│ DATABASE (allowlist table)                          │
│ - Contains ALL records (pending/claimed/used/revoked)│
└────────────────┬────────────────────────────────────┘
                 │ NO hidden filtering
                 ▼
┌─────────────────────────────────────────────────────┐
│ Backend API (/api/admin/allowlist/search)           │
│ - Returns ALL records by default                    │
│ - Only filters when status param explicitly set     │
│ - Returns descriptive errors with conflict details  │
└────────────────┬────────────────────────────────────┘
                 │ Full data
                 ▼
┌─────────────────────────────────────────────────────┐
│ Frontend (allowlist/page.tsx)                       │
│ - Shows ALL records by default                      │
│ - Filters are opt-in and visible to admin           │
│ - Clear indication when filters active              │
│ - Re-fetches after every mutation                   │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Backend - Remove Hidden Filtering

**File:** `apps/admin/app/api/admin/allowlist/search/route.ts`

**Changes:**
1. **Line 19-23:** Remove default status filter
   ```typescript
   // BEFORE (hides revoked records)
   if (status) {
     query = query.eq('status', status)
   } else {
     query = query.in('status', ['pending', 'claimed', 'used'])
   }
   
   // AFTER (shows all by default)
   if (status) {
     query = query.eq('status', status)
   }
   // If no status param, return ALL records
   ```

2. **Line 31:** Enhance DB error with conflict details
   ```typescript
   // BEFORE
   if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
   
   // AFTER
   if (error) {
     console.error('[allowlist/search] DB error:', error)
     return NextResponse.json({ 
       error: 'DB error', 
       details: error.message,
       hint: error.hint 
     }, { status: 500 })
   }
   ```

**File:** `apps/admin/app/api/admin/allowlist/upsert/route.ts`

**Changes:**
1. **Line 55:** Return descriptive error on upsert conflict
   ```typescript
   // BEFORE
   if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
   
   // AFTER
   if (error) {
     console.error('[allowlist/upsert] DB error:', error)
     
     // Check for unique constraint violation (conflict)
     if (error.code === '23505') {
       return NextResponse.json({ 
         error: 'Record bestaat al. Gebruik "Reset" om de status te wijzigen.',
         conflict: true,
         details: error.message
       }, { status: 409 })
     }
     
     return NextResponse.json({ 
       error: `DB error: ${error.message}`,
       details: error.hint || error.details
     }, { status: 500 })
   }
   ```

2. **Line 35:** Show Zod validation details
   ```typescript
   // BEFORE
   if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
   
   // AFTER
   if (!parsed.success) {
     const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
     return NextResponse.json({ 
       error: `Ongeldige invoer: ${issues}`,
       validation_errors: parsed.error.issues
     }, { status: 400 })
   }
   ```

---

### Phase 2: Frontend - Show Full State & Parse Errors

**File:** `apps/admin/app/(protected)/allowlist/page.tsx`

**Changes:**

1. **Line 50-51:** Update default filter state
   ```typescript
   // BEFORE (implicit filtering)
   const [status, setStatus] = useState('')
   const [theme, setTheme] = useState('')
   
   // AFTER (explicit all-records default)
   const [status, setStatus] = useState('') // Empty = show all
   const [theme, setTheme] = useState('')
   const [showAllRecords, setShowAllRecords] = useState(true) // Track if filters active
   ```

2. **Line 110:** Parse actual error from response
   ```typescript
   // BEFORE
   if (!res.ok) throw new Error('Upsert failed')
   
   // AFTER
   if (!res.ok) {
     const data = await res.json().catch(() => ({}))
     const errorMsg = data.error || 'Upsert failed'
     
     // Show user-friendly message for conflicts
     if (res.status === 409 && data.conflict) {
       throw new Error(errorMsg + ' Tip: Zoek de gebruiker en gebruik "Reset".')
     }
     
     throw new Error(errorMsg)
   }
   ```

3. **Line 66-83:** Add filter state tracking in `load()`
   ```typescript
   async function load() {
     setLoading(true)
     try {
       const url = new URL('/api/admin/allowlist/search', window.location.origin)
       if (q) url.searchParams.set('q', q)
       if (status) url.searchParams.set('status', status)
       if (theme) url.searchParams.set('theme', theme)
       
       // Track if we're filtering
       setShowAllRecords(!q && !status && !theme)
       
       const res = await fetch(url.toString(), { credentials: 'include' })
       if (res.status === 401) {
         setMsg('Sessie verlopen. Ververs de pagina om opnieuw in te loggen.')
         return
       }
       const j = await res.json()
       setItems(j.items || [])
     } finally {
       setLoading(false)
     }
   }
   ```

4. **After line 262:** Add filter status indicator
   ```tsx
   {/* Add after PageHeader */}
   {!showAllRecords && (
     <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
       <div className="flex items-center gap-2 text-amber-800">
         <AlertTriangle className="h-5 w-5" />
         <span className="font-medium">Filters actief - niet alle records worden getoond</span>
       </div>
       <button
         onClick={() => {
           setQ('')
           setStatus('')
           setTheme('')
           load()
         }}
         className="mt-2 text-sm text-amber-700 hover:text-amber-900 underline"
       >
         Toon alle records
       </button>
     </div>
   )}
   ```

5. **Line 452-454:** Update status filter dropdown to include 'all'
   ```tsx
   <Select
     value={status}
     onChange={e => setStatus(e.target.value)}
     options={[
       { value: '', label: 'Alle status (inclusief revoked)' }, // Make it explicit
       { value: 'pending', label: 'Pending' },
       { value: 'claimed', label: 'Claimed' },
       { value: 'used', label: 'Used' },
       { value: 'revoked', label: 'Revoked' },
     ]}
   />
   ```

---

### Phase 3: Verification & Testing

**Test Scenarios:**

1. **Revoked Record Visibility:**
   - Create allowlist record
   - Revoke it via admin dashboard
   - Verify it still appears in list (with 'revoked' badge)
   - Verify filter dropdown works to show/hide revoked

2. **Upsert Conflict Handling:**
   - Create record for user@example.com
   - Revoke it
   - Try to add user@example.com again via upsert form
   - Expected: Clear error "Record bestaat al. Gebruik Reset..."
   - Verify error points to solution (Reset button)

3. **Filter Transparency:**
   - Apply status filter
   - Verify amber warning appears
   - Verify "Toon alle records" button clears filter
   - Verify record count accurate

4. **Mutation Sync:**
   - Perform upsert → verify list refreshes
   - Perform revoke → verify list refreshes
   - Perform reset → verify list refreshes
   - Perform bulk-import → verify list refreshes

---

## Files to Modify

| File | Lines | Changes |
|------|-------|---------|
| `apps/admin/app/api/admin/allowlist/search/route.ts` | 19-23, 31 | Remove default filter, enhance errors |
| `apps/admin/app/api/admin/allowlist/upsert/route.ts` | 35, 55 | Validation errors, conflict handling |
| `apps/admin/app/(protected)/allowlist/page.tsx` | 50-51, 66-83, 110, 262+, 452-454 | Parse errors, filter tracking, UI indicators |

---

## Success Criteria

- ✅ Admin dashboard shows ALL allowlist records by default (including revoked)
- ✅ Filters are opt-in and clearly indicated when active
- ✅ Upsert conflicts return HTTP 409 with actionable error message
- ✅ Validation errors show which field failed and why
- ✅ No hidden database state - what you see is what exists
- ✅ All mutations trigger immediate re-fetch from database
- ✅ Test scenarios pass

---

## Prevention Measures

**Backend:**
- Never apply implicit filters in API endpoints
- Always return conflict details in error responses
- Log all upsert conflicts with existing record status

**Frontend:**
- Require explicit filter selection (no hidden defaults)
- Show warning when filters active
- Display record counts: "Showing X records (Y total)"
- Re-fetch after every mutation

---

## Rollback Plan

If issues arise:
1. Revert `search/route.ts` line 22: Add back `query.in('status', ['pending', 'claimed', 'used'])`
2. Revert frontend filter UI changes
3. Keep error message improvements (safe)
