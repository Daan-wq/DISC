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
  source: 'DBF' | 'FALLBACK' | 'SELECTOR' | 'PERCENTAGE'
  styles?: {
    fontFamily?: string
    fontSize?: number  // in pt
    fontWeight?: string
    color?: string  // rgb(r,g,b) format
    textAlign?: string
    letterSpacing?: number  // in pt
    backgroundColor?: string  // rgb(r,g,b) format - for cover rectangles
  }
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
    // Percentage fields for the green table on page 2
    naturalD?: FieldPosition
    naturalI?: FieldPosition
    naturalS?: FieldPosition
    naturalC?: FieldPosition
    responseD?: FieldPosition
    responseI?: FieldPosition
    responseS?: FieldPosition
    responseC?: FieldPosition
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

    // Wait for fonts to be loaded before measuring
    await page.evaluate(() => document.fonts.ready)

    // Try DBF selector first - extract both rect AND styles
    const nameData = await page.evaluate(() => {
      const el = document.querySelector('a[href="http://DBF_Naam"] span') as HTMLElement
      if (el) {
        const rect = el.getBoundingClientRect()
        const styles = window.getComputedStyle(el)
        const parentStyles = el.parentElement ? window.getComputedStyle(el.parentElement) : null
        return {
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          styles: {
            fontFamily: styles.fontFamily,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: styles.fontWeight,
            color: styles.color,
            textAlign: styles.textAlign,
            letterSpacing: parseFloat(styles.letterSpacing) || 0,
          },
          backgroundColor: parentStyles?.backgroundColor || 'rgb(255, 255, 255)',
        }
      }
      return null
    })

    if (nameData && nameData.rect.width > 0) {
      positions.fields.name = {
        pageIndex: 0,
        rect: pxToPdfRect(nameData.rect),
        source: 'DBF',
        styles: {
          fontFamily: nameData.styles.fontFamily,
          fontSize: nameData.styles.fontSize * PX_TO_PT,
          fontWeight: nameData.styles.fontWeight,
          color: nameData.styles.color,
          textAlign: nameData.styles.textAlign,
          letterSpacing: nameData.styles.letterSpacing * PX_TO_PT,
          backgroundColor: nameData.backgroundColor,
        },
      }
      console.log(`  [page 0] name: found via DBF selector (font: ${nameData.styles.fontFamily}, weight: ${nameData.styles.fontWeight}, size: ${nameData.styles.fontSize}px, color: ${nameData.styles.color})`)
    } else {
      console.warn(`  [page 0] name: NOT FOUND`)
    }
  }

  // Page 1 (publication-1.html) - Extract date and style positions
  {
    const htmlPath = path.join(profile.htmlDir, 'publication-1.html')
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 })

    // Wait for fonts to be loaded before measuring
    await page.evaluate(() => document.fonts.ready)

    // Date - extract both rect AND styles
    const dateData = await page.evaluate(() => {
      const el = document.querySelector('a[href="http://DBF_Datum"] span') as HTMLElement
      if (el) {
        const rect = el.getBoundingClientRect()
        const styles = window.getComputedStyle(el)
        const parentStyles = el.parentElement ? window.getComputedStyle(el.parentElement) : null
        return {
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          styles: {
            fontFamily: styles.fontFamily,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: styles.fontWeight,
            color: styles.color,
            textAlign: styles.textAlign,
            letterSpacing: parseFloat(styles.letterSpacing) || 0,
          },
          backgroundColor: parentStyles?.backgroundColor || 'rgb(255, 255, 255)',
        }
      }
      return null
    })

    if (dateData && dateData.rect.width > 0) {
      positions.fields.date = {
        pageIndex: 1,
        rect: pxToPdfRect(dateData.rect),
        source: 'DBF',
        styles: {
          fontFamily: dateData.styles.fontFamily,
          fontSize: dateData.styles.fontSize * PX_TO_PT,
          fontWeight: dateData.styles.fontWeight,
          color: dateData.styles.color,
          textAlign: dateData.styles.textAlign,
          letterSpacing: dateData.styles.letterSpacing * PX_TO_PT,
          backgroundColor: dateData.backgroundColor,
        },
      }
      console.log(`  [page 1] date: found via DBF selector (font: ${dateData.styles.fontFamily}, weight: ${dateData.styles.fontWeight}, size: ${dateData.styles.fontSize}px, color: ${dateData.styles.color})`)
    }

    // Style - extract both rect AND styles
    const styleData = await page.evaluate(() => {
      const el = document.querySelector('a[href="http://DBF_Stijl"] span') as HTMLElement
      if (el) {
        const rect = el.getBoundingClientRect()
        const styles = window.getComputedStyle(el)
        const parentStyles = el.parentElement ? window.getComputedStyle(el.parentElement) : null
        return {
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          styles: {
            fontFamily: styles.fontFamily,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: styles.fontWeight,
            color: styles.color,
            textAlign: styles.textAlign,
            letterSpacing: parseFloat(styles.letterSpacing) || 0,
          },
          backgroundColor: parentStyles?.backgroundColor || 'rgb(255, 255, 255)',
        }
      }
      return null
    })

    if (styleData && styleData.rect.width > 0) {
      positions.fields.style = {
        pageIndex: 1,
        rect: pxToPdfRect(styleData.rect),
        source: 'DBF',
        styles: {
          fontFamily: styleData.styles.fontFamily,
          fontSize: styleData.styles.fontSize * PX_TO_PT,
          fontWeight: styleData.styles.fontWeight,
          color: styleData.styles.color,
          textAlign: styleData.styles.textAlign,
          letterSpacing: styleData.styles.letterSpacing * PX_TO_PT,
          backgroundColor: styleData.backgroundColor,
        },
      }
      console.log(`  [page 1] style: found via DBF selector (font: ${styleData.styles.fontFamily}, weight: ${styleData.styles.fontWeight}, size: ${styleData.styles.fontSize}px, color: ${styleData.styles.color})`)
    }

    // FirstName (same page, uses voornaam or name) - extract both rect AND styles
    const firstNameData = await page.evaluate(() => {
      let el = document.querySelector('a[href="http://DBF_Voornaam"] span') as HTMLElement
      if (!el) {
        el = document.querySelector('a[href="http://DBF_Naam"] span') as HTMLElement
      }
      if (el) {
        const rect = el.getBoundingClientRect()
        const styles = window.getComputedStyle(el)
        const parentStyles = el.parentElement ? window.getComputedStyle(el.parentElement) : null
        return {
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          styles: {
            fontFamily: styles.fontFamily,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: styles.fontWeight,
            color: styles.color,
            textAlign: styles.textAlign,
            letterSpacing: parseFloat(styles.letterSpacing) || 0,
          },
          backgroundColor: parentStyles?.backgroundColor || 'rgb(255, 255, 255)',
        }
      }
      return null
    })

    if (firstNameData && firstNameData.rect.width > 0) {
      positions.fields.firstName = {
        pageIndex: 1,
        rect: pxToPdfRect(firstNameData.rect),
        source: 'DBF',
        styles: {
          fontFamily: firstNameData.styles.fontFamily,
          fontSize: firstNameData.styles.fontSize * PX_TO_PT,
          fontWeight: firstNameData.styles.fontWeight,
          color: firstNameData.styles.color,
          textAlign: firstNameData.styles.textAlign,
          letterSpacing: firstNameData.styles.letterSpacing * PX_TO_PT,
          backgroundColor: firstNameData.backgroundColor,
        },
      }
      console.log(`  [page 1] firstName: found via DBF selector (font: ${firstNameData.styles.fontFamily}, weight: ${firstNameData.styles.fontWeight}, size: ${firstNameData.styles.fontSize}px, color: ${firstNameData.styles.color})`)
    }
  }

  // Page 2 (publication-2.html) - Extract chart position AND percentage positions
  {
    const htmlPath = path.join(profile.htmlDir, 'publication-2.html')
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 })

    // Wait for fonts to be loaded before measuring
    await page.evaluate(() => document.fonts.ready)

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

    // Extract percentage positions from _idContainer028 (Natural) and _idContainer029 (Response)
    // The HTML has 4 "0%" spans in each container for D, I, S, C
    const percentageData = await page.evaluate(() => {
      const result: { natural: any[]; response: any[] } = { natural: [], response: [] }
      
      // Find containers with 0% text - they're in _idContainer028 and _idContainer029
      const containers = document.querySelectorAll('div[id^="_idContainer"]')
      
      for (const container of containers) {
        const spans = container.querySelectorAll('span')
        const percentSpans: { rect: DOMRect; styles: CSSStyleDeclaration }[] = []
        
        for (const span of spans) {
          if (span.textContent?.trim() === '0%') {
            const rect = span.getBoundingClientRect()
            const styles = window.getComputedStyle(span)
            if (rect.width > 0 && rect.height > 0) {
              percentSpans.push({ rect, styles })
            }
          }
        }
        
        // If we found exactly 4 percentage spans, this is likely a DISC percentage container
        if (percentSpans.length === 4) {
          // Sort by vertical position (top to bottom = D, I, S, C)
          percentSpans.sort((a, b) => a.rect.top - b.rect.top)
          
          const extracted = percentSpans.map(({ rect, styles }) => ({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            fontFamily: styles.fontFamily,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: styles.fontWeight,
            color: styles.color,
            textAlign: styles.textAlign,
          }))
          
          // First container with 4 items is Natural, second is Response
          if (result.natural.length === 0) {
            result.natural = extracted
          } else if (result.response.length === 0) {
            result.response = extracted
          }
        }
      }
      
      return result
    })

    // Map percentage positions to fields
    const discKeys = ['D', 'I', 'S', 'C'] as const
    
    if (percentageData.natural.length === 4) {
      discKeys.forEach((key, index) => {
        const data = percentageData.natural[index]
        const fieldKey = `natural${key}` as keyof typeof positions.fields
        ;(positions.fields as any)[fieldKey] = {
          pageIndex: 2,
          rect: pxToPdfRect(data),
          source: 'PERCENTAGE' as const,
          styles: {
            fontFamily: data.fontFamily,
            fontSize: data.fontSize * PX_TO_PT,
            fontWeight: data.fontWeight,
            color: data.color,
            textAlign: data.textAlign,
          },
        }
      })
      console.log(`  [page 2] Natural percentages: found 4 positions`)
    } else {
      console.warn(`  [page 2] Natural percentages: NOT FOUND (found ${percentageData.natural.length})`)
    }

    if (percentageData.response.length === 4) {
      discKeys.forEach((key, index) => {
        const data = percentageData.response[index]
        const fieldKey = `response${key}` as keyof typeof positions.fields
        ;(positions.fields as any)[fieldKey] = {
          pageIndex: 2,
          rect: pxToPdfRect(data),
          source: 'PERCENTAGE' as const,
          styles: {
            fontFamily: data.fontFamily,
            fontSize: data.fontSize * PX_TO_PT,
            fontWeight: data.fontWeight,
            color: data.color,
            textAlign: data.textAlign,
          },
        }
      })
      console.log(`  [page 2] Response percentages: found 4 positions`)
    } else {
      console.warn(`  [page 2] Response percentages: NOT FOUND (found ${percentageData.response.length})`)
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
