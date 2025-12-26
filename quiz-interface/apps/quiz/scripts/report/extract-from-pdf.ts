/**
 * Extract coordinates directly from PDF by finding placeholder text
 * Outputs precise bounding boxes for overlays
 */

import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// PDF.js setup for text extraction
const pdfjsLib = { getDocument }

interface TextItem {
  str: string
  transform: number[] // [scaleX, skewY, skewX, scaleY, x, y]
  width: number
  height: number
}

interface BoundingBox {
  x: number      // PDF pt, bottom-left origin
  y: number      // PDF pt, bottom-left origin
  w: number      // width in pt
  h: number      // height in pt
}

const PAGE_HEIGHT_PT = 841.89 // A4 height in pt

/**
 * Extract text items with positions from a PDF page
 */
async function extractTextFromPage(pdfPath: string, pageNum: number): Promise<TextItem[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath))
  const loadingTask = pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true })
  const pdf = await loadingTask.promise
  
  const page = await pdf.getPage(pageNum)
  const textContent = await page.getTextContent()
  
  return textContent.items.map((item: any) => ({
    str: item.str,
    transform: item.transform,
    width: item.width,
    height: item.height,
  }))
}

/**
 * Find bounding box of a specific text string
 */
function findTextBoundingBox(items: TextItem[], searchText: string): BoundingBox | null {
  for (const item of items) {
    if (item.str.includes(searchText)) {
      // transform[4] = x, transform[5] = y (bottom-left in PDF coordinates)
      return {
        x: item.transform[4],
        y: item.transform[5],
        w: item.width,
        h: item.height,
      }
    }
  }
  return null
}

/**
 * Main extraction function
 */
async function extractPositionsFromPDF(profileCode: string) {
  const basePdfPath = path.join(process.cwd(), 'assets', 'report', 'base-pdf', `${profileCode}.pdf`)
  
  if (!fs.existsSync(basePdfPath)) {
    console.error(`PDF not found: ${basePdfPath}`)
    return
  }

  console.log(`\nExtracting positions from ${profileCode}.pdf...`)
  
  const positions: any = {
    templateVersion: new Date().toISOString().split('T')[0],
    profileCode,
    pages: 9,
    fields: {},
  }

  // Page 1 (index 0): <<Naam>>
  console.log('  Extracting from page 1...')
  const page1Items = await extractTextFromPage(basePdfPath, 1)
  const nameBox = findTextBoundingBox(page1Items, '<<Naam>>')
  if (nameBox) {
    positions.fields.name = {
      pageIndex: 0,
      rect: {
        x: nameBox.x,
        y: nameBox.y,
        w: nameBox.w,
        h: nameBox.h,
      },
      source: 'PDF_EXTRACTION',
      styles: {
        fontFamily: '"PT Sans", sans-serif',
        fontSize: nameBox.h, // Use height as fontSize approximation
        fontWeight: '400',
        color: 'rgb(70, 149, 96)',
        textAlign: 'center', // Center all overlay text
        letterSpacing: 0,
      },
    }
    console.log(`    ✓ Found <<Naam>>: x=${nameBox.x.toFixed(2)}, y=${nameBox.y.toFixed(2)}, w=${nameBox.w.toFixed(2)}, h=${nameBox.h.toFixed(2)}`)
  } else {
    console.warn('    ✗ <<Naam>> not found')
  }

  // Page 2 (index 1): <<Voornaam>>, <<Datum>>, <<Stijl>>
  console.log('  Extracting from page 2...')
  const page2Items = await extractTextFromPage(basePdfPath, 2)
  
  const firstNameBox = findTextBoundingBox(page2Items, '<<Voornaam>>')
  if (firstNameBox) {
    positions.fields.firstName = {
      pageIndex: 1,
      rect: {
        x: firstNameBox.x,
        y: firstNameBox.y,
        w: firstNameBox.w,
        h: firstNameBox.h,
      },
      source: 'PDF_EXTRACTION',
      styles: {
        fontFamily: '"PT Sans", sans-serif',
        fontSize: firstNameBox.h,
        fontWeight: '400',
        color: 'rgb(70, 149, 96)',
        textAlign: 'center',
        letterSpacing: -1.74,
      },
    }
    console.log(`    ✓ Found <<Voornaam>>: x=${firstNameBox.x.toFixed(2)}, y=${firstNameBox.y.toFixed(2)}`)
  }

  const dateBox = findTextBoundingBox(page2Items, '<<Datum>>')
  if (dateBox) {
    positions.fields.date = {
      pageIndex: 1,
      rect: {
        x: dateBox.x,
        y: dateBox.y,
        w: dateBox.w,
        h: dateBox.h,
      },
      source: 'PDF_EXTRACTION',
      styles: {
        fontFamily: '"PT Sans", sans-serif',
        fontSize: dateBox.h,
        fontWeight: '700',
        color: 'rgb(2, 2, 3)',
        textAlign: 'center',
        letterSpacing: 0,
      },
    }
    console.log(`    ✓ Found <<Datum>>: x=${dateBox.x.toFixed(2)}, y=${dateBox.y.toFixed(2)}`)
  }

  const styleBox = findTextBoundingBox(page2Items, '<<Stijl>>')
  if (styleBox) {
    positions.fields.style = {
      pageIndex: 1,
      rect: {
        x: styleBox.x,
        y: styleBox.y,
        w: styleBox.w,
        h: styleBox.h,
      },
      source: 'PDF_EXTRACTION',
      styles: {
        fontFamily: '"PT Sans", sans-serif',
        fontSize: styleBox.h,
        fontWeight: '700',
        color: 'rgb(2, 2, 3)',
        textAlign: 'center',
        letterSpacing: 0,
      },
    }
    console.log(`    ✓ Found <<Stijl>>: x=${styleBox.x.toFixed(2)}, y=${styleBox.y.toFixed(2)}`)
  }

  // Page 3 (index 2): Chart area and 8× "0%" percentages
  console.log('  Extracting from page 3...')
  const page3Items = await extractTextFromPage(basePdfPath, 3)
  
  // Find all "0%" on page 3
  const zeroPercentItems = page3Items.filter(item => item.str === '0%')
  console.log(`    Found ${zeroPercentItems.length} instances of "0%"`)
  
  // Sort by Y coordinate (top to bottom, remembering PDF is bottom-left origin)
  // Higher Y = higher on page
  const sortedByY = [...zeroPercentItems].sort((a, b) => b.transform[5] - a.transform[5])
  
  // The 8 percentages should be in the green table (right side)
  // Filter by X position (should be > 400 for right side table)
  const tablePercentages = sortedByY.filter(item => item.transform[4] > 380)
  
  console.log(`    Filtered to ${tablePercentages.length} table percentages`)
  
  // Map to DISC fields (should be 8: Natural D/I/S/C, Response D/I/S/C)
  // Group by X position (Natural vs Response column)
  const naturalCol = tablePercentages.filter(item => item.transform[4] < 450)
  const responseCol = tablePercentages.filter(item => item.transform[4] >= 450)
  
  const fieldNames = ['naturalD', 'naturalI', 'naturalS', 'naturalC']
  naturalCol.slice(0, 4).forEach((item, i) => {
    const fieldName = fieldNames[i]
    positions.fields[fieldName] = {
      pageIndex: 2,
      rect: {
        x: item.transform[4],
        y: item.transform[5],
        w: item.width,
        h: item.height,
      },
      source: 'PERCENTAGE',
      styles: {
        fontFamily: '"PT Sans", sans-serif',
        fontSize: item.height,
        fontWeight: '400',
        color: 'rgb(255, 255, 255)',
        textAlign: 'center',
      },
    }
    console.log(`    ✓ ${fieldName}: x=${item.transform[4].toFixed(2)}, y=${item.transform[5].toFixed(2)}`)
  })
  
  const responseFieldNames = ['responseD', 'responseI', 'responseS', 'responseC']
  responseCol.slice(0, 4).forEach((item, i) => {
    const fieldName = responseFieldNames[i]
    positions.fields[fieldName] = {
      pageIndex: 2,
      rect: {
        x: item.transform[4],
        y: item.transform[5],
        w: item.width,
        h: item.height,
      },
      source: 'PERCENTAGE',
      styles: {
        fontFamily: '"PT Sans", sans-serif',
        fontSize: item.height,
        fontWeight: '400',
        color: 'rgb(255, 255, 255)',
        textAlign: 'center',
      },
    }
    console.log(`    ✓ ${fieldName}: x=${item.transform[4].toFixed(2)}, y=${item.transform[5].toFixed(2)}`)
  })

  // Chart area - hardcoded based on visual inspection
  // These values come from your measurements
  positions.fields.chart = {
    pageIndex: 2,
    rect: {
      x: 64.02,
      y: 99.83,
      w: 277.20,
      h: 215.99,
    },
    source: 'SELECTOR',
  }
  console.log(`    ✓ Chart area set manually`)

  // Save to positions file
  const outputPath = path.join(process.cwd(), 'assets', 'report', 'positions', `${profileCode}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(positions, null, 2))
  console.log(`\n✓ Saved to: ${outputPath}`)
  
  return positions
}

// CLI
if (require.main === module) {
  const profileCode = process.argv[2] || 'CD'
  extractPositionsFromPDF(profileCode)
    .then(() => console.log('\n✓ Extraction complete'))
    .catch(err => {
      console.error('\n✗ Extraction failed:', err)
      process.exit(1)
    })
}
