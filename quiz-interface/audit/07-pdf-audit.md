# PDF Pipeline Audit — DISC Quiz Platform

> **Generated**: 2024-12-17  
> **Scope**: Puppeteer, templates, placeholder replacement, storage, email

---

## 1. Pipeline Overview

```
/api/quiz/finish (POST)
    │
    ├── Auth: Bearer token + ownership check
    │
    ├── generatePDFFromTemplate()
    │   ├── Copy template to temp dir
    │   ├── replacePlaceholders() - inject user data
    │   ├── generateChartSVG() - create DISC chart
    │   ├── Puppeteer render (9 HTML pages)
    │   └── pdf-lib merge into single PDF
    │
    ├── Upload to Supabase Storage (quiz-docs bucket)
    │
    ├── sendRapportEmail() - attach PDF
    │
    └── Update quiz_attempts (pdf_path, pdf_expires_at)
```

---

## 2. Template Placeholder Replacement

### 2.1 Escaping/Encoding

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| **HTML escaping** | ✅ | `escapeHtml()` function | `placeholder-replacer.ts:49-54` |
| **Characters escaped** | ✅ | `& < > " '` | `escapeHtml()` implementation |
| **Applied to user input** | ✅ | Name, date, style all escaped | `route.ts:130-134, 162-167` |

**Implementation**:
```typescript
const escapeHtml = (s: string) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
```

**Risk Assessment**: LOW - User-provided `full_name` is properly escaped before injection into HTML templates.

### 2.2 Placeholder Types

| Placeholder | Source | Escaped? | Example |
|-------------|--------|----------|---------|
| `<<Naam>>` | `candidate.full_name` | ✅ | "Jan de Vries" |
| `<<Datum>>` | `results.created_at` | ✅ | "17-12-2024" |
| `<<Stijl>>` | `results.profile_code` | ✅ | "D" |
| `<<NaturalD>>` etc. | `results.natural_*` | N/A (numbers) | "75" |

### 2.3 XSS/HTML Injection Risk

| Vector | Protected? | Notes |
|--------|------------|-------|
| User name with `<script>` | ✅ | Escaped to `&lt;script&gt;` |
| User name with `"onclick=..."` | ✅ | Escaped to `&quot;onclick=...` |
| CSS injection via name | ✅ | Only inserted into text content |

**Finding**: No XSS risk identified. All user input is HTML-escaped before template injection.

---

## 3. Resource Loading & SSRF

### 3.1 Template Resource Loading

| Resource Type | Source | Risk |
|---------------|--------|------|
| **HTML templates** | Local filesystem (temp copy) | ✅ Safe |
| **CSS** | Relative paths (`../css/`) | ✅ Safe - local files |
| **Fonts** | Relative paths (`../fonts/`) | ✅ Safe - local files |
| **Images** | Relative paths (`../image/`) | ✅ Safe - local files |
| **Chart SVG** | Generated inline (data:URI) | ✅ Safe - no external fetch |

### 3.2 Puppeteer URL Loading

**Current implementation** (`pdf-generator.ts:163-169`):
```typescript
const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`
await page.goto(fileUrl, { waitUntil: 'networkidle0' })
```

| Aspect | Status | Notes |
|--------|--------|-------|
| **Protocol** | `file://` only | ✅ No HTTP/HTTPS fetches |
| **Path validation** | Template dir only | ✅ Hardcoded path structure |
| **User-controlled URLs** | None | ✅ No SSRF vector |

### 3.3 External Resources in Templates

| Check | Result |
|-------|--------|
| External `<script src="...">` | Not found in templates |
| External `<link href="...">` | Not found in templates |
| External `<img src="http...">` | Not found in templates |
| `@import url(...)` in CSS | Not found in templates |

**Finding**: No SSRF risk. All resources loaded from local filesystem.

---

## 4. Puppeteer Security Configuration

### 4.1 Launch Arguments

**Current configuration** (`pdf-generator.ts:147-156`):
```typescript
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--allow-file-access-from-files',
    '--enable-local-file-accesses',
    '--disable-web-security',
    '--font-render-hinting=medium'
  ]
})
```

| Flag | Risk | Justification |
|------|------|---------------|
| `--no-sandbox` | ⚠️ MEDIUM | Required for Docker/serverless; mitigated by controlled input |
| `--disable-setuid-sandbox` | ⚠️ MEDIUM | Same as above |
| `--allow-file-access-from-files` | LOW | Needed for local template loading |
| `--enable-local-file-accesses` | LOW | Needed for local template loading |
| `--disable-web-security` | ⚠️ MEDIUM | Allows cross-origin; mitigated by no external URLs |
| `--font-render-hinting=medium` | ✅ None | Cosmetic |

**Finding M1**: `--no-sandbox` is a known security concern but is standard for serverless environments. Risk is mitigated because:
1. No user-controlled URLs are loaded
2. Template content is controlled
3. User input is escaped

### 4.2 Timeouts & Resource Limits

| Setting | Current Value | Recommendation |
|---------|---------------|----------------|
| **Page navigation timeout** | Default (30s) | Consider explicit `timeout: 30000` |
| **PDF generation timeout** | None | Add timeout wrapper |
| **Memory limit** | None | Consider `--max-old-space-size` |
| **Concurrent browsers** | Unlimited | Add concurrency limit |

**Finding M2**: No explicit timeouts or concurrency limits. A malicious or malformed template could hang indefinitely.

### 4.3 Browser Cleanup

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Browser close** | ✅ | `finally { await browser.close() }` |
| **Temp dir cleanup** | ✅ | `fs.rmSync(tempDir, { recursive: true })` |
| **Error handling** | ✅ | Try/finally ensures cleanup |

---

## 5. Storage & Upload

### 5.1 Storage Path Generation

**Current implementation** (`finish/route.ts:151-162`):
```typescript
const displayName = finalPD?.candidate?.full_name || (user.email?.split('@')[0] || 'user')
const baseStoragePath = buildPdfStoragePath(user.id, quiz_id, displayName)
const pdfFilename = buildPdfFilename(displayName)
const storagePath = await findUniqueStoragePath(baseStoragePath, ...)
```

| Aspect | Status | Notes |
|--------|--------|-------|
| **Path sanitization** | ⚠️ Unknown | `buildPdfStoragePath` not readable (null bytes) |
| **Collision handling** | ✅ | `findUniqueStoragePath` appends `-1`, `-2` |
| **User ID in path** | ✅ | Prevents cross-user overwrites |

**Finding L1**: Unable to verify path sanitization in `slugify.ts` (file has null bytes). Recommend manual review.

### 5.2 Bucket Configuration

| Setting | Value | Status |
|---------|-------|--------|
| **Bucket name** | `quiz-docs` | ✅ |
| **Visibility** | Private | ✅ (created in migration) |
| **Upsert mode** | `false` | ✅ Prevents overwrites |

### 5.3 Signed URLs

| Route | Expiry | Access Control |
|-------|--------|----------------|
| `/api/admin/pdf-download` | 1 hour | Admin session |
| `/api/documents/signed-url` | 1 hour | User ownership |

### 5.4 PDF Expiry

| Setting | Value | Evidence |
|---------|-------|----------|
| **Retention** | 180 days | `finish/route.ts:176` |
| **Stored in** | `quiz_attempts.pdf_expires_at` | `route.ts:184` |
| **Cleanup** | Edge function cron | `supabase/functions/cleanup-expired-pdfs` |

---

## 6. Email Pipeline

### 6.1 Attachment Handling

**Current implementation** (`mailer.ts:27-42`):
```typescript
const attachments = options.attachments?.map(att => ({
  filename: att.filename,
  content: Buffer.from(att.content),
  contentType: att.contentType || 'application/pdf'
}))
```

| Aspect | Status | Notes |
|--------|--------|-------|
| **Content type** | Hardcoded `application/pdf` | ✅ Safe |
| **Filename** | From `buildPdfFilename()` | ⚠️ Verify sanitization |
| **Size limit** | None in code | ⚠️ SMTP provider limit |

### 6.2 Email Generation

| Aspect | Status | Evidence |
|--------|--------|----------|
| **HTML escaping in email** | ✅ | Name interpolated into static template |
| **Plain text fallback** | ✅ | `generateEmailText()` provided |
| **External resources** | ✅ | Only logo from Supabase public bucket |

**Logo URL** (`mailer.ts:90`):
```
https://lsfhegbphxdapjodmjua.supabase.co/storage/v1/object/public/Images/TLC-3.png
```

### 6.3 Error Handling

| Scenario | Behavior | Evidence |
|----------|----------|----------|
| **Email fails** | PDF still saved, status='failed' | `route.ts:253-266` |
| **Partial recipients** | Continues to next | `route.ts:225-242` |
| **Notification logged** | ✅ | `notifications` table insert |

### 6.4 Retry Logic

| Aspect | Status | Recommendation |
|--------|--------|----------------|
| **Automatic retry** | ❌ None | Consider retry with backoff |
| **Manual resend** | ✅ | Admin can trigger via dashboard |

---

## 7. Idempotency Analysis

### 7.1 Finish Endpoint

**Current check** (`finish/route.ts:100-105`):
```typescript
if (!attempt.finished_at) {
  await supabaseAdmin
    .from('quiz_attempts')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', attempt_id)
}
```

| Scenario | Behavior | Issue |
|----------|----------|-------|
| **First call** | Sets `finished_at`, generates PDF | ✅ |
| **Rapid retry (race)** | Both may pass `finished_at` check | ⚠️ **M3** |
| **Later retry** | Skips `finished_at` update, still generates PDF | ⚠️ **M4** |

**Finding M3**: Race condition - two concurrent requests could both see `finished_at = null` and generate duplicate PDFs.

**Finding M4**: No idempotency on PDF generation itself. Even with `finished_at` set, calling finish again will:
1. Generate a new PDF (wasted compute)
2. Upload with unique path (storage waste)
3. Send duplicate email (spam)

### 7.2 Recommended Fix

```typescript
// At start of finish handler, check if PDF already exists
if (attempt.pdf_path) {
  return NextResponse.json({ 
    ok: true, 
    storage_path: attempt.pdf_path,
    pdf_filename: attempt.pdf_filename,
    already_finished: true 
  })
}

// Use optimistic locking for finished_at
const { data: updated, error } = await supabaseAdmin
  .from('quiz_attempts')
  .update({ finished_at: new Date().toISOString() })
  .eq('id', attempt_id)
  .is('finished_at', null)  // Only update if still null
  .select('id')
  .single()

if (!updated) {
  // Another request already finished this attempt
  const { data: existing } = await supabaseAdmin
    .from('quiz_attempts')
    .select('pdf_path, pdf_filename')
    .eq('id', attempt_id)
    .single()
  
  return NextResponse.json({ 
    ok: true, 
    storage_path: existing.pdf_path,
    pdf_filename: existing.pdf_filename,
    already_finished: true 
  })
}
```

---

## 8. Chart Generation Security

### 8.1 SVG Generation

**Current implementation** (`chart-generator.ts:11-166`):

| Aspect | Status | Notes |
|--------|--------|-------|
| **User input in SVG** | ❌ None | Only numeric data |
| **Script injection** | ✅ Safe | No `<script>` tags |
| **External resources** | ✅ Safe | No `xlink:href` to external URLs |
| **CSS injection** | ✅ Safe | Static styles only |

### 8.2 Data Validation

| Data | Validation | Evidence |
|------|------------|----------|
| **DISC percentages** | Numbers 0-100 | `computeDisc()` returns bounded values |
| **Category labels** | Hardcoded `D, I, S, C` | `chart-generator.ts:32` |

**Finding**: Chart generation is safe. No user text is embedded in SVG.

---

## 9. Findings Summary

### Critical (0)
None.

### High (0)
None.

### Medium (4)

| ID | Finding | Risk | Fix |
|----|---------|------|-----|
| **M1** | `--no-sandbox` Puppeteer flag | Reduced isolation | Accept (serverless requirement) or use dedicated PDF service |
| **M2** | No timeout on PDF generation | Resource exhaustion | Add timeout wrapper: `Promise.race([generatePDF(), timeout(60000)])` |
| **M3** | Race condition on `finished_at` check | Duplicate PDFs | Use optimistic locking with `.is('finished_at', null)` |
| **M4** | No idempotency on PDF generation | Wasted resources, duplicate emails | Check `pdf_path` exists before generating |

### Low (2)

| ID | Finding | Risk | Fix |
|----|---------|------|-----|
| **L1** | Unable to verify path sanitization in `slugify.ts` | Path traversal (unlikely) | Manual review of slugify implementation |
| **L2** | No size limit on PDF attachment | Email bounce if >25MB | Add size check before email send |

### Info (1)

| ID | Finding | Notes |
|----|---------|-------|
| **I1** | `--disable-web-security` flag | Acceptable since no external URLs loaded |

---

## 10. Recommended Patches

### Patch 1: Idempotency Guard (M3 + M4)

```typescript
// /api/quiz/finish/route.ts - Add after ownership check (~line 97)

// Idempotency: if PDF already exists, return early
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
  .is('finished_at', null)
  .select('id')
  .maybeSingle()

if (!claimed) {
  // Race condition: another request is processing
  // Wait briefly and return existing result
  await new Promise(r => setTimeout(r, 2000))
  const { data: existing } = await supabaseAdmin
    .from('quiz_attempts')
    .select('pdf_path, pdf_filename')
    .eq('id', attempt_id)
    .single()
  
  if (existing?.pdf_path) {
    return NextResponse.json({ 
      ok: true, 
      storage_path: existing.pdf_path,
      pdf_filename: existing.pdf_filename,
      cached: true 
    })
  }
  return NextResponse.json({ error: 'Processing in progress' }, { status: 409 })
}
```

### Patch 2: PDF Generation Timeout (M2)

```typescript
// /lib/services/pdf-generator.ts - Wrap browser operations

const PDF_TIMEOUT_MS = 60000 // 60 seconds

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`PDF generation timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout])
}

// In generatePDFFromTemplateStrict:
const browser = await withTimeout(
  puppeteer.launch({ headless: true, args: [...] }),
  10000 // 10s to launch
)

// Wrap page operations
await withTimeout(page.goto(fileUrl, { waitUntil: 'networkidle0' }), 30000)
```

---

## 11. Test Scenarios

### 11.1 XSS/Injection Tests

```bash
# Test 1: Script injection in name
# Create candidate with name: <script>alert('xss')</script>
# Expected: Name appears escaped in PDF as &lt;script&gt;...

# Test 2: HTML injection in name  
# Create candidate with name: <img src=x onerror=alert(1)>
# Expected: Escaped, no image rendered
```

### 11.2 Idempotency Tests

```bash
# Test 1: Double-click simulation
# Send two finish requests simultaneously for same attempt_id
# Expected: Only one PDF generated, second request returns cached result

# Test 2: Retry after completion
# Complete quiz, wait, then call finish again
# Expected: Returns existing PDF, no new generation
```

### 11.3 Resource Limit Tests

```bash
# Test 1: Large name (1000+ characters)
# Expected: PDF generates without hanging

# Test 2: Concurrent requests (10 simultaneous)
# Expected: All complete within reasonable time, no memory crash
```

---

## 12. Evidence Index

| File | Lines | Relevant For |
|------|-------|--------------|
| `src/lib/services/pdf-generator.ts` | 1-503 | Puppeteer config, template rendering |
| `src/lib/utils/placeholder-replacer.ts` | 1-259 | HTML escaping, placeholder injection |
| `src/lib/utils/chart-generator.ts` | 1-167 | SVG generation (no user text) |
| `src/server/email/mailer.ts` | 1-288 | Email sending, attachments |
| `app/api/quiz/finish/route.ts` | 1-291 | Finish endpoint, idempotency issue |
| `src/server/pdf/renderPdf.ts` | 11-16 | Alternative Puppeteer config |
