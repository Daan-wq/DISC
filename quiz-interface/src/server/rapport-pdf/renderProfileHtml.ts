import { isValidProfileCode, normalizeProfileCode } from '../../lib/report/template-registry'

import { inlineCssUrls, inlineHtmlImgSrc } from './inlineAssets'
import { renderPublicationPage } from './publicationRenderer'
import { runPdfHtmlSanityChecks } from './sanityChecks'
import { readProfilePublicationFile, readProfileTemplateCss, readReportPrintCss } from './templateFs'
import { PUBLICATION_FILES, type PublicationFile, type RenderReportData } from './types'

const A4_72DPI_WIDTH_PX = 595.28
const A4_72DPI_HEIGHT_PX = 841.89

type ExtractedBody = {
  bodyId: string | null
  bodyStyle: string | null
  innerHtml: string
}

function extractBody(html: string): ExtractedBody {
  const bodyOpen = html.match(/<body\b([^>]*)>/i)
  const bodyCloseIdx = html.search(/<\/body>/i)

  if (!bodyOpen || bodyCloseIdx === -1) {
    throw new Error('[RAPPORT_PDF_TEMPLATE_BODY_NOT_FOUND] Could not find <body> in template HTML')
  }

  const bodyOpenTag = bodyOpen[0]
  const openEnd = html.indexOf(bodyOpenTag) + bodyOpenTag.length
  const innerHtml = html.slice(openEnd, bodyCloseIdx)

  const attrs = bodyOpen[1] || ''
  const idMatch = attrs.match(/\bid=(["'])([^"']+)\1/i)
  const styleMatch = attrs.match(/\bstyle=(["'])([^"']+)\1/i)

  return {
    bodyId: idMatch ? idMatch[2] : null,
    bodyStyle: styleMatch ? styleMatch[2] : null,
    innerHtml,
  }
}

function buildPdfShellHtml(params: {
  title: string
  styles: string
  body: string
}): string {
  return `<!doctype html>
<html lang="nl-NL">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${params.title}</title>
    <style>
${params.styles}
    </style>
  </head>
  <body>
${params.body}
  </body>
</html>`
}

function buildIframePageHtml(params: {
  styles: string
  bodyId: string | null
  bodyStyle: string | null
  body: string
  coverDynamicScript: string | null
}): string {
  const bodyIdAttr = params.bodyId ? ` id="${params.bodyId}"` : ''
  const bodyStyleAttr = params.bodyStyle ? ` style="${params.bodyStyle}"` : ''

  const scriptBlock = params.coverDynamicScript
    ? `\n<script>\n${params.coverDynamicScript}\n</script>\n`
    : ''

  return `<!doctype html>
<html lang="nl-NL">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
${params.styles}
    </style>
  </head>
  <body${bodyIdAttr}${bodyStyleAttr}>
${params.body}
${scriptBlock}  </body>
</html>`
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function toHtmlDataUrl(html: string): string {
  const b64 = Buffer.from(html, 'utf8').toString('base64')
  return `data:text/html;base64,${b64}`
}

function wrapBodyHtml(extracted: ExtractedBody): string {
  const bodyIdAttr = extracted.bodyId ? ` id="${extracted.bodyId}"` : ''
  // NOTE: Do not propagate template <body style="..."> to the wrapper.
  // Some templates (notably CD) include inline width/height on <body> that override our A4 wrapper sizing
  // (inline styles beat class-based CSS). That mismatch can trigger renderer shrink-to-fit.
  return `<div class="report-direct"${bodyIdAttr}>\n${extracted.innerHtml}\n</div>`
}

function buildPdfStyles(args: { reportPrintCss: string; idGeneratedCss: string }): string {
  return [
    '@page { size: A4 portrait; margin: 0; }',
    'html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '*, *::before, *::after { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    'body { width: 210mm; }',
    args.reportPrintCss,
    ':root { --report-scale: 1.3333333333; }',
    '.report-page { width: 210mm; height: 297mm; margin: 0; padding: 0; box-sizing: border-box; position: relative; overflow: hidden; }',
    `.report-iframe { width: ${A4_72DPI_WIDTH_PX}px; height: ${A4_72DPI_HEIGHT_PX}px; border: 0; transform: translate(0px, 0px) scale(var(--report-scale)); transform-origin: top left; display: block; overflow: hidden; }`,
    `.report-direct { width: ${A4_72DPI_WIDTH_PX}px; height: ${A4_72DPI_HEIGHT_PX}px; transform: translate(0px, 0px) scale(var(--report-scale)); transform-origin: top left; display: block; position: relative; overflow: hidden; background: #fff; contain: strict; }`,
    args.idGeneratedCss,
    '.report-page { break-after: page; page-break-after: always; }',
    '.report-page:last-child { break-after: auto; page-break-after: auto; }',
  ].join('\n')
}

function coerceFile(value: string): PublicationFile {
  if ((PUBLICATION_FILES as readonly string[]).includes(value)) {
    return value as PublicationFile
  }
  throw new Error(`[RAPPORT_PDF_INVALID_PUBLICATION_FILE] Invalid file: ${value}`)
}

export async function renderProfileHtml(profileCodeRaw: string, data: RenderReportData): Promise<string> {
  return renderProfileHtmlWithOptions(profileCodeRaw, data)
}

export async function renderProfileHtmlWithOptions(
  profileCodeRaw: string,
  data: RenderReportData,
  options: { allowScripts?: boolean } = {}
): Promise<string> {
  const profileCode = normalizeProfileCode(profileCodeRaw)

  if (!isValidProfileCode(profileCode)) {
    throw new Error(`[RAPPORT_PDF_INVALID_PROFILE_CODE] Invalid profile code: ${profileCode}`)
  }

  console.info('[rapport-pdf] renderProfileHtml start', { profileCode })

  const { css: reportPrintCss, cssPath: reportPrintCssPath } = await readReportPrintCss()
  const { css: idGeneratedCssRaw, cssPath: idGeneratedCssPath } = await readProfileTemplateCss(profileCode)

  const { css: idGeneratedCss, inlinedCount: inlinedCssAssets } = inlineCssUrls(
    idGeneratedCssRaw,
    idGeneratedCssPath
  )

  const styles = buildPdfStyles({ reportPrintCss, idGeneratedCss })

  const unknownPlaceholdersByFile: Record<string, string[]> = {}
  const placeholderStatsByFile: Record<
    string,
    { seen: string[]; replacedCounts: Record<string, number> }
  > = {}

  let totalInlinedImages = 0

  const coverDynamicScript = (() => {
    const normalized = idGeneratedCssPath.replace(/\\/g, '/')
    const idx = normalized.indexOf('/report-templates/')
    if (idx === -1) return null
    const templatesRoot = normalized.slice(0, idx + '/report-templates/'.length)
    const scriptPath = `${templatesRoot}cover-dynamic.js`
    try {
      const fs = require('fs') as typeof import('fs')
      if (!fs.existsSync(scriptPath)) return null
      return fs.readFileSync(scriptPath, 'utf8') as string
    } catch {
      return null
    }
  })()

  const pageBodies: string[] = []

  for (const fileName of PUBLICATION_FILES) {
    const file = coerceFile(fileName)
    const { html: templateHtml, htmlPath } = await readProfilePublicationFile(profileCode, file)

    const { html: renderedHtml, unknownPlaceholders, replacedCounts, seenPlaceholders } = renderPublicationPage(
      templateHtml,
      file,
      {
      ...data,
      profileCode,
      }
    )

    placeholderStatsByFile[file] = { seen: seenPlaceholders, replacedCounts }

    if (unknownPlaceholders.length > 0) {
      unknownPlaceholdersByFile[file] = unknownPlaceholders
    }

    const { html: withInlinedImages, inlinedCount } = inlineHtmlImgSrc(renderedHtml, htmlPath)
    totalInlinedImages += inlinedCount

    const extracted = extractBody(withInlinedImages)

    if (file === 'publication.html') {
      const wrappedBody = wrapBodyHtml(extracted)
      pageBodies.push(
        `<div class="report-page" data-publication-file="${file}">\n` +
          `${wrappedBody}\n` +
          `</div>`
      )
      continue
    }

    const wrappedBody = wrapBodyHtml(extracted)
    pageBodies.push(
      `<div class="report-page" data-publication-file="${file}">\n` +
        `${wrappedBody}\n` +
        `</div>`
    )
  }

  const coverScriptBlock =
    options.allowScripts === true && coverDynamicScript
      ? `\n<script>\n${coverDynamicScript}\n</script>\n`
      : ''

  const body = pageBodies.join('\n') + coverScriptBlock

  const finalHtml = buildPdfShellHtml({
    title: `DISC rapport ${profileCode}`,
    styles,
    body,
  })

  if (Object.keys(unknownPlaceholdersByFile).length > 0) {
    console.warn('[rapport-pdf] unknown placeholders', { profileCode, unknownPlaceholdersByFile })
  }

  console.info('[rapport-pdf] placeholder summary', { profileCode, placeholderStatsByFile })

  console.info('[rapport-pdf] inlining summary', {
    profileCode,
    reportPrintCssPath,
    idGeneratedCssPath,
    inlinedCssAssets,
    inlinedImages: totalInlinedImages,
    htmlChars: finalHtml.length,
    htmlKb: Math.round(finalHtml.length / 1024),
  })

  runPdfHtmlSanityChecks(finalHtml, { allowScripts: options.allowScripts === true })

  return finalHtml
}
