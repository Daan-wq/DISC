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
import { svgToPng, getWasmPath } from './svg-to-png'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

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

// Debug mode flag - set via environment variable
const DEBUG_PDF = process.env.DEBUG_PDF === 'true' || process.env.DEBUG_PDF === '1'

// Cache for loaded assets
const assetCache = new Map<string, { pdf: PDFDocument; positions: PositionsData; version: string }>()

// Cache for embedded fonts
const fontCache = new Map<string, PDFFont>()

// Font mapping: fontFamily + weight + style -> filename
interface FontKey {
  family: string
  weight: string
  style: string
}

function getFontFilename(fontFamily: string, fontWeight: string, fontStyle: string): string | null {
  // Normalize font family
  const family = fontFamily.toLowerCase().replace(/['"]/g, '').split(',')[0].trim()

  // Normalize weight and style
  const isBold = fontWeight === 'bold' || fontWeight === '700' || parseInt(fontWeight) >= 700
  const isItalic = fontStyle === 'italic' || fontStyle === 'oblique'

  // PT Sans mapping
  if (family === 'pt sans') {
    if (isBold && isItalic) return 'PTSans-BoldItalic.ttf'
    if (isBold) return 'PTSans-Bold.ttf'
    if (isItalic) return 'PTSans-Italic.ttf'
    return 'PTSans-Regular.ttf'
  }

  // Minion Pro mapping (using Source Serif Pro as alternative)
  if (family === 'minion pro') {
    if (isBold && isItalic) return 'MinionPro-BoldItalic.otf'
    if (isBold) return 'MinionPro-Bold.otf'
    if (isItalic) return 'MinionPro-Italic.otf'
    return 'MinionPro-Regular.otf'
  }

  // Fallback to standard fonts
  return null
}

/**
 * Embeds a custom font in the PDF document.
 * Uses cache to avoid re-embedding the same font.
 */
async function embedCustomFont(
  pdf: PDFDocument,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): Promise<PDFFont> {
  // Create cache key
  const cacheKey = `${fontFamily}|${fontWeight}|${fontStyle}`

  // Check cache first
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)!
  }

  // Get font filename
  const filename = getFontFilename(fontFamily, fontWeight, fontStyle)

  if (!filename) {
    // Fallback to standard fonts
    const isBold = fontWeight === 'bold' || fontWeight === '700' || parseInt(fontWeight) >= 700
    const fallbackFont = isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica
    const font = await pdf.embedFont(fallbackFont)
    fontCache.set(cacheKey, font)

    if (DEBUG_PDF) {
      console.log(`  [font] Using fallback ${fallbackFont} for ${fontFamily}`)
    }

    return font
  }

  // Load and embed custom font
  try {
    const assetsDir = getAssetsDir()
    const fontPath = path.join(assetsDir, 'fonts', filename)

    if (!fs.existsSync(fontPath)) {
      throw new Error(`Font file not found: ${fontPath}`)
    }

    const fontBytes = fs.readFileSync(fontPath)
    const font = await pdf.embedFont(fontBytes)
    fontCache.set(cacheKey, font)

    if (DEBUG_PDF) {
      console.log(`  [font] Embedded custom font: ${filename} (${fontFamily}, ${fontWeight}, ${fontStyle})`)
    }

    return font
  } catch (error) {
    console.error(`[font] Failed to embed ${filename}:`, error)

    // Fallback to standard fonts
    const isBold = fontWeight === 'bold' || fontWeight === '700' || parseInt(fontWeight) >= 700
    const fallbackFont = isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica
    const font = await pdf.embedFont(fallbackFont)
    fontCache.set(cacheKey, font)

    return font
  }
}

/**
 * Resolves the assets directory path.
 * Works both in development and production (Vercel).
 */
function getAssetsDir(): string {
  const candidates = [
    // Development: relative to src/lib/report/
    path.join(__dirname, '..', '..', '..', 'assets', 'report'),
    // Production: relative to .next/server/ or dist/
    path.join(process.cwd(), 'assets', 'report'),
    path.join(process.cwd(), 'apps', 'quiz', 'assets', 'report'),
    // Vercel serverless: /var/task/apps/quiz/assets/report
    path.join('/var/task/apps/quiz/assets/report'),
    path.join('/var/task/assets/report'),
  ]

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      console.log(`[report-pdf] Using assets directory: ${dir}`)
      return dir
    }
  }

  console.error(`[report-pdf] Assets directory not found. Tried:`)
  candidates.forEach(dir => console.error(`  - ${dir} (exists: ${fs.existsSync(dir)})`))
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
 * Parse rgb(r,g,b) color string to pdf-lib rgb() color.
 */
function parseRgbColor(colorStr: string | undefined, fallback: ReturnType<typeof rgb> = rgb(0, 0, 0)): ReturnType<typeof rgb> {
  if (!colorStr) return fallback
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (match) {
    return rgb(
      parseInt(match[1]) / 255,
      parseInt(match[2]) / 255,
      parseInt(match[3]) / 255
    )
  }
  return fallback
}

/**
 * Draws text at a position with auto-fit sizing.
 * Uses extracted styles from positions JSON when available.
 */
function drawTextAutoFit(
  page: PDFPage,
  text: string,
  font: PDFFont,
  rect: { x: number; y: number; w: number; h: number },
  options: {
    minSize?: number
    maxSize?: number
    padding?: number
    color?: ReturnType<typeof rgb>
    textAlign?: string
    styles?: FieldPosition['styles']
  } = {}
): void {
  // Use styles from extraction if available, otherwise use provided options
  const extractedFontSize = options.styles?.fontSize
  const extractedColor = options.styles?.color ? parseRgbColor(options.styles.color) : undefined
  const textAlign = options.styles?.textAlign || options.textAlign || 'left'

  const { minSize = 8, padding = 2 } = options
  const maxSize = extractedFontSize || options.maxSize || 14
  const color = extractedColor || options.color || rgb(0, 0, 0)

  const availableWidth = rect.w - padding * 2
  let fontSize = maxSize

  // Find fitting font size (only shrink if needed)
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

  // Calculate text width for alignment
  const textWidth = font.widthOfTextAtSize(displayText, fontSize)

  // Calculate x position based on text alignment
  let xPos = rect.x + padding
  if (textAlign === 'center') {
    xPos = rect.x + (rect.w - textWidth) / 2
  } else if (textAlign === 'right') {
    xPos = rect.x + rect.w - textWidth - padding
  }

  // Calculate vertical position (baseline offset)
  const textHeight = font.heightAtSize(fontSize)
  const baselineOffset = (rect.h - textHeight) / 2 + textHeight * 0.8

  page.drawText(displayText, {
    x: xPos,
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

  // Format data
  const dateText = formatDate(date)
  const firstName = getFirstName(fullName)

  // Overlay text fields - use extracted styles when available
  const defaultTextColor = rgb(0, 0, 0)

  // Name on cover (page 0) - use extracted styles and custom fonts
  if (positions.fields.name) {
    const pos = positions.fields.name
    const page = pdf.getPage(pos.pageIndex)

    // Embed custom font based on extracted styles
    const fontFamily = pos.styles?.fontFamily || 'PT Sans'
    const fontWeight = pos.styles?.fontWeight || 'bold'
    const fontStyle = 'normal'
    const useFont = await embedCustomFont(pdf, fontFamily, fontWeight, fontStyle)

    drawTextAutoFit(page, fullName, useFont, pos.rect, {
      maxSize: 18,
      color: defaultTextColor,
      styles: pos.styles
    })
    console.log(`  [page ${pos.pageIndex}] Drew name: "${fullName}" (font: ${fontFamily}, ${fontWeight})`)
  }

  // Date (usually page 1) - use extracted styles and custom fonts
  if (positions.fields.date) {
    const pos = positions.fields.date
    const page = pdf.getPage(pos.pageIndex)

    const fontFamily = pos.styles?.fontFamily || 'PT Sans'
    const fontWeight = pos.styles?.fontWeight || 'normal'
    const fontStyle = 'normal'
    const useFont = await embedCustomFont(pdf, fontFamily, fontWeight, fontStyle)

    drawTextAutoFit(page, dateText, useFont, pos.rect, {
      maxSize: 10,
      color: defaultTextColor,
      styles: pos.styles
    })
    console.log(`  [page ${pos.pageIndex}] Drew date: "${dateText}" (font: ${fontFamily}, ${fontWeight})`)
  }

  // Style label (usually page 1) - use extracted styles and custom fonts
  if (positions.fields.style) {
    const pos = positions.fields.style
    const page = pdf.getPage(pos.pageIndex)

    const fontFamily = pos.styles?.fontFamily || 'PT Sans'
    const fontWeight = pos.styles?.fontWeight || 'normal'
    const fontStyle = 'normal'
    const useFont = await embedCustomFont(pdf, fontFamily, fontWeight, fontStyle)

    drawTextAutoFit(page, styleLabel, useFont, pos.rect, {
      maxSize: 10,
      color: defaultTextColor,
      styles: pos.styles
    })
    console.log(`  [page ${pos.pageIndex}] Drew style: "${styleLabel}" (font: ${fontFamily}, ${fontWeight})`)
  }

  // First name (if present) - use extracted styles and custom fonts
  if (positions.fields.firstName) {
    const pos = positions.fields.firstName
    const page = pdf.getPage(pos.pageIndex)

    const fontFamily = pos.styles?.fontFamily || 'PT Sans'
    const fontWeight = pos.styles?.fontWeight || 'normal'
    const fontStyle = 'normal'
    const useFont = await embedCustomFont(pdf, fontFamily, fontWeight, fontStyle)

    drawTextAutoFit(page, firstName, useFont, pos.rect, {
      maxSize: 12,
      color: defaultTextColor,
      styles: pos.styles
    })
    console.log(`  [page ${pos.pageIndex}] Drew firstName: "${firstName}" (font: ${fontFamily}, ${fontWeight})`)
  }

  // Chart (page 2)
  if (positions.fields.chart) {
    const pos = positions.fields.chart
    const page = pdf.getPage(pos.pageIndex)

    // Generate chart SVG - fixed size 400x320 with legend included
    const chartSvg = generateChartSVG(discData)

    // Convert to PNG at 2x resolution for sharpness
    // Use fixed SVG dimensions (400x320) to ensure legend is included
    const svgWidth = 400
    const svgHeight = 320
    const chartPng = await svgToPng(chartSvg, {
      width: svgWidth * 2,  // 800px for sharpness
      height: svgHeight * 2  // 640px for sharpness
    })

    // Embed PNG in PDF
    const chartImage = await pdf.embedPng(chartPng)

    // Calculate scaling to fit in bbox while preserving aspect ratio
    const svgAspect = svgWidth / svgHeight  // 400/320 = 1.25
    const rectAspect = pos.rect.w / pos.rect.h

    let drawWidth = pos.rect.w
    let drawHeight = pos.rect.h
    let drawX = pos.rect.x
    let drawY = pos.rect.y

    if (svgAspect > rectAspect) {
      // SVG is wider than bbox - fit to width, center vertically
      drawHeight = pos.rect.w / svgAspect
      drawY = pos.rect.y + (pos.rect.h - drawHeight) / 2
    } else {
      // SVG is taller than bbox - fit to height, center horizontally
      drawWidth = pos.rect.h * svgAspect
      drawX = pos.rect.x + (pos.rect.w - drawWidth) / 2
    }

    page.drawImage(chartImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    })

    console.log(`  [page ${pos.pageIndex}] Drew chart at (${drawX.toFixed(1)}, ${drawY.toFixed(1)}) ${drawWidth.toFixed(1)}x${drawHeight.toFixed(1)}pt (SVG: ${svgWidth}x${svgHeight}, bbox: ${pos.rect.w.toFixed(1)}x${pos.rect.h.toFixed(1)})`)
  }

  // Overlay percentage values on page 2
  const percentageFields = [
    { key: 'naturalD', value: discData.natural.D },
    { key: 'naturalI', value: discData.natural.I },
    { key: 'naturalS', value: discData.natural.S },
    { key: 'naturalC', value: discData.natural.C },
    { key: 'responseD', value: discData.response.D },
    { key: 'responseI', value: discData.response.I },
    { key: 'responseS', value: discData.response.S },
    { key: 'responseC', value: discData.response.C },
  ] as const

  for (const { key, value } of percentageFields) {
    const pos = positions.fields[key as keyof typeof positions.fields]
    if (pos) {
      const page = pdf.getPage(pos.pageIndex)
      const percentText = `${Math.round(value)}%`

      // Use styles from extraction if available, otherwise defaults
      const fontSize = pos.styles?.fontSize || 8
      const fontFamily = pos.styles?.fontFamily || 'PT Sans'
      const fontWeight = pos.styles?.fontWeight || 'normal'
      const fontStyle = 'normal'
      const useFont = await embedCustomFont(pdf, fontFamily, fontWeight, fontStyle)

      // Parse text color from rgb(r,g,b) format if available
      const color = pos.styles?.color
        ? parseRgbColor(pos.styles.color, defaultTextColor)
        : defaultTextColor

      // STEP 1: Cover old "0%" text with background rectangle
      // This ensures the old placeholder text is not visible
      const bgColor = pos.styles?.backgroundColor
        ? parseRgbColor(pos.styles.backgroundColor, rgb(1, 1, 1))
        : rgb(1, 1, 1) // White fallback

      // Draw cover rectangle with 2pt padding to fully cover old text
      const padding = 2
      page.drawRectangle({
        x: pos.rect.x - padding,
        y: pos.rect.y - padding,
        width: pos.rect.w + padding * 2,
        height: pos.rect.h + padding * 2,
        color: bgColor,
      })

      // STEP 2: Draw new percentage text centered in the rect
      const textWidth = useFont.widthOfTextAtSize(percentText, fontSize)
      const textX = pos.rect.x + (pos.rect.w - textWidth) / 2
      const textY = pos.rect.y + (pos.rect.h / 2) - (fontSize * 0.3)

      page.drawText(percentText, {
        x: textX,
        y: textY,
        size: fontSize,
        font: useFont,
        color,
      })

      if (DEBUG_PDF) {
        console.log(`  [page ${pos.pageIndex}] Drew ${key}: "${percentText}" at (${textX.toFixed(1)}, ${textY.toFixed(1)}) with bg cover`)
      }
    }
  }

  if (DEBUG_PDF) {
    console.log(`  [debug] Percentage fields overlaid: ${percentageFields.filter(f => positions.fields[f.key as keyof typeof positions.fields]).length}/8`)
  }

  // Debug mode: dump positions JSON
  if (DEBUG_PDF) {
    console.log(`\n[debug] Positions dump for profile ${profileCode}:`)
    console.log(JSON.stringify(positions, null, 2))
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

/**
 * Debug function: exports positions data for a profile.
 * Useful for verifying placeholder extraction.
 */
export async function getPositionsDebug(profileCode: string): Promise<PositionsData | null> {
  try {
    const { positions } = await loadAssets(profileCode)
    return positions
  } catch {
    return null
  }
}
