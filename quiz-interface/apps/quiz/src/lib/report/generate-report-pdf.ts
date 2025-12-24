/**
 * Runtime PDF Generator (Node-only, no Chromium)
 * 
 * Generates personalized DISC report PDFs at runtime on Vercel:
 * 1. Loads pre-built base PDF and positions JSON
 * 2. Overlays text (name, date, style) at measured positions
 * 3. Renders chart as PNG and overlays at measured position
 * 4. Returns Buffer ready for upload/email
 * 
 * NO browser dependencies - runs pure Node.js
 */

import fs from 'fs'
import path from 'path'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'

// Types
export interface DISCData {
  natural: { D: number; I: number; S: number; C: number }
  response: { D: number; I: number; S: number; C: number }
}

export interface GenerateReportOptions {
  profileCode: string
  fullName: string
  date: string | Date
  styleLabel: string
  discData: DISCData
}

interface FieldPosition {
  pageIndex: number
  rect: { x: number; y: number; w: number; h: number }
  source: string
}

interface PositionsData {
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

// Cache for loaded assets
const assetCache = new Map<string, { pdf: PDFDocument; positions: PositionsData; version: string }>()

/**
 * Resolves the assets directory path.
 * Works both in development and production (Vercel).
 */
function getAssetsDir(): string {
  // Try multiple paths for different environments
  const candidates = [
    path.join(process.cwd(), 'assets', 'report'),
    path.join(process.cwd(), 'apps', 'quiz', 'assets', 'report'),
    path.join(__dirname, '..', '..', '..', 'assets', 'report'),
  ]

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir
    }
  }

  throw new Error(`[report-pdf] Assets directory not found. Tried: ${candidates.join(', ')}`)
}

/**
 * Loads base PDF and positions for a profile (with caching).
 */
async function loadAssets(profileCode: string): Promise<{ pdf: PDFDocument; positions: PositionsData }> {
  const cacheKey = profileCode.toUpperCase()
  
  // Check cache
  const cached = assetCache.get(cacheKey)
  if (cached) {
    // Clone the PDF document for each use (pdf-lib documents are mutable)
    const pdfBytes = await cached.pdf.save()
    const clonedPdf = await PDFDocument.load(pdfBytes)
    return { pdf: clonedPdf, positions: cached.positions }
  }

  const assetsDir = getAssetsDir()
  
  // Load base PDF
  const pdfPath = path.join(assetsDir, 'base-pdf', `${profileCode.toUpperCase()}.pdf`)
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`[report-pdf] Base PDF not found for profile ${profileCode}: ${pdfPath}`)
  }
  const pdfBytes = fs.readFileSync(pdfPath)
  const basePdf = await PDFDocument.load(pdfBytes)

  // Load positions
  const positionsPath = path.join(assetsDir, 'positions', `${profileCode.toUpperCase()}.json`)
  if (!fs.existsSync(positionsPath)) {
    throw new Error(`[report-pdf] Positions not found for profile ${profileCode}: ${positionsPath}`)
  }
  const positions: PositionsData = JSON.parse(fs.readFileSync(positionsPath, 'utf-8'))

  // Cache for reuse
  assetCache.set(cacheKey, { pdf: basePdf, positions, version: positions.templateVersion })

  // Clone for this use
  const clonedPdf = await PDFDocument.load(await basePdf.save())
  return { pdf: clonedPdf, positions }
}

/**
 * Formats date consistently.
 */
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Extracts first name from full name.
 */
function getFirstName(fullName: string): string {
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)
  return parts[0] || trimmed
}

/**
 * Generates the DISC chart as SVG string.
 * Reuses existing chart-generator logic.
 */
function generateChartSVG(data: DISCData): string {
  const width = 400
  const height = 320
  const margin = { top: 20, right: 130, left: 40, bottom: 50 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  
  const yMin = 0, yMax = 100
  const plotLeft = margin.left
  const plotTop = margin.top
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  
  const yFor = (val: number) => {
    const t = (val - yMin) / (yMax - yMin)
    return plotTop + (1 - t) * plotHeight
  }
  const y50 = yFor(50)
  
  const categories = ['D', 'I', 'S', 'C'] as const
  const colors = { D: '#cb1517', I: '#ffcb04', S: '#029939', C: '#2665ae' }
  const categoryWidth = chartWidth / categories.length
  const barWidth = categoryWidth * 0.36
  
  let bars = ''
  categories.forEach((category, index) => {
    const x = margin.left + index * categoryWidth + (categoryWidth - barWidth) / 2
    const naturalHeight = (data.natural[category] / 100) * chartHeight
    bars += `<rect x="${x}" y="${margin.top + chartHeight - naturalHeight}" width="${barWidth}" height="${naturalHeight}" fill="${colors[category]}"/>`
  })
  
  let lineGraph = ''
  let linePoints = ''
  
  categories.forEach((category, index) => {
    const x = margin.left + index * categoryWidth + categoryWidth / 2
    const responseHeight = (data.response[category] / 100) * chartHeight
    const y = margin.top + chartHeight - responseHeight
    linePoints += `${index === 0 ? 'M' : 'L'} ${x} ${y} `
    lineGraph += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5"/>`
  })
  
  lineGraph = `<path d="${linePoints}" stroke="#9ca3af" stroke-width="1.5" fill="none"/>${lineGraph}`
  
  const referenceLine = `<line x1="${plotLeft}" x2="${plotLeft + plotWidth}" y1="${y50}" y2="${y50}" stroke="rgba(0,0,0,0.35)" stroke-width="1.25" stroke-dasharray="4 4" shape-rendering="crispEdges" />`
  
  const xLabels = categories.map((dim, index) => {
    const x = margin.left + (index + 0.5) * categoryWidth
    return `<text x="${x}" y="${margin.top + chartHeight + 18}" text-anchor="middle" font-size="12" font-weight="normal" fill="#374151">${dim}</text>`
  }).join('')

  let yAxisLabels = ''
  let gridLines = ''
  const yTicks = [0, 20, 40, 60, 80, 100]
  
  yTicks.forEach(tick => {
    const y = margin.top + chartHeight - (tick / 100) * chartHeight
    if (tick !== 0) {
      gridLines += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`
    }
    yAxisLabels += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${tick}%</text>`
  })
  
  const legendX = margin.left + chartWidth + 12
  const legendY = margin.top + 6
  const legend = `
    <g transform="translate(${legendX}, ${legendY})">
      <rect x="0" y="0" width="14" height="10" fill="#9ca3af" />
      <text x="20" y="9" font-size="11" fill="#333">Natuurlijke stijl</text>
      <line x1="0" y1="26" x2="14" y2="26" stroke="#9ca3af" stroke-width="1.5" />
      <rect x="6" y="23" width="6" height="6" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5" />
      <text x="20" y="28" font-size="11" fill="#333">Respons stijl</text>
    </g>
  `
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><style>text { font-family: 'PT Sans', 'Segoe UI', Roboto, Arial, sans-serif; }</style></defs>
    <rect width="${width}" height="${height}" fill="white"/>
    <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#e5e7eb" stroke-width="1"/>
    ${yAxisLabels}
    ${gridLines}
    ${referenceLine}
    ${bars}
    ${lineGraph}
    ${xLabels}
    ${legend}
  </svg>`
}

/**
 * Converts SVG to PNG using pure JavaScript (resvg-js).
 * This works on Vercel without native dependencies.
 */
async function svgToPng(svgString: string, width: number, height: number): Promise<Buffer> {
  try {
    // Try resvg-js first (pure JS/WASM, works on Vercel)
    const { Resvg } = await import('@resvg/resvg-js')
    const resvg = new Resvg(svgString, {
      fitTo: { mode: 'width', value: width },
    })
    const pngData = resvg.render()
    return Buffer.from(pngData.asPng())
  } catch (err) {
    // Fallback: try sharp (may work in some environments)
    try {
      const sharp = await import('sharp')
      const pngBuffer = await sharp.default(Buffer.from(svgString))
        .resize(width, height)
        .png()
        .toBuffer()
      return pngBuffer
    } catch {
      throw new Error(`[report-pdf] SVG to PNG conversion failed. Install @resvg/resvg-js: ${err}`)
    }
  }
}

/**
 * Draws text at a position with auto-fit sizing.
 */
function drawTextAutoFit(
  page: PDFPage,
  text: string,
  font: PDFFont,
  rect: { x: number; y: number; w: number; h: number },
  options: { minSize?: number; maxSize?: number; padding?: number; color?: ReturnType<typeof rgb> } = {}
): void {
  const { minSize = 8, maxSize = 14, padding = 2, color = rgb(0, 0, 0) } = options
  
  const availableWidth = rect.w - padding * 2
  let fontSize = maxSize
  
  // Find fitting font size
  while (fontSize >= minSize) {
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    if (textWidth <= availableWidth) {
      break
    }
    fontSize -= 0.5
  }
  
  // If still too wide at min size, truncate with ellipsis
  let displayText = text
  if (font.widthOfTextAtSize(displayText, fontSize) > availableWidth) {
    while (displayText.length > 3 && font.widthOfTextAtSize(displayText + '...', fontSize) > availableWidth) {
      displayText = displayText.slice(0, -1)
    }
    displayText += '...'
  }
  
  // Calculate vertical position (baseline offset)
  const textHeight = font.heightAtSize(fontSize)
  const baselineOffset = (rect.h - textHeight) / 2 + textHeight * 0.8
  
  page.drawText(displayText, {
    x: rect.x + padding,
    y: rect.y + baselineOffset - textHeight,
    size: fontSize,
    font,
    color,
  })
}

/**
 * Main function: generates personalized DISC report PDF.
 * 
 * @param options - Report generation options
 * @returns Buffer containing the PDF
 */
export async function generateReportPdf(options: GenerateReportOptions): Promise<Buffer> {
  const startTime = Date.now()
  const { profileCode, fullName, date, styleLabel, discData } = options

  console.log(`[report-pdf] Generating PDF for profile: ${profileCode}`)

  // Load assets
  const { pdf, positions } = await loadAssets(profileCode)
  const loadTime = Date.now() - startTime

  // Embed font
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Format data
  const dateText = formatDate(date)
  const firstName = getFirstName(fullName)

  // Overlay text fields
  const textColor = rgb(0, 0, 0)

  // Name on cover (page 0)
  if (positions.fields.name) {
    const pos = positions.fields.name
    const page = pdf.getPage(pos.pageIndex)
    drawTextAutoFit(page, fullName, fontBold, pos.rect, { maxSize: 18, color: textColor })
    console.log(`  [page ${pos.pageIndex}] Drew name: "${fullName}"`)
  }

  // Date (usually page 1)
  if (positions.fields.date) {
    const pos = positions.fields.date
    const page = pdf.getPage(pos.pageIndex)
    drawTextAutoFit(page, dateText, font, pos.rect, { maxSize: 10, color: textColor })
    console.log(`  [page ${pos.pageIndex}] Drew date: "${dateText}"`)
  }

  // Style label (usually page 1)
  if (positions.fields.style) {
    const pos = positions.fields.style
    const page = pdf.getPage(pos.pageIndex)
    drawTextAutoFit(page, styleLabel, font, pos.rect, { maxSize: 10, color: textColor })
    console.log(`  [page ${pos.pageIndex}] Drew style: "${styleLabel}"`)
  }

  // First name (if present)
  if (positions.fields.firstName) {
    const pos = positions.fields.firstName
    const page = pdf.getPage(pos.pageIndex)
    drawTextAutoFit(page, firstName, font, pos.rect, { maxSize: 12, color: textColor })
    console.log(`  [page ${pos.pageIndex}] Drew firstName: "${firstName}"`)
  }

  // Chart (page 2)
  if (positions.fields.chart) {
    const pos = positions.fields.chart
    const page = pdf.getPage(pos.pageIndex)

    // Generate chart SVG and convert to PNG
    const chartSvg = generateChartSVG(discData)
    const chartPng = await svgToPng(chartSvg, Math.round(pos.rect.w * 2), Math.round(pos.rect.h * 2))
    
    // Embed PNG in PDF
    const chartImage = await pdf.embedPng(chartPng)
    
    // Draw with contain scaling (preserve aspect ratio)
    const imgAspect = chartImage.width / chartImage.height
    const rectAspect = pos.rect.w / pos.rect.h
    
    let drawWidth = pos.rect.w
    let drawHeight = pos.rect.h
    let drawX = pos.rect.x
    let drawY = pos.rect.y
    
    if (imgAspect > rectAspect) {
      // Image is wider - fit to width
      drawHeight = pos.rect.w / imgAspect
      drawY = pos.rect.y + (pos.rect.h - drawHeight) / 2
    } else {
      // Image is taller - fit to height
      drawWidth = pos.rect.h * imgAspect
      drawX = pos.rect.x + (pos.rect.w - drawWidth) / 2
    }
    
    page.drawImage(chartImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    })
    
    console.log(`  [page ${pos.pageIndex}] Drew chart at (${drawX.toFixed(1)}, ${drawY.toFixed(1)}) ${drawWidth.toFixed(1)}x${drawHeight.toFixed(1)}pt`)
  }

  // Save PDF
  const pdfBytes = await pdf.save()
  const totalTime = Date.now() - startTime

  console.log(`[report-pdf] PDF generated in ${totalTime}ms (load: ${loadTime}ms), size: ${pdfBytes.byteLength} bytes`)

  return Buffer.from(pdfBytes)
}

/**
 * Check if assets are available for a profile.
 */
export function hasAssetsForProfile(profileCode: string): boolean {
  try {
    const assetsDir = getAssetsDir()
    const pdfPath = path.join(assetsDir, 'base-pdf', `${profileCode.toUpperCase()}.pdf`)
    const positionsPath = path.join(assetsDir, 'positions', `${profileCode.toUpperCase()}.json`)
    return fs.existsSync(pdfPath) && fs.existsSync(positionsPath)
  } catch {
    return false
  }
}

/**
 * Clear asset cache (useful for testing or hot reloading).
 */
export function clearAssetCache(): void {
  assetCache.clear()
}
