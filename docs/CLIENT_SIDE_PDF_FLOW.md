# Client-Side PDF Generation Flow

## Overview

De DISC rapport PDF's worden nu **client-side** gegenereerd via de browser print engine, in plaats van server-side met Chromium. Dit voorkomt Vercel compute limits en maakt de flow sneller en betrouwbaarder.

## Flow Diagram

```
Quiz invullen
    ↓
Compute results (/api/compute)
    ↓
Store in localStorage
    ↓
Redirect naar /rapport/preview?attempt_id=...
    ↓
Preview pagina (chart + samenvatting)
    ↓
User klikt "Download volledig rapport"
    ↓
Generate one-time token (/api/rapport/generate-token)
    ↓
Open /rapport/print?token=... in nieuw venster
    ↓
Fetch data via token (/api/rapport/get-data)
    ↓
Wait for document.fonts.ready
    ↓
Trigger window.print()
    ↓
User kiest "Opslaan als PDF" in browser
```

## Componenten

### 1. Preview Pagina (`/rapport/preview`)

**Locatie:** `app/rapport/preview/page.tsx`

**Functie:**
- Toont mini-versie van rapport (hero, summary, chart)
- Haalt data uit localStorage (gezet door quiz completion)
- Button "Download volledig rapport" genereert token en opent print pagina

**URL Parameters:**
- `attempt_id`: UUID van de quiz attempt

**Data Source:**
- `localStorage.getItem('quiz_result_{attempt_id}')`
- Bevat: `profileCode`, `percentages`, `candidateName`

### 2. Print Pagina (`/rapport/print`)

**Locatie:** `app/rapport/print/page.tsx`

**Functie:**
- Valideert one-time token
- Haalt volledige data op via API
- Wacht op fonts.ready
- Triggert window.print() automatisch
- Bevat A4 print-CSS

**URL Parameters:**
- `token`: UUID one-time token

**Print CSS Features:**
- `@page { size: A4; margin: 1.5cm; }`
- `width: 210mm; height: 297mm`
- Page breaks: `.break-before-page`, `.break-inside-avoid`
- Color preservation: `-webkit-print-color-adjust: exact`
- Hidden elements: `.no-print`

### 3. API Endpoints

#### `/api/rapport/generate-token` (POST)

**Authenticatie:** Bearer token (user moet ingelogd zijn)

**Request Body:**
```json
{
  "attempt_id": "uuid"
}
```

**Response:**
```json
{
  "token": "uuid",
  "expires_at": "2025-01-27T12:00:00Z"
}
```

**Validaties:**
- User is authenticated
- Attempt exists en is van deze user
- Quiz is completed (finished_at is set)

**Database:**
- Slaat token op in `print_tokens` tabel
- Token is 1 uur geldig
- One-time use (wordt gemarkeerd als `used` na gebruik)

#### `/api/rapport/get-data` (GET)

**Authenticatie:** Token in query parameter (geen user auth nodig)

**Query Parameters:**
- `token`: UUID one-time token

**Response:**
```json
{
  "profileCode": "DI",
  "natuurlijkeStijl": { "D": 78, "I": 54, "S": 28, "C": 15 },
  "responsStijl": { "D": 65, "I": 60, "S": 40, "C": 30 },
  "assessmentDate": "2025-01-27T10:30:00Z",
  "candidateName": "Jan Jansen"
}
```

**Validaties:**
- Token exists
- Token niet expired
- Token niet al gebruikt
- Markeert token als `used` na succesvol ophalen

## Database Schema

### `print_tokens` tabel

```sql
CREATE TABLE public.print_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE,
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_print_tokens_token` (voor snelle lookups)
- `idx_print_tokens_attempt_id`
- `idx_print_tokens_user_id`

**RLS Policies:**
- Users kunnen alleen hun eigen tokens zien
- Service role heeft volledige toegang (voor API)

## Security

### Token-based Access Control

1. **One-time use:** Token wordt gemarkeerd als `used` na eerste gebruik
2. **Time-limited:** Token is 1 uur geldig
3. **User-owned:** Token is gekoppeld aan user_id en attempt_id
4. **No secrets in URL:** Token is niet de user's auth token, maar een dedicated print token

### Waarom veilig?

- Token kan maar 1x gebruikt worden
- Token expired na 1 uur
- Token is gekoppeld aan specifieke attempt (geen cross-user access)
- Print pagina heeft geen toegang tot user's auth token
- Data wordt opgehaald via API (niet in URL)

## Voordelen vs Server-Side PDF

| Aspect | Server-Side (Chromium) | Client-Side (Browser Print) |
|--------|------------------------|----------------------------|
| **Compute** | Hoog (Chromium draait op server) | Laag (alleen API calls) |
| **Vercel Limits** | Problematisch (timeout, memory) | Geen probleem |
| **Snelheid** | Langzaam (5-30s) | Snel (1-3s) |
| **Kosten** | Hoog (compute time) | Laag (alleen storage) |
| **Browser Compatibility** | N/A | Werkt in alle moderne browsers |
| **Layout Control** | Pixel-perfect | Afhankelijk van browser (maar met goede CSS zeer consistent) |
| **Fonts** | Moet embedden | Gebruikt systeem fonts of web fonts |
| **User Experience** | Wachten op server | Direct feedback |

## Nadelen & Mitigaties

### Nadeel 1: Browser Print Dialog

**Probleem:** User moet handmatig "Opslaan als PDF" kiezen in print dialog.

**Mitigatie:**
- Duidelijke instructies op de pagina
- Automatisch openen van print dialog
- Fallback link als dialog niet opent

### Nadeel 2: Browser Verschillen

**Probleem:** Output kan per browser nét iets verschillen.

**Mitigatie:**
- Goede print CSS met A4 sizing
- `@page` rules voor margins
- `-webkit-print-color-adjust: exact` voor kleuren
- Testen in Chrome, Firefox, Safari, Edge

### Nadeel 3: Fonts Moeten Laden

**Probleem:** Als fonts niet geladen zijn, krijg je fallback fonts in PDF.

**Mitigatie:**
- `await document.fonts.ready` voor print trigger
- Loading state toont "Lettertypes geladen ✓"
- Delay van 1.5s voor extra zekerheid

## Testing Checklist

- [ ] Quiz invullen en completion flow testen
- [ ] Preview pagina toont correcte data
- [ ] Button "Download rapport" genereert token
- [ ] Print pagina opent in nieuw venster
- [ ] Data wordt correct opgehaald via token
- [ ] Fonts laden correct (check loading state)
- [ ] Print dialog opent automatisch
- [ ] PDF output is correct (A4, kleuren, fonts, layout)
- [ ] Token kan maar 1x gebruikt worden
- [ ] Expired token geeft error
- [ ] Cross-user access is niet mogelijk

## Troubleshooting

### Print dialog opent niet

**Oplossing:** Klik op "Printvenster handmatig openen" button op de print pagina.

### Fonts zien er anders uit in PDF

**Oplossing:** Wacht langer op `document.fonts.ready` of verhoog delay.

### Token expired error

**Oplossing:** Ga terug naar preview pagina en klik opnieuw op download button (genereert nieuwe token).

### Token already used error

**Oplossing:** Ga terug naar preview pagina en klik opnieuw op download button (genereert nieuwe token).

## Future Improvements

1. **Email met link:** Stuur email met link naar preview pagina (ipv PDF attachment)
2. **Multiple downloads:** Maak tokens herbruikbaar binnen tijdslimiet
3. **Custom branding:** Laat organisaties eigen logo/kleuren toevoegen
4. **Analytics:** Track hoeveel PDFs worden gegenereerd
5. **A/B testing:** Test verschillende layouts/designs
