# DISC PDF Overlay Generator - Concrete Implementatie Opdracht

## Context: Huidige Codebase Analyse

Je werkt aan een bestaande PDF overlay pipeline voor DISC rapporten. De codebase bestaat uit:

### Bestaande Structuur
```
apps/quiz/
├── src/lib/report/
│   ├── generate-report-pdf.ts      # Runtime PDF generator (Vercel/Node.js)
│   └── svg-to-png.ts                # SVG→PNG conversie (WASM)
├── scripts/report/
│   ├── generate-base-pdfs.ts        # Build-time: HTML→PDF conversie
│   ├── extract-positions.ts         # Build-time: Placeholder positie extractie
│   └── debug-overlay.ts             # Build-time: Debug visualisatie
└── assets/report/
    ├── base-pdf/                    # Pre-built PDFs per profiel (16 profielen)
    └── positions/                   # JSON met placeholder posities
```

### Huidige Pipeline Flow
1. **Build-time** (scripts/report/):
   - `generate-base-pdfs.ts`: Laadt HTML templates uit "C:\Users\Daant\Documents\Windsurf projects\DISC\Disc profielen origineel"
   - Maakt placeholders onzichtbaar via `opacity:0;color:transparent`
   - Rendert elke HTML pagina naar PDF met Puppeteer
   - Merged 9 paginas per profiel naar base PDF
   
2. **Build-time** (scripts/report/):
   - `extract-positions.ts`: Opent HTML templates in headless browser
   - Meet placeholder posities via `getBoundingClientRect()`
   - Extraheert computed styles (font, size, weight, color)
   - Converteert px→pt (factor 0.75) en y-flip voor PDF coords
   - Slaat op in JSON: `{ pageIndex, rect: {x,y,w,h}, source, styles: {...} }`

3. **Runtime** (src/lib/report/):
   - `generate-report-pdf.ts`: Laadt base PDF + positions JSON
   - Embed fonts: `StandardFonts.Helvetica` en `HelveticaBold`
   - Overlay tekst via `page.drawText()` op gemeten posities
   - Genereert chart als SVG, converteert naar PNG, embed in PDF
   - Return Buffer voor upload/email

---

## PROBLEMEN DIE JE MOET FIXEN

### 1. Tekststijl Mismatch ❌
**Symptoom**: Overlay tekst heeft andere font/kleur/grootte dan de regel in template.

**Root Cause**:
- `generate-report-pdf.ts` gebruikt ALTIJD `StandardFonts.Helvetica` (regel 308-309)
- Hardcoded font sizes: name=18pt, date=10pt, style=10pt (regels 322, 330, 338)
- Hardcoded kleur: `rgb(0,0,0)` zwart (regel 316)
- Percentages gebruiken WEL `pos.styles` (regels 413-427), maar andere velden NIET

**Wat er moet gebeuren**:
- Alle overlay velden moeten `pos.styles` gebruiken (fontFamily, fontSize, fontWeight, color)
- Fonts moeten embedded worden (TTF/OTF files uit HTML templates)
- Font mapping: Regular/Bold/Italic/BoldItalic als aparte embedded fonts
- GEEN fallback naar StandardFonts - altijd exacte match

**Concrete locaties in code**:
- `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/src/lib/report/generate-report-pdf.ts`
  - Regel 308-309: Embed custom fonts i.p.v. StandardFonts
  - Regel 322: `drawTextAutoFit()` moet styles uit `positions.fields.name.styles` gebruiken
  - Regel 330: `drawTextAutoFit()` moet styles uit `positions.fields.date.styles` gebruiken
  - Regel 338: `drawTextAutoFit()` moet styles uit `positions.fields.style.styles` gebruiken
  - Regel 346: `drawTextAutoFit()` moet styles uit `positions.fields.firstName.styles` gebruiken

### 2. Oude "0%" Placeholders Nog Zichtbaar ❌
**Symptoom**: Nieuwe percentages overlappen oude "0%" tekst, slecht leesbaar.

**Root Cause**:
- `generate-base-pdfs.ts` maakt placeholders onzichtbaar via `opacity:0;color:transparent` (regels 89, 105)
- Dit werkt NIET voor percentage velden in groene tabel (page 2)
- Alleen DBF_Naam, DBF_Voornaam, DBF_Datum, DBF_Stijl worden invisible gemaakt (regels 29-34)
- Percentage "0%" spans worden NIET behandeld

**Wat er moet gebeuren**:
- `generate-base-pdfs.ts`: Voeg percentage spans toe aan invisible logic
- OF: `generate-report-pdf.ts`: Teken witte/groene rectangle EERST om oude tekst te coveren
- Gebruik `page.drawRectangle()` met background color uit `pos.styles.backgroundColor`
- DAN pas nieuwe tekst tekenen

**Concrete locaties in code**:
- `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/scripts/report/generate-base-pdfs.ts`
  - Regel 29-34: Voeg percentage selectors toe (spans met "0%" in containers)
  - Regel 74-112: Extend `makePlaceholdersInvisible()` voor percentage spans
- OF: `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/src/lib/report/generate-report-pdf.ts`
  - Regel 406-446: Voor elke percentage, eerst `page.drawRectangle()` met groene achtergrond

### 3. Grafiek Mist Legenda + D/I/S/C Labels ❌
**Symptoom**: Chart toont bars/line maar geen legenda en geen x-as labels.

**Root Cause**:
- `generateChartSVG()` (regels 155-242) HEEFT legenda en labels in SVG
- SVG width=400, height=320, margin.right=130 voor legenda (regel 156-158)
- Legenda code staat er (regels 218-228): "Natuurlijke stijl" + "Respons stijl"
- X-as labels staan er (regels 201-204): D, I, S, C
- MAAR: chart wordt mogelijk geclipt bij PNG conversie of PDF embedding

**Wat er moet gebeuren**:
- Verify `svgToPng()` converteert VOLLEDIGE SVG (inclusief legenda rechts)
- Check `pos.rect` voor chart - is bbox groot genoeg voor legenda?
- Als chart image te klein: vergroot bbox in `extract-positions.ts`
- Als aspect ratio mismatch: fix scaling logic (regels 365-382)

**Concrete locaties in code**:
- `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/src/lib/report/generate-report-pdf.ts`
  - Regel 356-360: SVG generatie - verify dimensions
  - Regel 365-382: Aspect ratio scaling - mogelijk clipping
- `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/scripts/report/extract-positions.ts`
  - Regel 231-262: Chart bbox extractie - mogelijk te klein

### 4. PDF Vult Pagina Niet (Witte Padding) ❌
**Symptoom**: Groene vlakken smaller dan template, witte padding zichtbaar.

**Root Cause**:
- A4 conversie: PAGE_WIDTH_PT=595.28, PAGE_HEIGHT_PT=841.89 (regels 25-26 in extract-positions.ts)
- PX_TO_PT factor: 0.75 (regel 29 in extract-positions.ts)
- Viewport: 793x1122px (regel 117-119 in extract-positions.ts)
- MAAR: Puppeteer PDF render gebruikt 595x842px viewport (regel 154 in generate-base-pdfs.ts)
- **MISMATCH**: Extractie viewport ≠ PDF render viewport

**Wat er moet gebeuren**:
- Gebruik DEZELFDE viewport in beide scripts
- OF: Gebruik mm→pt conversie i.p.v. px→pt (pt = mm * 72 / 25.4)
- Verify MediaBox/CropBox in base PDFs = 595.28x841.89pt
- Check dat base PDF GEEN extra margins heeft

**Concrete locaties in code**:
- `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/scripts/report/extract-positions.ts`
  - Regel 117-119: Viewport moet matchen met generate-base-pdfs
- `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/scripts/report/generate-base-pdfs.ts`
  - Regel 154: Viewport moet matchen met extract-positions
  - Regel 176-183: PDF options - verify geen extra margins

---

## IMPLEMENTATIE PLAN

### Stap 1: Font Embedding System
**Doel**: Embed exacte fonts uit HTML templates.

**Acties**:
1. Zoek font files in "C:\Users\Daant\Documents\Windsurf projects\DISC\Disc profielen origineel\[profiel]\publication-web-resources\fonts\"
2. Kopieer naar `apps/quiz/assets/report/fonts/`
3. Update `extract-positions.ts`:
   - Voeg `await page.evaluate(() => document.fonts.ready)` toe (na regel 133, 161, 228)
   - Verify computed fontFamily is NIET fallback (Arial/Times)
4. Update `generate-report-pdf.ts`:
   - Voeg `embedCustomFont(fontFamily, weight, style)` functie toe
   - Laad TTF/OTF files en embed via `pdf.embedFont(fontBytes)`
   - Map fontFamily+weight+style → embedded font instance
   - Update alle `drawTextAutoFit()` calls om `pos.styles` te gebruiken

**Deliverables**:
- `apps/quiz/assets/report/fonts/` folder met TTF/OTF files
- `generate-report-pdf.ts`: `embedCustomFont()` functie
- `generate-report-pdf.ts`: Alle overlay calls gebruiken `pos.styles`

### Stap 2: Percentage Placeholder Cleanup
**Doel**: Verwijder oude "0%" tekst voordat nieuwe percentages worden getekend.

**Optie A** (Preferred): Invisible in base PDF
1. Update `generate-base-pdfs.ts`:
   - Extend `PLACEHOLDER_SELECTORS` met percentage spans
   - Detect spans met `textContent === "0%"` in containers `_idContainer028` en `_idContainer029`
   - Apply `opacity:0;color:transparent` via regex replace

**Optie B**: Cover met rectangle
1. Update `extract-positions.ts`:
   - Voeg `backgroundColor` toe aan percentage styles (regel 296-301)
   - Extract computed background color van parent container
2. Update `generate-report-pdf.ts`:
   - Voor elke percentage (regel 406-446):
     - Eerst: `page.drawRectangle()` met `pos.styles.backgroundColor`
     - Padding: +2pt aan alle kanten
     - Dan: `page.drawText()` met nieuwe waarde

**Deliverables**:
- `generate-base-pdfs.ts`: Percentage spans invisible (Optie A)
- OF: `generate-report-pdf.ts`: Rectangle cover logic (Optie B)

### Stap 3: Chart Legenda Fix
**Doel**: Zorg dat legenda en D/I/S/C labels zichtbaar zijn.

**Acties**:
1. Verify SVG output:
   - Log `generateChartSVG()` output naar file voor inspectie
   - Check dat legenda en labels in SVG zitten
2. Verify PNG conversie:
   - Check `svgToPng()` output dimensions
   - Verify geen clipping aan rechter kant (legenda)
3. Verify chart bbox:
   - Check `positions.fields.chart.rect` in JSON
   - Moet breed genoeg zijn voor legenda (minimaal 400pt breed)
4. Fix scaling:
   - Als aspect ratio mismatch: gebruik `cover` i.p.v. `contain`
   - OF: Pas SVG dimensions aan om te matchen met bbox

**Deliverables**:
- Debug logs voor SVG/PNG/bbox
- Fix in `generateChartSVG()` of `extract-positions.ts` chart bbox

### Stap 4: Viewport Consistency
**Doel**: Elimineer witte padding door viewport mismatch.

**Acties**:
1. Kies ÉÉN viewport strategie:
   - **Optie A**: 595x842px (exact A4 @ 72dpi)
   - **Optie B**: 793x1122px (exact A4 @ 96dpi) met PX_TO_PT=0.75
2. Update beide scripts met dezelfde viewport:
   - `extract-positions.ts` regel 117-119
   - `generate-base-pdfs.ts` regel 154
3. Verify base PDF dimensions:
   - Check MediaBox = [0, 0, 595.28, 841.89]
   - Check CropBox = MediaBox
4. Test met debug overlay:
   - Run `debug-overlay.ts` om bboxen te visualiseren
   - Verify geen offset/scaling issues

**Deliverables**:
- Consistent viewport in beide scripts
- Verified base PDF dimensions
- Debug overlay PDFs zonder offset

### Stap 5: Style Registry Enhancement
**Doel**: Hardcode ALLE styles per placeholder voor runtime gebruik.

**Acties**:
1. Update `extract-positions.ts`:
   - Voor ALLE velden (niet alleen percentages): extract styles
   - Voeg toe aan `FieldPosition.styles`: fontFamily, fontSize, fontWeight, color, textAlign, letterSpacing
   - Voeg `backgroundColor` toe voor cover rectangles
2. Update `PositionsData` interface:
   - Alle velden krijgen `styles` property
3. Update `generate-report-pdf.ts`:
   - Verwijder hardcoded maxSize/color parameters
   - Gebruik ALTIJD `pos.styles` als beschikbaar
   - Fallback alleen voor backwards compatibility

**Deliverables**:
- `extract-positions.ts`: Styles voor alle velden
- `generate-report-pdf.ts`: Gebruikt pos.styles overal

---

## ACCEPTANCE CRITERIA

### ✅ Tekststijl Match
- [ ] Alle overlay tekst heeft exact dezelfde font als template regel
- [ ] Alle overlay tekst heeft exact dezelfde grootte als template regel
- [ ] Alle overlay tekst heeft exact dezelfde kleur als template regel
- [ ] Alle overlay tekst heeft exact dezelfde weight (bold/normal) als template regel
- [ ] GEEN gebruik van StandardFonts.Helvetica - alleen embedded custom fonts

### ✅ Geen Oude Placeholders
- [ ] Geen "0%" zichtbaar in groene tabel
- [ ] Geen overlap tussen oude en nieuwe tekst
- [ ] Nieuwe percentages perfect leesbaar (wit op groen)

### ✅ Grafiek Compleet
- [ ] Legenda zichtbaar: "Natuurlijke stijl" + "Respons stijl"
- [ ] X-as labels zichtbaar: D, I, S, C
- [ ] Y-as ticks zichtbaar: 0%, 20%, 40%, 60%, 80%, 100%
- [ ] Bars en line graph correct weergegeven

### ✅ PDF Layout Perfect
- [ ] Groene vlakken even breed als template
- [ ] Geen witte padding aan zijkanten
- [ ] Alle content vult A4 pagina volledig
- [ ] Geen scaling/offset issues

---

## BESTANDEN DIE JE MOET AANPASSEN

### Primair (MOET):
1. `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/src/lib/report/generate-report-pdf.ts`
   - Font embedding systeem
   - Gebruik pos.styles voor alle velden
   - Rectangle cover voor percentages (optie B)
   - Chart scaling fix

2. `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/scripts/report/extract-positions.ts`
   - Styles extractie voor alle velden
   - backgroundColor extractie
   - Viewport consistency
   - Chart bbox verification

3. `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/scripts/report/generate-base-pdfs.ts`
   - Percentage spans invisible maken (optie A)
   - Viewport consistency

### Secundair (OPTIONEEL):
4. `c:/Users/Daant/Documents/Windsurf projects/DISC/DISC Quiz/quiz-interface/apps/quiz/src/lib/report/svg-to-png.ts`
   - Verify geen clipping bij conversie

---

## DEBUG TOOLS

### Enable Debug Mode
```bash
DEBUG_PDF=true npm run build
```

### Verify Positions
```typescript
import { getPositionsDebug } from './src/lib/report/generate-report-pdf'
const positions = await getPositionsDebug('D')
console.log(JSON.stringify(positions, null, 2))
```

### Visual Verification
```bash
npm run report:debug-overlay
# Check assets/report/debug/*.overlay.pdf
```

---

## KRITIEKE CONSTRAINTS

1. **GEEN browser dependencies in runtime code** - `generate-report-pdf.ts` moet pure Node.js blijven
2. **GEEN wijzigingen aan HTML templates** - "Disc profielen origineel" is read-only
3. **Backwards compatible** - Bestaande positions JSON moet blijven werken
4. **Performance** - Font embedding moet gecached worden (singleton pattern)
5. **Vercel compatible** - Alle assets moeten in build output zitten

---

## VOLGORDE VAN UITVOERING

1. **Eerst**: Fix viewport consistency (Stap 4) - dit beïnvloedt alle metingen
2. **Dan**: Enhance style extraction (Stap 5) - dit geeft je de juiste data
3. **Dan**: Implement font embedding (Stap 1) - dit gebruikt de style data
4. **Dan**: Fix percentage cleanup (Stap 2) - dit gebruikt de style data
5. **Laatst**: Fix chart legenda (Stap 3) - dit is onafhankelijk

---

## VERWACHTE OUTPUT

Na implementatie moet je kunnen runnen:

```bash
# 1. Rebuild base PDFs met correcte viewport
npm run report:generate-base-pdfs

# 2. Re-extract positions met styles
npm run report:extract-positions

# 3. Generate debug overlay
npm run report:debug-overlay

# 4. Test runtime generation
npm run test:pdf-generation
```

En krijgen:
- Base PDFs zonder oude placeholders
- Positions JSON met volledige styles
- Debug overlay PDFs die exact matchen
- Runtime PDFs met perfecte overlay

---

## EXTRA CONTEXT

### Font Locaties (Waarschijnlijk)
```
C:\Users\Daant\Documents\Windsurf projects\DISC\Disc profielen origineel\
  [profiel]\publication-web-resources\fonts\
    - PTSans-Regular.ttf
    - PTSans-Bold.ttf
    - PTSans-Italic.ttf
    - PTSans-BoldItalic.ttf
```

### Percentage Container IDs
- Natural: `_idContainer028` (4x "0%" spans voor D, I, S, C)
- Response: `_idContainer029` (4x "0%" spans voor D, I, S, C)

### A4 Dimensions Reference
- mm: 210 x 297
- pt @ 72dpi: 595.28 x 841.89
- px @ 96dpi: 793.7 x 1122.5

---

## JE TAAK

Implementeer bovenstaande fixes in de exacte volgorde. Voor elke stap:

1. **Analyseer** de huidige code op de genoemde regelnummers
2. **Implementeer** de fix met concrete code changes
3. **Test** met debug tools
4. **Verify** acceptance criteria
5. **Document** wat je hebt gedaan

Geef per stap:
- Exacte file paths en regelnummers
- Voor/na code snippets
- Test resultaten
- Eventuele issues die je tegenkomt

**START MET STAP 4 (Viewport Consistency)** - dit is de fundering voor alles.
