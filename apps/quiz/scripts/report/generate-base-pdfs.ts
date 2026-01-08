/**
 * Generate Base PDFs Script
 * 
 * Build-time script that:
 * 1. Discovers all template profiles
 * 2. Creates temp copies with invisible placeholders
 * 3. Renders each HTML page to PDF
 * 4. Merges 9 pages into single base PDF per profile
 * 5. Saves to assets/report/base-pdf/<profileCode>.pdf
 * 
 * Requires: puppeteer (build-time only, browser allowed)
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { discoverTemplates, TemplateProfile } from './template-discovery'

// Dynamic imports for build-time dependencies
let puppeteer: any
let PDFDocument: typeof import('pdf-lib').PDFDocument

async function loadDependencies() {
  const puppeteerModule = await import('puppeteer')
  puppeteer = puppeteerModule.default
  const pdfLib = await import('pdf-lib')
  PDFDocument = pdfLib.PDFDocument
}

const PLACEHOLDER_SELECTORS = [
  'a[href="http://DBF_Naam"] span',
  'a[href="http://DBF_Voornaam"] span',
  'a[href="http://DBF_Datum"] span',
  'a[href="http://DBF_Stijl"] span',
]

const HTML_FILES = [
  'publication.html',
  'publication-1.html',
  'publication-2.html',
  'publication-3.html',
  'publication-4.html',
  'publication-5.html',
  'publication-6.html',
  'publication-7.html',
  'publication-8.html',
]

/**
 * Copies a directory recursively
 */
function copyDirectorySync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * Makes placeholders invisible in HTML content without layout shift.
 * Uses opacity:0 to hide text while preserving layout.
 */
function makePlaceholdersInvisible(htmlContent: string): string {
  let result = htmlContent

  // For each placeholder selector pattern, add opacity:0 to the span style
  // Pattern: <a href="http://DBF_XXX"><span ... style="...">...</span></a>
  const placeholderPatterns = [
    /(<a[^>]*href="http:\/\/DBF_Naam"[^>]*><span[^>]*)(style="[^"]*")([^>]*>)/gi,
    /(<a[^>]*href="http:\/\/DBF_Voornaam"[^>]*><span[^>]*)(style="[^"]*")([^>]*>)/gi,
    /(<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span[^>]*)(style="[^"]*")([^>]*>)/gi,
    /(<a[^>]*href="http:\/\/DBF_Stijl"[^>]*><span[^>]*)(style="[^"]*")([^>]*>)/gi,
  ]

  for (const pattern of placeholderPatterns) {
    result = result.replace(pattern, (match, prefix, styleAttr, suffix) => {
      // Add opacity:0 to existing style
      const newStyle = styleAttr.replace(/style="/, 'style="opacity:0;color:transparent;')
      return prefix + newStyle + suffix
    })
  }

  // Also handle spans without style attribute
  const noStylePatterns = [
    /(<a[^>]*href="http:\/\/DBF_Naam"[^>]*><span)([^>]*>)/gi,
    /(<a[^>]*href="http:\/\/DBF_Voornaam"[^>]*><span)([^>]*>)/gi,
    /(<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span)([^>]*>)/gi,
    /(<a[^>]*href="http:\/\/DBF_Stijl"[^>]*><span)([^>]*>)/gi,
  ]

  for (const pattern of noStylePatterns) {
    result = result.replace(pattern, (match, prefix, suffix) => {
      if (!match.includes('style="')) {
        return prefix + ' style="opacity:0;color:transparent;"' + suffix
      }
      return match
    })
  }

  return result
}

/**
 * Generates base PDF for a single profile.
 */
async function generateBasePdfForProfile(
  profile: TemplateProfile,
  outputDir: string,
  browser: import('puppeteer').Browser
): Promise<{ profileCode: string; pdfPath: string; pageCount: number }> {
  console.log(`\n[generate-base-pdfs] Processing profile: ${profile.profileCode}`)

  // Create temp directory for modified templates
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `disc-base-${profile.profileCode}-`))
  const tempHtmlDir = path.join(tempDir, 'html')
  
  try {
    // Copy entire publication-web-resources to temp
    const webResourcesDir = path.dirname(profile.htmlDir)
    copyDirectorySync(webResourcesDir, path.join(tempDir, 'publication-web-resources'))
    
    const actualTempHtmlDir = path.join(tempDir, 'publication-web-resources', 'html')

    // Process each HTML file to make placeholders invisible
    for (const htmlFile of HTML_FILES) {
      const htmlPath = path.join(actualTempHtmlDir, htmlFile)
      if (fs.existsSync(htmlPath)) {
        let content = fs.readFileSync(htmlPath, 'utf-8')
        content = makePlaceholdersInvisible(content)
        fs.writeFileSync(htmlPath, content, 'utf-8')
        console.log(`  [${htmlFile}] Placeholders made invisible`)
      }
    }

    // Render each HTML page to PDF
    const page = await browser.newPage()
    const pageBuffers: Buffer[] = []

    for (const htmlFile of HTML_FILES) {
      const htmlPath = path.join(actualTempHtmlDir, htmlFile)
      const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`

      // CRITICAL: Viewport must EXACTLY match HTML body dimensions (595×842)
      // The templates are InDesign exports with body width:595px height:842px
      // These are A4 dimensions in points (pt), notated as px
      // Using any other viewport causes scaling/centering with white padding
      const viewportWidth = 595
      const viewportHeight = 842
      await page.setViewport({ 
        width: viewportWidth, 
        height: viewportHeight, 
        deviceScaleFactor: 1 
      })
      
      console.log(`  [${htmlFile}] Viewport set to ${viewportWidth}×${viewportHeight}px`)
      
      await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 })

      // Wait for fonts to be loaded before rendering
      await page.evaluate(() => {
        const d = (globalThis as any).document
        return d?.fonts?.ready
      })

      // Get actual content dimensions BEFORE CSS injection
      const contentBoxBefore = await page.evaluate(() => {
        const d = (globalThis as any).document
        const body = d?.body
        return {
          width: body?.offsetWidth ?? 0,
          height: body?.offsetHeight ?? 0,
          scrollWidth: body?.scrollWidth ?? 0,
          scrollHeight: body?.scrollHeight ?? 0
        }
      })
      console.log(`  [${htmlFile}] Content box BEFORE: ${contentBoxBefore.width}×${contentBoxBefore.height}px`)

      // CRITICAL: Scale InDesign wrapper from 72dpi to 96dpi
      // InDesign export uses 595×842px canvas (A4 @ 72dpi)
      // Chrome/Puppeteer uses 96dpi → scale factor = 96/72 = 4/3 = 1.333333...
      // Solution: Apply transform scale to root wrapper, keep original dimensions
      await page.addStyleTag({
        content: `
          @page { 
            size: A4;
            margin: 0; 
          }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          /* Scale InDesign wrapper (72dpi → 96dpi) */
          body > div:first-child {
            transform: scale(1.333333) !important;
            transform-origin: top left !important;
            -webkit-transform: scale(1.333333) !important;
            -webkit-transform-origin: top left !important;
          }
        `
      })

      // Get content dimensions AFTER CSS injection for validation
      const contentBoxAfter = await page.evaluate(() => {
        const d = (globalThis as any).document
        const body = d?.body
        return {
          width: body?.offsetWidth ?? 0,
          height: body?.offsetHeight ?? 0,
          scrollWidth: body?.scrollWidth ?? 0,
          scrollHeight: body?.scrollHeight ?? 0
        }
      })
      console.log(`  [${htmlFile}] Content box AFTER:  ${contentBoxAfter.width}×${contentBoxAfter.height}px`)
      
      // Validate that content now matches A4 @ 96dpi (794×1123px)
      const expectedWidth = 794  // 210mm @ 96dpi
      const expectedHeight = 1123 // 297mm @ 96dpi
      const widthDiff = Math.abs(contentBoxAfter.width - expectedWidth)
      const heightDiff = Math.abs(contentBoxAfter.height - expectedHeight)
      
      if (widthDiff > 2 || heightDiff > 2) {
        console.warn(`  [${htmlFile}] Content size mismatch. Expected ${expectedWidth}×${expectedHeight}px, got ${contentBoxAfter.width}×${contentBoxAfter.height}px`)
      } else {
        console.log(`  [${htmlFile}] Content size validated: ${contentBoxAfter.width}×${contentBoxAfter.height}px`)
      }

      await page.emulateMediaType('print')

      // Convert A4 pt to inches: 595.28pt / 72 = 8.268in, 841.89pt / 72 = 11.693in
      const pdfBuffer = await page.pdf({
        width: '8.268in',
        height: '11.693in',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
        preferCSSPageSize: false,
        pageRanges: '1'
      })

      pageBuffers.push(Buffer.from(pdfBuffer))
      console.log(`  [${htmlFile}] Rendered to PDF (8.268in × 11.693in = 595.28pt × 841.89pt)`)
    }

    await page.close()

    // Merge all page PDFs into single document
    const mergedPdf = await PDFDocument.create()
    for (const buf of pageBuffers) {
      const doc = await PDFDocument.load(buf)
      const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices())
      copiedPages.forEach((p) => mergedPdf.addPage(p))
    }

    const mergedBytes = await mergedPdf.save()
    const pageCount = mergedPdf.getPageCount()

    // Validate page count
    if (pageCount !== 9) {
      throw new Error(`Expected 9 pages, got ${pageCount}`)
    }

    // Save to output directory
    const outputPath = path.join(outputDir, `${profile.profileCode}.pdf`)
    fs.writeFileSync(outputPath, mergedBytes)

    console.log(`  [${profile.profileCode}] Base PDF saved: ${outputPath} (${pageCount} pages, ${mergedBytes.byteLength} bytes)`)

    return {
      profileCode: profile.profileCode,
      pdfPath: outputPath,
      pageCount,
    }
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }
}

/**
 * Main function to generate all base PDFs.
 */
async function main() {
  console.log('=== Generate Base PDFs ===\n')

  await loadDependencies()

  // Discover templates
  const profiles = discoverTemplates()
  console.log(`Found ${profiles.length} profiles to process`)

  // Create output directory
  const outputDir = path.join(process.cwd(), 'assets', 'report', 'base-pdf')
  fs.mkdirSync(outputDir, { recursive: true })

  // Launch browser
  console.log('\nLaunching browser...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const results: Array<{ profileCode: string; pdfPath: string; pageCount: number }> = []

  try {
    for (const profile of profiles) {
      const result = await generateBasePdfForProfile(profile, outputDir, browser)
      results.push(result)
    }
  } finally {
    await browser.close()
  }

  console.log('\n=== Base PDF Generation Complete ===')
  console.log(`Generated ${results.length} base PDFs:`)
  for (const r of results) {
    console.log(`  - ${r.profileCode}: ${r.pageCount} pages`)
  }

  return results
}

// CLI entry point
if (require.main === module) {
  main().catch((err) => {
    console.error('Base PDF generation failed:', err)
    process.exit(1)
  })
}

export { generateBasePdfForProfile, main as generateAllBasePdfs }
