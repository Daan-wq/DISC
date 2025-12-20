import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { replacePlaceholders, type PlaceholderData } from '../utils/placeholder-replacer'
import { generateChartSVG, type DISCData } from '../utils/chart-generator'
import { PDFDocument, PDFPage } from 'pdf-lib'

export interface PDFGenerationOptions {
  profileCode: string
  templateBasePath?: string
  discData?: DISCData
  placeholderData?: PlaceholderData
  // When true (default), render each original HTML page in isolation and merge PDFs for pixel-perfect layout
  strictLayout?: boolean
}

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
 * Generates a PDF from an HTML template by combining all pages
 * @param options - Configuration for PDF generation
 * @returns Buffer containing the PDF data
 */
export async function generatePDFFromTemplate(options: PDFGenerationOptions): Promise<Buffer> {
  const defaultTemplatePath = process.env.TEMPLATE_PATH || path.join(process.cwd(), '..', '..', 'Profile rapport templates')
  const { profileCode, templateBasePath = defaultTemplatePath, discData, placeholderData } = options
  // Force strict per-page rendering; the combined path was removed to avoid pagination and TS errors
  return await generatePDFFromTemplateStrict({ profileCode, templateBasePath, discData, placeholderData, strictLayout: true })
}

// Strict per-page rendering: render each original page HTML in isolation and merge into a single PDF
async function generatePDFFromTemplateStrict(options: PDFGenerationOptions): Promise<Buffer> {
  const defaultTemplatePath = process.env.TEMPLATE_PATH || path.join(process.cwd(), '..', '..', 'Profile rapport templates')
  const { profileCode, templateBasePath = defaultTemplatePath, discData, placeholderData } = options

  // 1) Resolve the source template folder on disk (normalized first, then legacy fallback)
  let sourceTemplateDir = path.join(templateBasePath, `1 ${profileCode} Basis profiel plus The Lean Communication`)
  if (!fs.existsSync(sourceTemplateDir)) {
    const legacyMap: Record<string, string> = {
      C: `1 C Basis profiel plus The Lean Communication-1`,
      DS: `1 DS Basis profiel plus The Lean Communication-1`,
      ID: `1 ID Basis profiel plusThe Lean Communication`,
    }
    const legacy = legacyMap[profileCode.toUpperCase()]
    if (legacy) {
      const candidate = path.join(templateBasePath, legacy)
      if (fs.existsSync(candidate)) {
        console.warn(`[strictLayout] Using legacy template folder for ${profileCode}: ${candidate}`)
        sourceTemplateDir = candidate
      }
    }
  }
  if (!fs.existsSync(sourceTemplateDir)) {
    throw new Error(`Template directory not found for profile ${profileCode} under ${templateBasePath}`)
  }

  // 2) Copy the ENTIRE template folder verbatim to a unique temp dir
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `disc-tpl-${profileCode}-`))
  const tempTemplateDir = path.join(tempDir, path.basename(sourceTemplateDir))
  copyDirectorySync(sourceTemplateDir, tempTemplateDir)

  const htmlDir = path.join(tempTemplateDir, 'publication-web-resources', 'html')
  // Fixed 9-page order
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

  // 3) Edit ONLY placeholders (and chart/percentages) inside the copied HTML files. Do not touch structure/styles.
  for (const fileName of htmlFiles) {
    const filePath = path.join(htmlDir, fileName)
    let content = fs.readFileSync(filePath, 'utf-8')
    content = replacePlaceholders(content, placeholderData)

        // Replace chart image in publication-2.html (works for all templates: SC uses image/29.png, ID uses image/22.png, CI uses image/21.png, etc.)
    if (discData && fileName === 'publication-2.html') {
      const chartSVG = generateChartSVG(discData)
      const chartDataURL = `data:image/svg+xml;base64,${Buffer.from(chartSVG).toString('base64')}`
      // ONLY replace the chart image: must have the classes AND src="../image/XX.png" pattern
      // This prevents replacing green rectangles and other decorative images with those classes
      const chartImgRegex = /<img([^>]*)class="_idGenObjectAttribute-1 _idGenObjectAttribute-2"([^>]*)src="\.\.\/image\/\d+\.png"([^>]*)>/i
      const matches = content.match(chartImgRegex)
      if (matches && matches.length > 0) {
        // Replace only the first match (the /i flag without /g ensures single replacement)
        content = content.replace(chartImgRegex, `<img class="_idGenObjectAttribute-1 _idGenObjectAttribute-2" src="${chartDataURL}" alt="DISC Chart" />`)
        console.log(`[chart] ${fileName}: replaced the chart image placeholder`)
      } else {
        console.warn(`[chart] ${fileName}: NO chart placeholder found with pattern ../image/XX.png`)
      }
    }
    
    // Handle percentage replacements for publication-2.html specifically
    if (fileName === 'publication-2.html') {
      if (placeholderData) {
        const results = placeholderData.results
        content = content.replace(
          /(<div id="_idContainer028"[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<\/div>)/,
          `$1${results.natural_d.toFixed(0)}%$2${results.natural_i.toFixed(0)}%$3${results.natural_s.toFixed(0)}%$4${results.natural_c.toFixed(0)}%$5`
        )
        content = content.replace(
          /(<div id="_idContainer029"[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<\/div>)/,
          `$1${results.response_d.toFixed(0)}%$2${results.response_i.toFixed(0)}%$3${results.response_s.toFixed(0)}%$4${results.response_c.toFixed(0)}%$5`
        )
        // Fallback for templates where the numeric percentage containers differ (e.g., 030/031)
        content = content.replace(
          /(<div id="_idContainer030"[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<\/div>)/,
          `$1${results.natural_d.toFixed(0)}%$2${results.natural_i.toFixed(0)}%$3${results.natural_s.toFixed(0)}%$4${results.natural_c.toFixed(0)}%$5`
        )
        content = content.replace(
          /(<div id="_idContainer031"[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<span[^>]*>)0%(<\/span>[\s\S]*?<\/div>)/,
          `$1${results.response_d.toFixed(0)}%$2${results.response_i.toFixed(0)}%$3${results.response_s.toFixed(0)}%$4${results.response_c.toFixed(0)}%$5`
        )
      }
    }
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  // 4) Render each HTML file by opening the actual file:// URL so ALL relative CSS/images/fonts work as-is
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--enable-local-file-accesses',
      '--disable-web-security',
      '--font-render-hinting=medium'
    ]
  })
  const page = await browser.newPage()
  
  // SECURITY: Block all external network requests - only allow file:// and data: URLs
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('file://') || url.startsWith('data:')) {
      request.continue()
    } else {
      console.warn(`[pdf] Blocked external request: ${url}`)
      request.abort('blockedbyclient')
    }
  })
  
  const pageBuffers: Buffer[] = []
  try {
    for (const fileName of htmlFiles) {
      const filePath = path.join(htmlDir, fileName)
      const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`

      // Ensure a consistent viewport that matches the intended template size
      await page.setViewport({ width: 595, height: 842, deviceScaleFactor: 1 })

      if (fs.existsSync(filePath)) {
        await page.goto(fileUrl, { waitUntil: 'networkidle0' })
      } else {
        // Fallback: render a blank white page for missing templates
        const blank = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;background:white;"></body></html>`
        await page.setContent(blank, { waitUntil: 'domcontentloaded' })
      }

      // Inject strict A4 print CSS, hide potential dotted separators, and ensure the chart overlays artifacts
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
          .report-page {
            --page-w: 210mm; --page-h: 297mm;
            --m-top: 0mm; --m-right: 0mm; --m-bottom: 0mm; --m-left: 0mm;
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
          /* Scale original InDesign's 595.28×841.89 px (72dpi) to CSS 96dpi A4 */
          .page-inner {
            width: 595.28px;
            height: 841.89px;
            position: relative;
            transform-origin: top left;
            transform: scale(1.3333333333);
          }
          /* Remove potential dotted separators in template */
          .report-page hr, .report-page .dotted-sep { display: none !important; }
          /* Fallback: hide any un-replaced placeholder chart */
          .report-page img[src*="image/21.png" i] { display: none !important; }
          .report-page .section-break::before, .report-page .section-break::after { content: none !important; border: none !important; background: none !important; }
          /* Ensure the chart image sits above and has opaque background to occlude any underlying artifacts */
          img[alt="DISC Chart"] {
            position: relative;
            z-index: 10;
            background: #fff;
            display: block;
            isolation: isolate; /* create a new stacking context */
          }
          /* Enforce LTR for Datum/Stijl only; do not alter cover name layout/centering */
          #datum, #stijl { direction: ltr !important; unicode-bidi: plaintext; }
          /* cover name: restored to original template behavior (no overrides) */
        `
      })

      // Wrap body content so it fits the A4 canvas intrinsically (no viewport scaling)
      try {
        await page.evaluate(function() {
          const body = document.body
          if (!document.querySelector('.report-page')) {
            const original = body.innerHTML
            body.innerHTML = '<div class="report-page"><div class="page-inner">' + original + '</div></div>'
          }
        })
      } catch (wrapError: any) {
        throw new Error(`[${fileName}] Body wrap failed: ${wrapError.message}`)
      }

      // Page-specific runtime adjustments
      // 0) publication.html: center the cover name horizontally at the same Y position (Word-like centering)
      if (fileName === 'publication.html') {
        try {
          await page.evaluate(function() {
            const root = document.querySelector('.page-inner')
            const nameEl = document.querySelector('a[href="http://DBF_Naam"] span')
            if (!root || !nameEl) return

            let wrapper = nameEl.parentElement
            // @ts-ignore - browser context
            const hasTransform = (el) => {
              // @ts-ignore - browser context
              const t = getComputedStyle(el).transform
              return t && t !== 'none'
            }
            while (wrapper && !hasTransform(wrapper) && wrapper !== root) {
              wrapper = wrapper.parentElement
            }
            if (!wrapper) return

            const nameRect = nameEl.getBoundingClientRect()
            if (!nameRect || nameRect.width === 0) return

            // @ts-ignore - browser context
            const parseScaleX = (tr) => {
              if (!tr || tr === 'none') return 1
              const m3 = tr.match(/matrix3d\(([^)]+)\)/)
              if (m3) { const v = m3[1].split(',').map(parseFloat); return (v[0] || 1) }
              const m = tr.match(/matrix\(([^)]+)\)/)
              if (m) { const v = m[1].split(',').map(parseFloat); return (v[0] || 1) }
              return 1
            }
            // @ts-ignore - browser context
            const rootScaleX = parseScaleX(getComputedStyle(root).transform)
            // @ts-ignore - browser context
            const wrapperScaleX = parseScaleX(getComputedStyle(wrapper).transform)
            const scaleX = (isFinite(rootScaleX) && rootScaleX !== 0 ? rootScaleX : 1) * (isFinite(wrapperScaleX) && wrapperScaleX !== 0 ? wrapperScaleX : 1)

            const baseRect = root.getBoundingClientRect()
            // @ts-ignore - browser context
            const pageInnerWidth = baseRect.width

            const desiredLeftFromPage = (pageInnerWidth - nameRect.width) / 2
            const currentLeftFromPage = nameRect.left - baseRect.left
            const deltaXScreen = desiredLeftFromPage - currentLeftFromPage

            // @ts-ignore - browser context
            const curLeftPx = parseFloat(nameEl.style.left || '0') || 0
            const newLeftPre = curLeftPx + (deltaXScreen / (scaleX || 1))
            // @ts-ignore - browser context
            nameEl.style.left = `${newLeftPre}px`
          })
        } catch (nameError: any) {
          console.warn(`[${fileName}] Name centering failed: ${nameError.message}`)
        }
      }
      // 1) publication-2.html: ensure only one dotted 50% line by hiding any tiny external dotted overlays (legacy template asset)
      if (fileName === 'publication-2.html') {
        await page.evaluate(function() {
          const img = document.querySelector('img[alt="DISC Chart"]')
          if (!img) return
          const imgRect = img.getBoundingClientRect()
          // @ts-ignore - browser context
          const allImgs = Array.from(document.querySelectorAll('img'))
          const candidates = allImgs.filter(el => {
            const r = el.getBoundingClientRect()
            const h = r.height
            return h > 0 && h <= 3 && r.top >= imgRect.top - 5 && r.bottom <= imgRect.bottom + 5
          })
          candidates.forEach(el => {
            // @ts-ignore - browser context
            const wrapper = el.closest('div[id^="_idContainer"]') || el.parentElement
            // @ts-ignore - browser context
            if (wrapper) wrapper.style.display = 'none'
            // @ts-ignore - browser context
            else el.style.display = 'none'
          })
        })
        // Runtime correction: deterministically fill percentage columns as D, I, S, C (top-to-bottom)
        if (placeholderData) {
          const r = placeholderData.results
          await page.evaluate(
            (natD, natI, natS, natC, respD, respI, respS, respC) => {
              // @ts-ignore - browser context
              const set = (id, arr) => {
                if (!id) return
                const col = document.getElementById(id)
                if (!col) return
                // @ts-ignore - browser context
                const spans = Array.from(col.querySelectorAll('span'))
                // @ts-ignore - browser context
                const perc = spans.filter(sp => /%\s*$/.test((sp.textContent || '').trim()))
                perc.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
                for (let i = 0; i < 4 && i < perc.length; i++) {
                  perc[i].textContent = `${arr[i]}%`
                }
              }
              // Support both template variants: 028/029 and 030/031
              set('_idContainer028', [natD, natI, natS, natC])
              set('_idContainer029', [respD, respI, respS, respC])
              set('_idContainer030', [natD, natI, natS, natC])
              set('_idContainer031', [respD, respI, respS, respC])
            },
            r.natural_d, r.natural_i, r.natural_s, r.natural_c,
            r.response_d, r.response_i, r.response_s, r.response_c
          )
        }
      }
      // 1) publication-1.html: align the <<Datum>> <<Stijl>> row to the bottom-right (fixed right anchor), preserving Y
      if (fileName === 'publication-1.html') {
        await page.evaluate(function() {
          const container = document.querySelector('#_idContainer012')
          const wrapper = document.querySelector('#_idContainer012 > div')
          const root = document.querySelector('.page-inner')
          if (!container || !wrapper || !root) return

          // Read current wrapper transform to preserve Y and scale and to get current translateX
          // @ts-ignore - browser context
          const st = getComputedStyle(wrapper)
          // @ts-ignore - browser context
          const tr = st.transform || st.webkitTransform || st.msTransform || ''
          let sx = 1, sy = 1, tx = 0, ty = 0
          if (tr && tr !== 'none') {
            const m3 = tr.match(/matrix3d\(([^)]+)\)/)
            if (m3) {
              const v = m3[1].split(',').map(parseFloat)
              sx = (v[0] || 1)
              sy = (v[5] || 1)
              tx = (v[12] || 0)
              ty = (v[13] || 0)
            } else {
              const m = tr.match(/matrix\(([^)]+)\)/)
              if (m) {
                const v = m[1].split(',').map(parseFloat)
                // matrix(a,b,c,d,e,f) => scaleX=a, scaleY=d, translateX=e, translateY=f (effective)
                sx = (v[0] || 1)
                sy = (v[3] || 1)
                tx = (v[4] || 0)
                ty = (v[5] || 0)
              } else {
                // Fallback to template defaults (translateY=5.69, scale=0.05)
                sx = sy = 0.05
                tx = 0
                ty = 5.69
              }
            }
          } else {
            // Fallback to template defaults
            sx = sy = 0.05
            tx = 0
            ty = 5.69
          }

          // Screen-space geometry (includes .page-inner scale)
          const baseRect = root.getBoundingClientRect()
          const pageInnerWidth = baseRect.width

          // Compute visible bounds from descendant spans (children are absolutely positioned)
          // @ts-ignore - browser context
          const spans = Array.from(container.querySelectorAll('span'))
          let minLeft = Infinity
          let maxRight = -Infinity
          spans.forEach(s => {
            const r = s.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            if (r.left < minLeft) minLeft = r.left
            if (r.right > maxRight) maxRight = r.right
          })
          if (!isFinite(minLeft) || !isFinite(maxRight) || maxRight <= minLeft) return
          const rowWidthScreen = maxRight - minLeft

          // Desired screen-space left so the row's right edge has visible padding from the page-inner right edge
          const rightInset = 20
          // @ts-ignore - browser context
          const desiredLeftScreen = Math.max(0, pageInnerWidth - rowWidthScreen - rightInset)
          const currentLeftFromPage = minLeft - baseRect.left
          const deltaXScreen = desiredLeftScreen - currentLeftFromPage

          // Convert required screen-space delta into pre-scale translateX
          // @ts-ignore - browser context
          const rootCS = getComputedStyle(root)
          // @ts-ignore - browser context
          const rt = rootCS.transform || rootCS.webkitTransform || rootCS.msTransform || ''
          let pageScaleX = 1
          const m3p = rt.match(/matrix3d\(([^)]+)\)/)
          if (m3p) {
            const v = m3p[1].split(',').map(parseFloat)
            pageScaleX = (v[0] || 1)
          } else {
            const mp = rt.match(/matrix\(([^)]+)\)/)
            if (mp) {
              const v = mp[1].split(',').map(parseFloat)
              pageScaleX = (v[0] || 1)
            }
          }
          if (!isFinite(pageScaleX) || pageScaleX === 0) pageScaleX = 1

          const newTx = tx + (deltaXScreen / pageScaleX)
          const newTransform = `translate(${newTx}px, ${ty}px) rotate(0deg) scale(${sx}, ${sy})`
          // @ts-ignore - browser context
          wrapper.style.transform = newTransform
          // @ts-ignore - browser context
          wrapper.style.webkitTransform = newTransform
          // @ts-ignore - browser context
          wrapper.style.msTransform = newTransform
        })
      }

      // Optional diagnostic: measure the computed .report-page size in millimeters before export
      let pageSizeMm: any = null
      try {
        pageSizeMm = await page.evaluate(function() {
          const el = document.querySelector('.report-page')
          if (!el) return null
          const r = el.getBoundingClientRect()
          const pxToMm = function(px: any) { return (px / 96) * 25.4 }
          return { widthMm: pxToMm(r.width), heightMm: pxToMm(r.height) }
        })
      } catch (pageSizeError: any) {
        // Non-critical: page size measurement failed, continue anyway
      }
      if (pageSizeMm) {
        console.log(`[pdf] ${fileName}: .report-page computed size = ${pageSizeMm.widthMm.toFixed(2)}mm x ${pageSizeMm.heightMm.toFixed(2)}mm`)
      }

      // Set print media type for proper rendering
      await page.emulateMediaType('print')

      // Generate a single A4 page PDF with backgrounds
      try {
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
          preferCSSPageSize: true,
          pageRanges: '1'
        })
        pageBuffers.push(Buffer.from(pdf))
      } catch (pdfError: any) {
        throw new Error(`PDF generation failed for ${fileName}: ${pdfError.message}`)
      }
    }
  } finally {
    await browser.close()
    // Clean up the temp directory tree
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch {}
  }

  // 5) Merge single-page PDFs
  const merged = await PDFDocument.create()
  for (const buf of pageBuffers) {
    const doc = await PDFDocument.load(buf)
    const copied = await merged.copyPages(doc, doc.getPageIndices())
    copied.forEach((p: PDFPage) => merged.addPage(p))
  }
  const mergedBytes = await merged.save()
  return Buffer.from(mergedBytes)
 }
