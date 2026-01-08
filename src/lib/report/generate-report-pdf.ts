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
import { svgToPng, getWasmPath } from './svg-to-png'

type PDFDocument = any
type PDFFont = any
type PDFPage = any
const PDFDocument: any = { load: async (_bytes: any) => ({}) }
const StandardFonts: any = {}
const rgb: any = (..._args: any[]) => ({})

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

/**
 * Resolves the assets directory path.
 * Works both in development and production (Vercel).
 */
function getAssetsDir(): string {
  // Try multiple paths for different environments
  const candidates = [
    path.join(process.cwd(), 'apps', 'quiz', 'assets', 'report'),
    path.join(process.cwd(), 'assets', 'report'),
    path.join(__dirname, '..', '..', '..', 'assets', 'report'),
  ]

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) {
      continue
    }

    const manifestPath = path.join(dir, 'manifest.json')
    if (fs.existsSync(manifestPath)) {
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
  throw new Error(
    '[report-pdf] Legacy pdf-lib overlay generator has been removed. Use /api/rapport/download-pdf (API2PDF HTML → PDF).'
  )
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
