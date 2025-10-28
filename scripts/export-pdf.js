#!/usr/bin/env node
/*
 Simple HTML→PDF export script for A4 exact-fit verification.
 Usage:
   node scripts/export-pdf.js --profile=CD --out=dist/report.pdf
*/
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(arg => {
      const [k, v] = arg.replace(/^--/, '').split('=')
      return [k, v ?? true]
    })
  )
  if (!args.profile) {
    console.error('Missing --profile=<code> (e.g., CD, CI, SI, etc.)')
    process.exit(1)
  }
  if (!args.out) {
    args.out = path.join(process.cwd(), 'dist', `report-${args.profile}.pdf`)
  }
  return args
}

function mapFolder(profileCode) {
  const m = {
    'DC': '1 DC Basis profiel plus The Lean Communication',
    'CD': '1 CD Basis profiel plus The Lean Communication',
    'CI': '1 CI Basis profiel plus The Lean Communication',
    'CS': '1 CS Basis profiel plus The Lean Communication',
    'DI': '1 DI Basis profiel plus The Lean Communication',
    'DS': '1 DS Basis profiel plus The Lean Communication',
    'IC': '1 IC Basis profiel plus The Lean Communication',
    'ID': '1 ID Basis profiel plus The Lean Communication',
    'IS': '1 IS Basis profiel plus The Lean Communication',
    'SC': '1 SC Basis profiel plus The Lean Communication',
    'SD': '1 SD Basis profiel plus The Lean Communication',
    'SI': '1 SI Basis profiel plus The Lean Communication'
  }
  const folder = m[profileCode.toUpperCase()]
  if (!folder) throw new Error(`Unknown profile code: ${profileCode}`)
  return folder
}

async function main() {
  const { profile, out } = parseArgs()

  const projectRoot = path.join(process.cwd())
  const templatesRoot = path.join(projectRoot, 'Profile rapport templates')
  const folderName = mapFolder(profile)
  const templateDir = path.join(templatesRoot, folderName)
  const htmlDir = path.join(templateDir, 'publication-web-resources', 'html')
  const cssPath = path.join(templateDir, 'publication-web-resources', 'css', 'idGeneratedStyles.css')

  if (!fs.existsSync(htmlDir)) {
    console.error('HTML directory not found:', htmlDir)
    process.exit(1)
  }

  const htmlFiles = [
    'publication.html',
    'publication-1.html',
    'publication-2.html',
    'publication-3.html',
    'publication-4.html',
    'publication-5.html',
    'publication-6.html',
    'publication-7.html',
    'publication-8.html'
  ]

  let cssContent = ''
  if (fs.existsSync(cssPath)) {
    cssContent = fs.readFileSync(cssPath, 'utf-8')
    // Fix relative font paths to absolute file URLs
    const fontDirFileUrl = `file:///${path.join(templateDir, 'font').replace(/\\/g, '/')}/`
    cssContent = cssContent.replace(/url\("\.\.\/\.\.\/font\//g, `url("${fontDirFileUrl}`)
  }

  const processedPages = []
  for (const name of htmlFiles) {
    const file = path.join(htmlDir, name)
    if (!fs.existsSync(file)) continue
    const content = fs.readFileSync(file, 'utf-8')
    const match = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (!match) continue
    const bodyContent = match[1]
    processedPages.push(`
      <div class="report-page">
        <div class="page-inner">
          ${bodyContent}
        </div>
      </div>
    `)
  }

  const baseUrl = `file:///${htmlDir.replace(/\\/g, '/')}/`
  const combinedHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <base href="${baseUrl}">
        <style>
          ${cssContent}
          @page { size: A4; margin: 0; }
          html, body {
            margin: 0 !important; padding: 0 !important;
            width: 210mm; min-height: 297mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .report-page {
            --page-w: 210mm; --page-h: 297mm;
            --m-top: 0mm; --m-right: 0mm; --m-bottom: 0mm; --m-left: 0mm;
            width: calc(var(--page-w) - var(--m-left) - var(--m-right));
            min-height: calc(var(--page-h) - var(--m-top) - var(--m-bottom));
            margin: var(--m-top) var(--m-right) var(--m-bottom) var(--m-left);
            box-sizing: border-box; position: relative; overflow: hidden;
            break-after: page;
          }
          .report-page:last-child { break-after: avoid; }
          .report-page, #report, .page-inner { max-width: none !important; }
          .page-inner { width: 595px; height: 842px; transform-origin: top left; transform: scale(1.3333333333); }
        </style>
      </head>
      <body>
        ${processedPages.join('')}
      </body>
    </html>
  `

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })

    // Load content with relaxed lifecycle; we will manually await images/fonts
    await page.setContent(combinedHtml, { waitUntil: 'domcontentloaded' })

    // Wait for images/fonts
    await page.evaluate(() => {
      return Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        ...Array.from(document.images, img => img.complete ? Promise.resolve() : new Promise((res, rej) => { img.addEventListener('load', res); img.addEventListener('error', rej); }))
      ])
    })

    await page.emulateMediaType('print')

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(out), { recursive: true })

    const pdfBuffer = await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    })

    console.log(`PDF exported: ${out} (${pdfBuffer.length} bytes)`)    
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
