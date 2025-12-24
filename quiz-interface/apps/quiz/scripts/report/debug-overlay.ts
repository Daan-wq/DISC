/**
 * Debug Overlay Script
 * 
 * Build-time script that:
 * 1. Loads base PDF and positions JSON for each profile
 * 2. Draws rectangles and labels on the measured positions
 * 3. Saves debug overlay PDF for visual verification
 * 
 * This helps verify that position extraction is correct.
 */

import fs from 'fs'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { discoverTemplates } from './template-discovery'
import type { PositionsData, FieldPosition } from './extract-positions'

const COLORS = {
  name: rgb(1, 0, 0),        // Red
  firstName: rgb(0, 0.5, 0), // Dark Green
  date: rgb(0, 0, 1),        // Blue
  style: rgb(0.5, 0, 0.5),   // Purple
  chart: rgb(1, 0.5, 0),     // Orange
}

/**
 * Creates a debug overlay PDF for a single profile.
 */
async function createDebugOverlayForProfile(
  profileCode: string,
  basePdfPath: string,
  positionsPath: string,
  outputPath: string
): Promise<void> {
  console.log(`\n[debug-overlay] Processing profile: ${profileCode}`)

  // Load base PDF
  if (!fs.existsSync(basePdfPath)) {
    console.error(`  Base PDF not found: ${basePdfPath}`)
    return
  }
  const basePdfBytes = fs.readFileSync(basePdfPath)
  const pdfDoc = await PDFDocument.load(basePdfBytes)

  // Load positions
  if (!fs.existsSync(positionsPath)) {
    console.error(`  Positions file not found: ${positionsPath}`)
    return
  }
  const positions: PositionsData = JSON.parse(fs.readFileSync(positionsPath, 'utf-8'))

  // Embed font for labels
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Draw overlay for each field
  for (const [fieldName, fieldPos] of Object.entries(positions.fields)) {
    if (!fieldPos) continue

    const pos = fieldPos as FieldPosition
    const page = pdfDoc.getPage(pos.pageIndex)
    const color = COLORS[fieldName as keyof typeof COLORS] || rgb(0, 0, 0)

    // Draw rectangle
    page.drawRectangle({
      x: pos.rect.x,
      y: pos.rect.y,
      width: pos.rect.w,
      height: pos.rect.h,
      borderColor: color,
      borderWidth: 1,
      opacity: 0.7,
    })

    // Draw label above rectangle
    const labelY = pos.rect.y + pos.rect.h + 2
    page.drawText(`${fieldName} (${pos.source})`, {
      x: pos.rect.x,
      y: labelY,
      size: 6,
      font,
      color,
    })

    console.log(`  [page ${pos.pageIndex}] Drew ${fieldName} at (${pos.rect.x.toFixed(1)}, ${pos.rect.y.toFixed(1)}) ${pos.rect.w.toFixed(1)}x${pos.rect.h.toFixed(1)}pt`)
  }

  // Save debug PDF
  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(outputPath, pdfBytes)
  console.log(`  [${profileCode}] Debug overlay saved: ${outputPath}`)
}

/**
 * Main function to create all debug overlays.
 */
async function main() {
  console.log('=== Debug Overlay Generation ===\n')

  // Discover templates to get profile codes
  const profiles = discoverTemplates()
  console.log(`Found ${profiles.length} profiles to process`)

  // Paths
  const basePdfDir = path.join(process.cwd(), 'assets', 'report', 'base-pdf')
  const positionsDir = path.join(process.cwd(), 'assets', 'report', 'positions')
  const outputDir = path.join(process.cwd(), 'assets', 'report', 'debug')
  
  fs.mkdirSync(outputDir, { recursive: true })

  let successCount = 0
  let errorCount = 0

  for (const profile of profiles) {
    const basePdfPath = path.join(basePdfDir, `${profile.profileCode}.pdf`)
    const positionsPath = path.join(positionsDir, `${profile.profileCode}.json`)
    const outputPath = path.join(outputDir, `${profile.profileCode}.overlay.pdf`)

    try {
      await createDebugOverlayForProfile(
        profile.profileCode,
        basePdfPath,
        positionsPath,
        outputPath
      )
      successCount++
    } catch (err) {
      console.error(`  [${profile.profileCode}] Failed:`, err)
      errorCount++
    }
  }

  console.log('\n=== Debug Overlay Generation Complete ===')
  console.log(`Success: ${successCount}, Errors: ${errorCount}`)

  if (errorCount > 0) {
    console.log('\nNote: Some overlays failed. Run generate-base-pdfs and extract-positions first.')
  }
}

// CLI entry point
if (require.main === module) {
  main().catch((err) => {
    console.error('Debug overlay generation failed:', err)
    process.exit(1)
  })
}

export { createDebugOverlayForProfile, main as createAllDebugOverlays }
