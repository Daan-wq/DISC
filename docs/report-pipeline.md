# Report PDF Pipeline

This document describes the Node-only PDF generation pipeline for DISC reports.

## Overview

The pipeline has two stages:
1. **Build-time** (local/CI) - Generates base PDFs and position data from HTML templates
2. **Runtime** (Vercel) - Overlays personalized data onto base PDFs using pdf-lib

This approach eliminates the need for Chromium/Puppeteer at runtime, which was failing on Vercel due to missing OS libraries.

## Directory Structure

```
apps/quiz/
├── src/                              # Template source (HTML)
│   ├── 1 C Basis profiel plus.../
│   │   └── publication-web-resources/
│   │       └── html/
│   │           ├── publication.html      # Cover page
│   │           ├── publication-1.html    # Date/style page
│   │           ├── publication-2.html    # Chart page
│   │           └── publication-{3-8}.html
│   ├── 1 CD Basis profiel plus.../
│   └── ...                           # 16 profile folders
│
├── assets/report/                    # Generated assets (committed to git)
│   ├── base-pdf/<profileCode>.pdf    # Base PDFs with invisible placeholders
│   ├── positions/<profileCode>.json  # Measured positions for overlays
│   ├── debug/<profileCode>.overlay.pdf # Debug overlays with rectangles
│   └── manifest.json                 # Asset inventory with hashes
│
├── scripts/report/                   # Build-time scripts
│   ├── template-discovery.ts         # Scans src/ for template folders
│   ├── generate-base-pdfs.ts         # Renders HTML to PDF
│   ├── extract-positions.ts          # Measures placeholder positions
│   ├── debug-overlay.ts              # Creates visual debug PDFs
│   ├── generate-manifest.ts          # Creates asset manifest
│   └── build-all.ts                  # Orchestrates all steps
│
└── src/lib/report/                   # Runtime generator
    ├── index.ts                      # Exports
    └── generate-report-pdf.ts        # Node-only PDF overlay
```

## Build-Time Scripts

Run from the `apps/quiz` directory:

```bash
# Full build (recommended)
pnpm run report:build

# Individual steps
pnpm run report:discover           # List discovered templates
pnpm run report:generate-base-pdfs # Generate base PDFs
pnpm run report:extract-positions  # Extract placeholder positions
pnpm run report:debug-overlay      # Create debug overlays
pnpm run report:manifest           # Generate manifest.json
```

### How Base PDF Generation Works

1. **Template Discovery**: Scans `src/` for folders matching pattern `1 XX Basis profiel plus...`
2. **Copy to Temp**: Copies template folder to temporary directory
3. **Hide Placeholders**: Adds `opacity:0` to placeholder spans (preserves layout)
4. **Render Pages**: Opens each HTML in headless Puppeteer, exports as PDF
5. **Merge**: Combines 9 single-page PDFs into one 9-page PDF
6. **Validate**: Confirms exactly 9 pages

### How Position Extraction Works

1. Opens each HTML page in headless browser
2. Finds placeholder elements using selectors:
   - `a[href="http://DBF_Naam"] span`
   - `a[href="http://DBF_Voornaam"] span`
   - `a[href="http://DBF_Datum"] span`
   - `a[href="http://DBF_Stijl"] span`
3. Finds chart image using class pattern `_idGenObjectAttribute-1 _idGenObjectAttribute-2`
4. Measures `getBoundingClientRect()` in pixels
5. Converts to PDF points: `pt = px * 0.75`
6. Applies Y-flip: `yPt = pageHeightPt - (topPt + heightPt)`
7. Saves JSON with all field positions

## Runtime Generation

The runtime generator (`src/lib/report/generate-report-pdf.ts`) works without any browser:

```typescript
import { generateReportPdf } from '@/lib/report'

const pdfBuffer = await generateReportPdf({
  profileCode: 'DC',
  fullName: 'Jan de Vries',
  date: new Date(),
  styleLabel: 'Dominant-Conscientieus',
  discData: {
    natural: { D: 75, I: 45, S: 30, C: 60 },
    response: { D: 65, I: 50, S: 35, C: 55 },
  },
})
```

### How Runtime Works

1. **Load Assets**: Reads base PDF and positions JSON (cached per profile)
2. **Embed Font**: Uses Helvetica from pdf-lib's StandardFonts
3. **Overlay Text**: Draws name, date, style at measured positions
4. **Generate Chart**: Creates SVG, converts to PNG via @resvg/resvg-js
5. **Overlay Chart**: Embeds PNG at measured position with contain scaling
6. **Return Buffer**: Returns PDF bytes for upload/email

## Checking Debug Overlays

After running `report:build`, check the debug overlays to verify positions:

1. Open `assets/report/debug/<profileCode>.overlay.pdf`
2. Each field should have a colored rectangle:
   - **Red**: name (cover page)
   - **Blue**: date
   - **Purple**: style
   - **Orange**: chart
3. If rectangles are misaligned, the positions need adjustment

## What To Do When Templates Change

If the HTML templates are updated:

1. Run `pnpm run report:build` to regenerate all assets
2. Check debug overlays to verify positions are still correct
3. Commit the updated assets to git
4. Deploy - the new assets will be used automatically

## Troubleshooting

### Y-Flip Issues

PDF coordinate system has origin at bottom-left, but browser has origin at top-left.
The conversion is: `yPt = PAGE_HEIGHT_PT - (topPt + heightPt)`

If text appears flipped or at wrong Y position:
1. Check that PAGE_HEIGHT_PT matches actual PDF page height (841.89pt for A4)
2. Verify the HTML viewport matches during position extraction

### Font Issues

Currently using Helvetica from pdf-lib StandardFonts. If custom fonts are needed:
1. Add TTF file to `assets/report/fonts/`
2. Modify `generate-report-pdf.ts` to embed custom font
3. Update font loading in `loadAssets()`

### Rect Mismatch

If overlay text appears in wrong location:
1. Run `report:extract-positions` to regenerate positions
2. Check debug overlay to see measured rectangles
3. Verify the HTML template structure hasn't changed
4. Check that viewport settings match between extraction and base PDF generation

### Chart Not Rendering

The chart uses @resvg/resvg-js for SVG-to-PNG conversion:
1. Ensure @resvg/resvg-js is installed
2. Check that discData values are valid numbers (0-100)
3. Verify chart position was extracted (check positions JSON)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REPORT_TEMPLATES_SOURCE` | Override template source directory | `{cwd}/src` |

## Dependencies

### Build-time (devDependencies)
- `puppeteer` - Headless browser for HTML-to-PDF
- `pdf-lib` - PDF manipulation
- `tsx` - TypeScript execution

### Runtime (dependencies)
- `pdf-lib` - PDF manipulation
- `@resvg/resvg-js` - SVG to PNG (pure WASM, works on Vercel)

## Performance

| Operation | Time |
|-----------|------|
| Asset load (cold) | ~50ms |
| Asset load (cached) | ~10ms |
| Text overlay | ~5ms |
| Chart generation | ~100ms |
| PDF save | ~20ms |
| **Total (cached)** | **~150ms** |

Compare to Chromium-based approach: 15-45 seconds per PDF.
