type SanityIssue = {
  code: string
  message: string
  offenders: string[]
}

type SanityCheckOptions = {
  allowScripts?: boolean
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function collectMatches(html: string, regex: RegExp, max = 50): string[] {
  const out: string[] = []
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`)
  let m: RegExpExecArray | null
  while ((m = r.exec(html))) {
    out.push(m[0])
    if (out.length >= max) break
  }
  return out
}

export function runPdfHtmlSanityChecks(html: string, options: SanityCheckOptions = {}): void {
  const issues: SanityIssue[] = []

  const allowScripts = options.allowScripts === true
  const scriptTags = collectMatches(html, /<script\b[\s\S]*?>/gi)
  if (!allowScripts && scriptTags.length > 0) {
    issues.push({
      code: 'RAPPORT_PDF_SCRIPT_TAG_FOUND',
      message: 'HTML contains <script> tags. This is not allowed for Api2PDF PDF-only HTML.',
      offenders: unique(scriptTags),
    })
  }

  const linkTags = collectMatches(html, /<link\b[\s\S]*?>/gi)
  if (linkTags.length > 0) {
    issues.push({
      code: 'RAPPORT_PDF_LINK_TAG_FOUND',
      message: 'HTML contains <link> tags. CSS must be inlined.',
      offenders: unique(linkTags),
    })
  }

  const placeholders = collectMatches(html, /&lt;&lt;[^&]+&gt;&gt;|<<[^>]+>>/g)
  if (placeholders.length > 0) {
    issues.push({
      code: 'RAPPORT_PDF_UNRESOLVED_PLACEHOLDERS',
      message: 'HTML contains unresolved placeholders.',
      offenders: unique(placeholders),
    })
  }

  const relativeAttrs = collectMatches(html, /\b(?:src|href)=(["'])(?:\.\.?\/[^"']+)\1/gi)
  if (relativeAttrs.length > 0) {
    issues.push({
      code: 'RAPPORT_PDF_RELATIVE_URLS_REMAIN',
      message: 'HTML still contains relative src/href attributes. Assets must be inlined as data: URIs.',
      offenders: unique(relativeAttrs),
    })
  }

  const relativeCssUrls = collectMatches(
    html,
    /url\(\s*(["']?)(?!data:|https?:|about:|#|blob:)([^"')]+)\1\s*\)/gi
  )
  if (relativeCssUrls.length > 0) {
    issues.push({
      code: 'RAPPORT_PDF_RELATIVE_CSS_URLS_REMAIN',
      message: 'HTML still contains CSS url(...) references that are not data: URIs.',
      offenders: unique(relativeCssUrls),
    })
  }

  if (issues.length > 0) {
    const payload = issues.map((i) => ({
      code: i.code,
      message: i.message,
      offenders: i.offenders,
    }))

    throw new Error(`[RAPPORT_PDF_SANITY_FAILED] ${JSON.stringify(payload)}`)
  }
}
