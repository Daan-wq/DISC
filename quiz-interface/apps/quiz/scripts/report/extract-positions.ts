/**
 * Extract Positions Script
 * 
 * Build-time script that:
 * 1. Opens each HTML template in headless browser
 * 2. Measures placeholder and chart element positions via getBoundingClientRect()
 * 3. Converts px to pt and applies y-flip for PDF coordinate system
 * 4. Saves positions JSON for each profile
 * 
 * Requires: puppeteer (build-time only)
 */

import fs from 'fs'
import path from 'path'
import { discoverTemplates, TemplateProfile } from './template-discovery'

// Dynamic import for puppeteer
let puppeteer: typeof import('puppeteer')

async function loadDependencies() {
  puppeteer = await import('puppeteer')
}

// A4 dimensions in points (72 dpi)
const PAGE_WIDTH_PT = 595.28
const PAGE_HEIGHT_PT = 841.89

// px to pt conversion factor (96 dpi to 72 dpi)
const PX_TO_PT = 0.75

export interface FieldPosition {
  pageIndex: number
  rect: {
    x: number  // pt from left
    y: number  // pt from bottom (PDF coords)
    w: number  // width in pt
    h: number  // height in pt
  }
  source: 'DBF' | 'FALLBACK' | 'SELECTOR'
}

export interface PositionsData {
  templateVersion: string
  profileCode: string
  pages: number
  fields: {
    name?: FieldPosition
    firstName?: FieldPosition
    date?: FieldPosition
    style?: FieldPosition
    chart?: FieldPosition
  }
}

const HTML_FILES = [
  'publication.html',      // page 0 - cover with name
  'publication-1.html',    // page 1 - date/style
  'publication-2.html',    // page 2 - chart
  'publication-3.html',
  'publication-4.html',
  'publication-5.html',
  'publication-6.html',
  'publication-7.html',
  'publication-8.html',
]

/**
 * Convert screen px rect to PDF pt with y-flip.
 */
function pxToPdfRect(rect: { top: number; left: number; width: number; height: number }): { x: number; y: number; w: number; h: number } {
  const xPt = rect.left * PX_TO_PT
  const wPt = rect.width * PX_TO_PT
  const hPt = rect.height * PX_TO_PT
  const topPt = rect.top * PX_TO_PT
  
  // Y-flip: PDF origin is bottom-left
  const yPt = PAGE_HEIGHT_PT - (topPt + hPt)
  
  return {
    x: Math.round(xPt * 100) / 100,
    y: Math.round(yPt * 100) / 100,
    w: Math.round(wPt * 100) / 100,
    h: Math.round(hPt * 100) / 100,
  }
}

/**
 * Extracts positions from a single profile's HTML templates.
 */
async function extractPositionsForProfile(
  profile: TemplateProfile,
  outputDir: string,
  browser: import('puppeteer').Browser
): Promise<PositionsData> {
  console.log(`\n[extract-positions] Processing profile: ${profile.profileCode}`)

  const page = await browser.newPage()
  
  // Set viewport to match A4 at 96dpi
  await page.setViewport({ 
    width: Math.round(PAGE_WIDTH_PT / PX_TO_PT), 
    height: Math.round(PAGE_HEIGHT_PT / PX_TO_PT), 
    deviceScaleFactor: 1 
  })

  const positions: PositionsData = {
    templateVersion: new Date().toISOString().split('T')[0],
    profileCode: profile.profileCode,
    pages: 9,
    fields: {},
  }

  // Page 0 (publication.html) - Extract name position
  {
    const htmlPath = path.join(profile.htmlDir, 'publication.html')
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 })

    // Try DBF selector first
    const nameRect = await page.evaluate(() => {
      const el = document.querySelector('a[href="http://DBF_Naam"] span') as HTMLElement
      if (el) {
        const rect = el.getBoundingClientRect()
        return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      }
      return null
    })

    if (nameRect && nameRect.width > 0) {
      positions.fields.name = {
        pageIndex: 0,
        rect: pxToPdfRect(nameRect),
        source: 'DBF',
      }
      console.log(`  [page 0] name: found via DBF selector`)
    } else {
      console.warn(`  [page 0] name: NOT FOUND`)
    }
  }

  // Page 1 (publication-1.html) - Extract date and style positions
  {
    const htmlPath = path.join(profile.htmlDir, 'publication-1.html')
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 })

    // Date
    const dateRect = await page.evaluate(() => {
      const el = document.querySelector('a[href="http://DBF_Datum"] span') as HTMLElement
      if (el) {
        const rect = el.getBoundingClientRect()
        return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      }
      return null
    })

    if (dateRect && dateRect.width > 0) {
      positions.fields.date = {
        pageIndex: 1,
        rect: pxToPdfRect(dateRect),
        source: 'DBF',
      }
      console.log(`  [page 1] date: found via DBF selector`)
    }

    // Style
    const styleRect = await page.evaluate(() => {
      const el = document.querySelector('a[href="http://DBF_Stijl"] span') as HTMLElement
      if (el) {
        const rect = el.getBoundingClientRect()
        return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      }
      return null
    })

    if (styleRect && styleRect.width > 0) {
      positions.fields.style = {
        pageIndex: 1,
        rect: pxToPdfRect(styleRect),
        source: 'DBF',
      }
      console.log(`  [page 1] style: found via DBF selector`)
    }

    // FirstName (same page, uses voornaam or name)
    const firstNameRect = await page.evaluate(() => {
      let el = document.querySelector('a[href="http://DBF_Voornaam"] span') as HTMLElement
      if (!el) {
        el = document.querySelector('a[href="http://DBF_Naam"] span') as HTMLElement
      }
      if (el) {
        const rect = el.getBoundingClientRect()
        return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      }
      return null
    })

    if (firstNameRect && firstNameRect.width > 0) {
      positions.fields.firstName = {
        pageIndex: 1,
        rect: pxToPdfRect(firstNameRect),
        source: 'DBF',
      }
      console.log(`  [page 1] firstName: found via DBF selector`)
    }
  }

  // Page 2 (publication-2.html) - Extract chart position
  {
    const htmlPath = path.join(profile.htmlDir, 'publication-2.html')
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 })

    // Find chart image by class pattern used in templates
    const chartRect = await page.evaluate(() => {
      // Try multiple selectors for the chart image
      const selectors = [
        'img._idGenObjectAttribute-1._idGenObjectAttribute-2[src*="image/"]',
        'img[class*="_idGenObjectAttribute-1"][class*="_idGenObjectAttribute-2"]',
        'img[src*="../image/"]',
      ]
      
      for (const selector of selectors) {
        const imgs = document.querySelectorAll(selector)
        for (const img of imgs) {
          const el = img as HTMLElement
          const rect = el.getBoundingClientRect()
          // Chart should be reasonably large (>100px)
          if (rect.width > 100 && rect.height > 100) {
            return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
          }
        }
      }
      return null
    })

    if (chartRect && chartRect.width > 0) {
      positions.fields.chart = {
        pageIndex: 2,
        rect: pxToPdfRect(chartRect),
        source: 'SELECTOR',
      }
      console.log(`  [page 2] chart: found (${chartRect.width}x${chartRect.height}px)`)
    } else {
      console.warn(`  [page 2] chart: NOT FOUND - will need manual configuration`)
    }
  }

  await page.close()

  // Validate required fields
  const requiredFields = ['name', 'chart'] as const
  for (const field of requiredFields) {
    if (!positions.fields[field]) {
      console.error(`  [VALIDATION] Missing required field: ${field}`)
    }
  }

  // Save positions JSON
  const outputPath = path.join(outputDir, `${profile.profileCode}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(positions, null, 2))
  console.log(`  [${profile.profileCode}] Positions saved: ${outputPath}`)

  return positions
}

/**
 * Main function to extract all positions.
 */
async function main() {
  console.log('=== Extract Positions ===\n')

  await loadDependencies()

  // Discover templates
  const profiles = discoverTemplates()
  console.log(`Found ${profiles.length} profiles to process`)

  // Create output directory
  const outputDir = path.join(process.cwd(), 'assets', 'report', 'positions')
  fs.mkdirSync(outputDir, { recursive: true })

  // Launch browser
  console.log('\nLaunching browser...')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const results: PositionsData[] = []

  try {
    for (const profile of profiles) {
      const positions = await extractPositionsForProfile(profile, outputDir, browser)
      results.push(positions)
    }
  } finally {
    await browser.close()
  }

  console.log('\n=== Position Extraction Complete ===')
  console.log(`Extracted positions for ${results.length} profiles`)

  // Summary of field coverage
  const fieldCounts: Record<string, number> = {}
  for (const pos of results) {
    for (const [field, data] of Object.entries(pos.fields)) {
      if (data) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1
      }
    }
  }
  console.log('\nField coverage:')
  for (const [field, count] of Object.entries(fieldCounts)) {
    console.log(`  - ${field}: ${count}/${results.length} profiles`)
  }

  return results
}

// CLI entry point
if (require.main === module) {
  main().catch((err) => {
    console.error('Position extraction failed:', err)
    process.exit(1)
  })
}

export { extractPositionsForProfile, main as extractAllPositions }
