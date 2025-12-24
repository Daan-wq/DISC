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
let puppeteer: typeof import('puppeteer')
let PDFDocument: typeof import('pdf-lib').PDFDocument

async function loadDependencies() {
  puppeteer = await import('puppeteer')
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

      await page.setViewport({ width: 595, height: 842, deviceScaleFactor: 2 })
      await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 })

      // Inject A4 print styles
      await page.addStyleTag({
        content: `
          @page { size: A4; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm;
            min-height: 297mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: white;
          }
        `
      })

      await page.emulateMediaType('print')

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        preferCSSPageSize: true,
        pageRanges: '1'
      })

      pageBuffers.push(Buffer.from(pdfBuffer))
      console.log(`  [${htmlFile}] Rendered to PDF`)
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
  const browser = await puppeteer.default.launch({
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
