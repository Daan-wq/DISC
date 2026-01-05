import fs from 'fs'
import path from 'path'

function tryResolveSharedFontPath(fontFileName: string): string | null {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, 'apps', 'quiz', 'assets', 'report', 'fonts', fontFileName),
    path.join(cwd, 'assets', 'report', 'fonts', fontFileName),
  ]

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // ignore
    }
  }

  return null
}

function extractProfileCodeFromTemplatePath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/')
  const m = normalized.match(/\/report-templates\/([A-Za-z]{1,2})\//)
  return m ? String(m[1]).toUpperCase() : null
}

function tryResolveProfileSrcAssetPath(profileCode: string, relativePathFromTemplateRoot: string): string | null {
  const cwd = process.cwd()
  const srcRoot = path.join(cwd, 'apps', 'quiz', 'src')

  try {
    if (!fs.existsSync(srcRoot)) return null
  } catch {
    return null
  }

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(srcRoot, { withFileTypes: true })
  } catch {
    return null
  }

  const wantedPrefix = `1 ${profileCode} `
  const match = entries.find((e) => e.isDirectory() && e.name.startsWith(wantedPrefix))
  if (!match) return null

  const abs = path.join(srcRoot, match.name, relativePathFromTemplateRoot)
  try {
    return fs.existsSync(abs) ? abs : null
  } catch {
    return null
  }
}

function tryResolveAnyPublicTemplateImagePath(fileName: string): string | null {
  const cwd = process.cwd()
  const templatesRoot = path.join(cwd, 'apps', 'quiz', 'public', 'report-templates')

  let entries: fs.Dirent[]
  try {
    if (!fs.existsSync(templatesRoot)) return null
    entries = fs.readdirSync(templatesRoot, { withFileTypes: true })
  } catch {
    return null
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const candidate = path.join(
      templatesRoot,
      entry.name,
      'publication-web-resources',
      'image',
      fileName
    )
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // ignore
    }
  }

  return null
}

function guessMimeTypeFromExt(ext: string): string {
  const normalized = ext.toLowerCase()
  if (normalized === '.png') return 'image/png'
  if (normalized === '.jpg' || normalized === '.jpeg') return 'image/jpeg'
  if (normalized === '.gif') return 'image/gif'
  if (normalized === '.webp') return 'image/webp'
  if (normalized === '.svg') return 'image/svg+xml'

  if (normalized === '.ttf') return 'font/ttf'
  if (normalized === '.otf') return 'font/otf'
  if (normalized === '.woff') return 'font/woff'
  if (normalized === '.woff2') return 'font/woff2'

  return 'application/octet-stream'
}

function isProbablyHtml(buf: Buffer): boolean {
  const prefix = buf.subarray(0, 256).toString('utf8').trimStart()
  return prefix.startsWith('<!DOCTYPE') || prefix.startsWith('<html') || prefix.startsWith('<')
}

function validateFontFileBytes(absPath: string, bytes: Buffer): void {
  if (isProbablyHtml(bytes)) {
    throw new Error(
      `[RAPPORT_PDF_INVALID_FONT_FILE] Font file appears to be HTML, not a font: ${absPath}`
    )
  }

  const header = bytes.subarray(0, 4)
  const isOtf = header.toString('ascii') === 'OTTO'
  const isTtf = header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00

  if (!isOtf && !isTtf) {
    throw new Error(
      `[RAPPORT_PDF_INVALID_FONT_HEADER] Font file has unexpected header (expected OTTO or 0x00010000): ${absPath}`
    )
  }
}

function toDataUri(absPath: string, bytes: Buffer, mime: string): string {
  const b64 = bytes.toString('base64')
  return `data:${mime};base64,${b64}`
}

function shouldSkipUrl(url: string): boolean {
  const v = url.trim().toLowerCase()
  return (
    v.startsWith('data:') ||
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('about:') ||
    v.startsWith('#') ||
    v.startsWith('blob:')
  )
}

export function inlineCssUrls(css: string, cssPath: string): { css: string; inlinedCount: number } {
  const baseDir = path.dirname(cssPath)
  let inlinedCount = 0

  const rewritten = css.replace(/url\(([^)]+)\)/g, (full, rawGroup: string) => {
    const raw = String(rawGroup).trim()
    const unquoted = raw.replace(/^['"]/, '').replace(/['"]$/, '').trim()

    if (!unquoted) return full
    if (shouldSkipUrl(unquoted)) return full

    const absPath = path.resolve(baseDir, unquoted)

    const ext = path.extname(absPath)
    const mime = guessMimeTypeFromExt(ext)

    let resolvedPath = absPath
    if (!fs.existsSync(resolvedPath) && mime.startsWith('font/')) {
      const fallback = tryResolveSharedFontPath(path.basename(unquoted))
      if (fallback) {
        resolvedPath = fallback
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[RAPPORT_PDF_MISSING_CSS_ASSET] CSS url() asset not found: ${unquoted} (resolved: ${absPath}, css: ${cssPath})`
      )
    }

    const bytes = fs.readFileSync(resolvedPath)

    const resolvedExt = path.extname(resolvedPath)
    const resolvedMime = guessMimeTypeFromExt(resolvedExt)

    if (resolvedMime.startsWith('font/')) {
      validateFontFileBytes(resolvedPath, bytes)
    }

    inlinedCount += 1
    const dataUri = toDataUri(resolvedPath, bytes, resolvedMime)

    const quote = raw.startsWith('"') ? '"' : raw.startsWith("'") ? "'" : ''
    return `url(${quote}${dataUri}${quote})`
  })

  return { css: rewritten, inlinedCount }
}

export function inlineHtmlImgSrc(html: string, htmlPath: string): { html: string; inlinedCount: number } {
  const baseDir = path.dirname(htmlPath)
  let inlinedCount = 0

  const rewritten = html.replace(/<img\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>/gi, (full, quote, src) => {
    const rawSrc = String(src).trim()
    if (!rawSrc || shouldSkipUrl(rawSrc)) return full

    const absPath = path.resolve(baseDir, rawSrc)

    let resolvedPath = absPath
    if (!fs.existsSync(resolvedPath)) {
      const profileCode = extractProfileCodeFromTemplatePath(htmlPath)
      const fileName = path.basename(rawSrc)

      if (profileCode && fileName) {
        const fromSrc = tryResolveProfileSrcAssetPath(
          profileCode,
          path.join('publication-web-resources', 'image', fileName)
        )
        if (fromSrc) {
          resolvedPath = fromSrc
        }
      }

      if (!fs.existsSync(resolvedPath) && fileName) {
        const fromOtherTemplate = tryResolveAnyPublicTemplateImagePath(fileName)
        if (fromOtherTemplate) {
          resolvedPath = fromOtherTemplate
        }
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[RAPPORT_PDF_MISSING_IMAGE] img src not found: ${rawSrc} (resolved: ${absPath}, html: ${htmlPath})`
      )
    }

    const bytes = fs.readFileSync(resolvedPath)
    const mime = guessMimeTypeFromExt(path.extname(resolvedPath))
    const dataUri = toDataUri(resolvedPath, bytes, mime)

    inlinedCount += 1
    return full.replace(`${quote}${src}${quote}`, `${quote}${dataUri}${quote}`)
  })

  return { html: rewritten, inlinedCount }
}
