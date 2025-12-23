import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import path from 'path'
import fs from 'fs'

export interface BrowserLaunchResult {
  browser: Browser
  strategy: 'local' | 'browserless'
  launchMs: number
}

/**
 * Launch browser with local chromium first, browserless fallback if configured
 * NEVER uses full puppeteer - only puppeteer-core + @sparticuz/chromium
 */
export async function launchBrowser(): Promise<BrowserLaunchResult> {
  const startTime = Date.now()
  const browserlessUrl = process.env.BROWSERLESS_WS_URL
  
  console.log('[pdf] launchBrowser - platform:', process.platform, 'browserless configured:', !!browserlessUrl)
  
  // Try local chromium first (preferred for speed and cost)
  try {
    const executablePath = await chromium.executablePath()
    console.log('[pdf] Chromium executable path:', executablePath)
    
    if (!fs.existsSync(executablePath)) {
      throw new Error(`Chromium executable not found at ${executablePath}`)
    }
    
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--font-render-hinting=medium',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    })
    
    const launchMs = Date.now() - startTime
    console.log(`[pdf] Local chromium launched in ${launchMs}ms`)
    return { browser, strategy: 'local', launchMs }
  } catch (localError: any) {
    console.error('[pdf] Local chromium failed:', localError?.message)
    
    // Fallback to browserless if configured
    if (browserlessUrl) {
      console.log('[pdf] Attempting browserless fallback...')
      try {
        const browser = await puppeteer.connect({
          browserWSEndpoint: browserlessUrl,
        })
        const launchMs = Date.now() - startTime
        console.log(`[pdf] Browserless connected in ${launchMs}ms`)
        return { browser, strategy: 'browserless', launchMs }
      } catch (browserlessError: any) {
        throw new Error(`PDF_LAUNCH_FAILED: Both local (${localError?.message}) and browserless (${browserlessError?.message}) failed`)
      }
    }
    
    throw new Error(`PDF_LAUNCH_FAILED: Local chromium failed: ${localError?.message}. Set BROWSERLESS_WS_URL for fallback.`)
  }
}

/**
 * Render HTML to PDF using Puppeteer
 * Preserves all styles and formatting from the original HTML template
 */
export async function renderPdfFromHtml(
  html: string, 
  profileCode: string
): Promise<Buffer> {
  const { browser, strategy, launchMs } = await launchBrowser()
  console.log(`[pdf] renderPdfFromHtml - strategy: ${strategy}, launchMs: ${launchMs}`)

  try {
    const page = await browser.newPage()
    
    // Set the base path for resources (CSS, images, fonts)
    // This allows relative paths in the HTML to resolve correctly
    const templateMap: Record<string, string> = {
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
      'SI': '1 SI Basis profiel plus The Lean Communication',
      'C': '1 C Basis profiel plus The Lean Communication',
      'D': '1 D Basis profiel plus The Lean Communication',
      'I': '1 I Basis profiel plus The Lean Communication',
      'S': '1 S Basis profiel plus The Lean Communication'
    }
    
    const folderName = templateMap[profileCode.toUpperCase()]
    const basePath = `file:///${path.join(
      process.cwd(),
      'Profile rapport templates',
      folderName,
      'publication-web-resources/html'
    ).replace(/\\/g, '/')}/`
    
    // Build CSS content from the template and correct font URLs to absolute file URLs
    const templateDir = path.join(
      process.cwd(),
      'Profile rapport templates',
      folderName
    )
    const cssPath = path.join(templateDir, 'publication-web-resources', 'css', 'idGeneratedStyles.css')
    let cssContent = ''
    if (fs.existsSync(cssPath)) {
      cssContent = fs.readFileSync(cssPath, 'utf-8')
      const fontDirFileUrl = `file:///${path.join(templateDir, 'font').replace(/\\/g, '/')}/`
      cssContent = cssContent.replace(/url\("\.\.\/\.\.\/font\//g, `url("${fontDirFileUrl}`)
    }

    // If the provided HTML is a full doc, extract only the <body> content; otherwise use as-is
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyOnly = bodyMatch ? bodyMatch[1] : html

    // Compose a complete HTML document with a base href pointing to the template's html dir
    const fullHtml = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <base href="${basePath}">
        <style>${cssContent}</style>
      </head>
      <body>${bodyOnly}</body>
      </html>`

    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })

    // Inject print CSS to ensure exact A4 sizing with no extra margins
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
        }
        /* Using native font metrics; kerning/ligatures unchanged now that fonts are installed */
        .report-page {
          --page-w: 210mm;
          --page-h: 297mm;
          --m-top: 0mm;
          --m-right: 0mm;
          --m-bottom: 0mm;
          --m-left: 0mm;
          width: calc(var(--page-w) - var(--m-left) - var(--m-right));
          min-height: calc(var(--page-h) - var(--m-top) - var(--m-bottom));
          margin: var(--m-top) var(--m-right) var(--m-bottom) var(--m-left);
          box-sizing: border-box;
          position: relative;
          overflow: visible;
          break-after: page;
        }
        .report-page:last-child { break-after: avoid; }
        html, body, .report-page, .page-inner { overflow: visible !important; }
        /* Scale InDesign's 595.28×841.89 px coordinates (72dpi) to CSS 96dpi A4 */
        .page-inner {
          width: 595.28px;
          height: 841.89px;
          position: relative;
          transform-origin: top left;
          /* Exact 96/72 scaling, no translate to avoid left white strip */
          transform: scale(1.3333333333);
        }
      `
    })

    // Wrap the existing body content so it fills the page at print time
    await page.evaluate(() => {
      const body = document.body
      const original = body.innerHTML
      body.innerHTML = '<div class="report-page"><div class="page-inner">' + original + '</div></div>'
    })

    // Page-specific fine-tuning to match visual alignment from the original InDesign export
    // Align the end (right edge) of the profile code with the end of "www.tlcprofielen.nl" on publication-1
    await page.evaluate(() => {
      try {
        const bodyId = document.body.id
        if (bodyId === 'publication-1') {
          const website = document.getElementById('_idTextSpan398') as HTMLElement | null // www.tlcprofielen.nl
          const styleSpan = document.getElementById('_idTextSpan403') as HTMLElement | null // <<Stijl>>
          if (website && styleSpan) {
            const wRect = website.getBoundingClientRect()
            const sRect = styleSpan.getBoundingClientRect()
            const rightDeltaCssPx = (wRect.left + wRect.width) - (sRect.left + sRect.width)
            if (Math.abs(rightDeltaCssPx) > 0.1) {
              // Spans live inside a container scaled to 5% (scale(0.05)); convert CSS px back to inner coordinate
              const scale = 0.05
              const currentLeft = parseFloat(styleSpan.style.left || '0') || 0
              styleSpan.style.left = (currentLeft + rightDeltaCssPx / scale).toFixed(2) + 'px'
            }
          }
        }
      } catch (e) {
        console.warn('Publication-specific alignment tweak skipped:', e)
      }
    })

    // Wait for any dynamic content to load (fonts/images)
    await page.evaluateHandle('document.fonts.ready')

    // Use print media styles
    await page.emulateMediaType('print')

    // Generate PDF with zero margins; CSS controls layout and margins
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      preferCSSPageSize: true
    })
    
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

/**
 * Render PDF from complete HTML document (with embedded styles)
 */
export async function renderPdfFromCompleteHtml(html: string): Promise<Buffer> {
  const { browser, strategy, launchMs } = await launchBrowser()
  console.log(`[pdf] renderPdfFromCompleteHtml - strategy: ${strategy}, launchMs: ${launchMs}`)

  try {
    const page = await browser.newPage()
    
    // Set content directly - use 'load' instead of 'networkidle0' for speed
    await page.setContent(html, { 
      waitUntil: 'load'
    })
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready')
    
    // Add custom styles for PDF rendering
    await page.addStyleTag({
      content: `
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Ensure page breaks work correctly */
          .page-break {
            page-break-after: always;
          }
          
          /* Hide navigation elements */
          .prev, .next, .no-print {
            display: none !important;
          }
        }
      `
    })
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      },
      preferCSSPageSize: false,
      scale: 0.9
    })
    
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

// Helper types for placeholder replacement and graph insertion
export type GraphOptions = {
  // If provided, inject the graph into the element matched by this selector (e.g., '#graph' or '.graph-placeholder')
  selector?: string
  // Provide the graph as a data URL image (e.g., 'data:image/png;base64,...')
  dataUrl?: string
  // Or provide raw HTML markup for the graph container (e.g., an SVG string)
  html?: string
  // Optional sizing (applies to img tag if dataUrl provided)
  width?: number
  height?: number
  // How to insert relative to the target element
  insertMode?: 'replace' | 'append' | 'prepend'
  // If you prefer token replacement inside HTML (without DOM selector), list the tokens to replace, e.g. ['{{GRAPH}}','[[GRAPH]]']
  placeholderTokens?: string[]
}

// Render directly from an original template HTML file without modifying template files on disk.
// Supports in-memory placeholder replacement and optional graph injection.
export async function renderPdfFromTemplateFile(
  profileCode: string,
  fileNameOrPage: string | number,
  replacements?: Record<string, string>,
  graph?: GraphOptions
): Promise<Buffer> {
  const { browser, strategy, launchMs } = await launchBrowser()
  console.log(`[pdf] renderPdfFromTemplateFile - strategy: ${strategy}, launchMs: ${launchMs}`)
  try {
    const page = await browser.newPage()

    // Resolve template folder
    const templateMap: Record<string, string> = {
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
      'SI': '1 SI Basis profiel plus The Lean Communication',
      'C': '1 C Basis profiel plus The Lean Communication',
      'D': '1 D Basis profiel plus The Lean Communication',
      'I': '1 I Basis profiel plus The Lean Communication',
      'S': '1 S Basis profiel plus The Lean Communication'
    }
    const folderName = templateMap[profileCode.toUpperCase()]
    if (!folderName) throw new Error(`Unknown profileCode '${profileCode}'. Add it to templateMap.`)

    const templateDir = path.join(
      process.cwd(),
      'Profile rapport templates',
      folderName
    )
    const htmlDir = path.join(templateDir, 'publication-web-resources', 'html')
    const fileName = typeof fileNameOrPage === 'number' ? `publication-${fileNameOrPage}.html` : fileNameOrPage
    const htmlPath = path.join(htmlDir, fileName)
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Template HTML not found: ${htmlPath}`)
    }

    // Load HTML
    let html = fs.readFileSync(htmlPath, 'utf-8')

    // Apply in-memory replacements for common token styles (no disk edits)
    if (replacements && Object.keys(replacements).length > 0) {
      for (const [key, value] of Object.entries(replacements)) {
        const tokens = [
          `{{${key}}}`,
          `[[${key}]]`,
          `__${key}__`,
          `%${key}%`
        ]
        for (const t of tokens) {
          if (html.includes(t)) html = html.split(t).join(value)
        }
      }
    }

    // If graph provided and placeholder token approach is preferred
    if (graph?.placeholderTokens && graph.placeholderTokens.length > 0) {
      const graphMarkup = graph.html ?? (graph.dataUrl ? `<img src="${graph.dataUrl}"${graph.width || graph.height ? ` style=\"${graph.width ? `width:${graph.width}px;` : ''}${graph.height ? `height:${graph.height}px;` : ''}\"` : ''} />` : '')
      if (graphMarkup) {
        for (const token of graph.placeholderTokens) {
          if (html.includes(token)) html = html.split(token).join(graphMarkup)
        }
      }
    }

    // Prepare base paths and CSS
    const basePath = `file:///${htmlDir.replace(/\\/g, '/')}/`
    const cssPath = path.join(templateDir, 'publication-web-resources', 'css', 'idGeneratedStyles.css')
    let cssContent = ''
    if (fs.existsSync(cssPath)) {
      cssContent = fs.readFileSync(cssPath, 'utf-8')
      const fontDirFileUrl = `file:///${path.join(templateDir, 'font').replace(/\\/g, '/')}/`
      cssContent = cssContent.replace(/url\("\.\.\/\.\.\/font\//g, `url("${fontDirFileUrl}`)
    }

    const fullHtml = `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8" />\n<base href="${basePath}">\n<style>${cssContent}</style>\n</head>\n<body>${html}</body>\n</html>`

    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })

    // Inject print CSS (no clipping, exact A4)
    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; width: 210mm; min-height: 297mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .report-page { --page-w: 210mm; --page-h: 297mm; --m-top: 0mm; --m-right: 0mm; --m-bottom: 0mm; --m-left: 0mm; width: calc(var(--page-w) - var(--m-left) - var(--m-right)); min-height: calc(var(--page-h) - var(--m-top) - var(--m-bottom)); margin: var(--m-top) var(--m-right) var(--m-bottom) var(--m-left); box-sizing: border-box; position: relative; overflow: visible; break-after: page; }
        .report-page:last-child { break-after: avoid; }
        html, body, .report-page, .page-inner { overflow: visible !important; }
        .page-inner { width: 595.28px; height: 841.89px; position: relative; transform-origin: top left; transform: scale(1.3333333333); }
      `
    })

    // Wrap body content and optionally insert graph via DOM if selector is provided
    await page.evaluate((opts) => {
      const body = document.body
      const original = body.innerHTML
      body.innerHTML = '<div class="report-page"><div class="page-inner">' + original + '</div></div>'

      if (opts && opts.graph && opts.graph.selector) {
        const target = document.querySelector(opts.graph.selector)
        if (target) {
          const mode = opts.graph.insertMode || 'replace'
          if (opts.graph.html) {
            if (mode === 'replace') target.innerHTML = opts.graph.html
            else if (mode === 'append') target.insertAdjacentHTML('beforeend', opts.graph.html)
            else target.insertAdjacentHTML('afterbegin', opts.graph.html)
          } else if (opts.graph.dataUrl) {
            const img = document.createElement('img')
            img.src = opts.graph.dataUrl
            if (opts.graph.width) img.style.width = opts.graph.width + 'px'
            if (opts.graph.height) img.style.height = opts.graph.height + 'px'
            if (mode === 'replace') { target.innerHTML = ''; target.appendChild(img) }
            else if (mode === 'append') target.appendChild(img)
            else target.prepend(img)
          }
        }
      }
    }, { graph })

    await page.evaluateHandle('document.fonts.ready')
    await page.emulateMediaType('print')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      preferCSSPageSize: true
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
