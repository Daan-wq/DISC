import { generateChartSVG } from '../../lib/utils/chart-generator'

import { type DiscPercentages, type PublicationFile, type RenderReportData } from './types'

type ReplaceResult = {
  html: string
  unknownPlaceholders: string[]
  replacedCounts: Record<string, number>
  seenPlaceholders: string[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getVoornaam(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return parts[0] || fullName.trim() || 'Deelnemer'
}

function formatDutchDate(dateIso: string): string {
  try {
    const date = new Date(dateIso)
    if (Number.isNaN(date.getTime())) return dateIso

    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateIso
  }
}

function replacePlaceholders(html: string, replacements: Record<string, string>): ReplaceResult {
  const unknown = new Set<string>()
  const replacedCounts: Record<string, number> = {}
  const seen = new Set<string>()

  const replaced = html.replace(
    /&lt;&lt;([^<>]+)&gt;&gt;|<<([^<>]+)>>/g,
    (match, escapedName: string | undefined, rawName: string | undefined) => {
      const name = String(escapedName || rawName || '').trim()
      if (!name) return match

      seen.add(name)

      if (Object.prototype.hasOwnProperty.call(replacements, name)) {
        replacedCounts[name] = (replacedCounts[name] || 0) + 1
        return escapeHtml(replacements[name] ?? '')
      }

      unknown.add(name)
      return match
    }
  )

  return {
    html: replaced,
    unknownPlaceholders: Array.from(unknown),
    replacedCounts,
    seenPlaceholders: Array.from(seen),
  }
}

function replaceFirstNPercentTexts(block: string, values: string[]): string {
  let idx = 0
  return block.replace(/>\s*0%\s*</g, (match) => {
    const next = values[idx++]
    if (!next) return match
    return `>${next}<`
  })
}

function replaceDiscPercentagesInHtml(html: string, disc: DiscPercentages): string {
  const naturalValues = [disc.natural.D, disc.natural.I, disc.natural.S, disc.natural.C].map(
    (v) => `${Math.round(v)}%`
  )
  const responseValues = [disc.response.D, disc.response.I, disc.response.S, disc.response.C].map(
    (v) => `${Math.round(v)}%`
  )

  const candidates = Array.from(
    html.matchAll(/(<div\s+id="_idContainer0\d{2}"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/g)
  ).map((m) => m[1])

  const percentageBlocks = candidates.filter((block) => />\s*0%\s*</.test(block))

  if (percentageBlocks.length >= 2) {
    const naturalBlock = replaceFirstNPercentTexts(percentageBlocks[0], naturalValues)
    html = html.replace(percentageBlocks[0], naturalBlock)

    const responseBlock = replaceFirstNPercentTexts(percentageBlocks[1], responseValues)
    html = html.replace(percentageBlocks[1], responseBlock)
  }

  return html
}

function removeDiscChartMidlineOverlayFromHtml(html: string): string {
  return html.replace(
    /<div\s+id="_idContainer\d+"[^>]*>\s*<div[^>]*class="[^"]*\bBasisafbeeldingskader\b[^"]*"[^>]*>\s*<img[^>]*src="data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK4AAAABCAYAAABHRpXV[^"]*"[^>]*>\s*<\/div>\s*<\/div>/g,
    ''
  )
}

function replaceDiscChartImageInHtml(html: string, disc: DiscPercentages): string {
  const svg = generateChartSVG({ natural: disc.natural, response: disc.response })
  const b64 = Buffer.from(svg, 'utf8').toString('base64')
  const dataUri = `data:image/svg+xml;base64,${b64}`

  const patterns: RegExp[] = [
    /(<div\s+id="_idContainer021"[^>]*>[\s\S]*?<img[^>]+src=")\.\.\/image\/21\.png("[^>]*>)/,
    /(<div\s+id="_idContainer022"[^>]*>[\s\S]*?<img[^>]+src=")\.\.\/image\/22\.png("[^>]*>)/,
  ]

  for (const pattern of patterns) {
    const next = html.replace(pattern, `$1${dataUri}$2`)
    if (next !== html) return next
  }

  return html
}

export function renderPublicationPage(
  templateHtml: string,
  file: PublicationFile,
  data: RenderReportData
): {
  html: string
  unknownPlaceholders: string[]
  replacedCounts: Record<string, number>
  seenPlaceholders: string[]
} {
  const replacements: Record<string, string> = {
    Naam: data.candidateName,
    Voornaam: getVoornaam(data.candidateName),
    Datum:
      file === 'publication-1.html'
        ? `${formatDutchDate(data.assessmentDate)}\u00A0\u00A0\u00A0${data.profileCode}`
        : formatDutchDate(data.assessmentDate),
    Stijl: file === 'publication-1.html' ? '' : data.profileCode,
  }

  const { html: replacedHtml, unknownPlaceholders, replacedCounts, seenPlaceholders } = replacePlaceholders(
    templateHtml,
    replacements
  )

  let finalHtml = replacedHtml
  if (file === 'publication-2.html') {
    finalHtml = replaceDiscChartImageInHtml(finalHtml, data.percentages)
    finalHtml = removeDiscChartMidlineOverlayFromHtml(finalHtml)
    finalHtml = replaceDiscPercentagesInHtml(finalHtml, data.percentages)
  }

  return { html: finalHtml, unknownPlaceholders, replacedCounts, seenPlaceholders }
}
