import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { supabaseAdmin } from '@/lib/supabase'
import { isValidProfileCode, normalizeProfileCode } from '@/lib/report/template-registry'
import { computeDisc, type AnswerInput } from '@/lib/disc'
import { generateChartSVG } from '@/lib/utils/chart-generator'
import { resolveTemplatesRoots } from '@/server/rapport-pdf/templateFs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const USED_GRACE_MS = 2 * 60 * 1000

const PUBLICATION_FILES = new Set([
  'publication.html',
  'publication-1.html',
  'publication-2.html',
  'publication-3.html',
  'publication-4.html',
  'publication-5.html',
  'publication-6.html',
  'publication-7.html',
  'publication-8.html',
])

type RenderReportData = {
  profileCode: string
  assessmentDate: string
  candidateName: string
  percentages: {
    natural: { D: number; I: number; S: number; C: number }
    response: { D: number; I: number; S: number; C: number }
  }
}

type DiscScores = { D: number; I: number; S: number; C: number }
type DiscPercentages = { natural: DiscScores; response: DiscScores }

function parseTimestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }

  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null

  const direct = Date.parse(raw)
  if (Number.isFinite(direct)) return direct

  const isoGuess = raw
    .replace(' ', 'T')
    .replace(/\+00(?::?00)?$/, 'Z')

  const guessed = Date.parse(isoGuess)
  if (Number.isFinite(guessed)) return guessed

  return null
}

function normalizeLetter(value: unknown): 'A' | 'B' | 'C' | 'D' | null {
  if (value === 'A' || value === 'B' || value === 'C' || value === 'D') return value
  return null
}

function letterToOffset(letter: 'A' | 'B' | 'C' | 'D'): number {
  if (letter === 'A') return 0
  if (letter === 'B') return 1
  if (letter === 'C') return 2
  return 3
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

async function computeDiscFromAttemptAnswers(attemptId: string): Promise<{
  profileCode: string
  percentages: DiscPercentages
} | null> {
  if (!supabaseAdmin) return null

  const { data: answersRow, error: answersErr } = await supabaseAdmin
    .from('answers')
    .select('payload')
    .eq('attempt_id', attemptId)
    .maybeSingle()

  if (answersErr || !answersRow) {
    console.error('[rapport/render-publication] failed to fetch answers for attempt:', {
      attemptId,
      error: answersErr,
    })
    return null
  }

  const rawAnswers = (answersRow as any)?.payload?.answers
  if (!Array.isArray(rawAnswers) || rawAnswers.length !== 48) {
    return null
  }

  const letters: Array<'A' | 'B' | 'C' | 'D'> = []
  for (const raw of rawAnswers) {
    const normalized = normalizeLetter(raw)
    if (!normalized) return null
    letters.push(normalized)
  }

  const discAnswers: AnswerInput[] = letters.map((letter, idx) => {
    const pairIndex = Math.floor(idx / 2)
    const statementId = pairIndex * 4 + 1 + letterToOffset(letter)
    const selection = idx % 2 === 0 ? 'most' : 'least'
    return { statementId, selection }
  })

  const result = computeDisc(discAnswers)

  return {
    profileCode: result.profileCode,
    percentages: {
      natural: {
        D: clampPct(result.percentages.natural.D),
        I: clampPct(result.percentages.natural.I),
        S: clampPct(result.percentages.natural.S),
        C: clampPct(result.percentages.natural.C),
      },
      response: {
        D: clampPct(result.percentages.response.D),
        I: clampPct(result.percentages.response.I),
        S: clampPct(result.percentages.response.S),
        C: clampPct(result.percentages.response.C),
      },
    },
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

function buildErrorHtml(token: string | null, message: string): string {
  const safeMessage = escapeHtml(message)
  const payload = {
    type: 'disc_report_error',
    token,
    message,
  }

  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rapport fout</title>
  </head>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 16px;">
    <script>
      (function () {
        try {
          if (window.parent && window.parent !== window) {
            var payload = ${JSON.stringify(payload)};
            window.parent.postMessage(payload, window.location.origin);
          }
        } catch (e) {
        }
      })();
    </script>
    <h1 style="margin: 0 0 8px; font-size: 18px;">Kon rapport niet laden</h1>
    <p style="margin: 0; font-size: 14px; line-height: 1.4;">${safeMessage}</p>
  </body>
</html>`
}

function respondError(
  req: NextRequest,
  token: string | null,
  message: string,
  status: number
): NextResponse {
  const accept = req.headers.get('accept') || ''
  const wantsHtml = accept.includes('text/html')

  if (wantsHtml) {
    return new NextResponse(buildErrorHtml(token, message), {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }

  return NextResponse.json({ error: message }, { status })
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

function injectBaseHref(html: string, baseHref: string): string {
  if (/<base\s/i.test(html)) {
    return html
  }

  const headOpenMatch = html.match(/<head[^>]*>/i)
  if (!headOpenMatch) {
    return html
  }

  const headOpen = headOpenMatch[0]
  const injection = `${headOpen}\n\t\t<base href="${baseHref}">`
  return html.replace(headOpen, injection)
}

function ensureCoverDynamicScript(html: string): string {
  const withoutExisting = html.replace(
    /<script\b[^>]*src=["'][^"']*cover-dynamic\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    ''
  )

  const headCloseMatch = withoutExisting.match(/<\/head\s*>/i)
  if (!headCloseMatch) {
    return withoutExisting
  }

  const injection = `\n\t\t<script src="/report-templates/cover-dynamic.js"></script>\n` + headCloseMatch[0]
  return withoutExisting.replace(headCloseMatch[0], injection)
}

function replacePlaceholders(
  html: string,
  replacements: Record<string, string>
): { html: string; unknownPlaceholders: string[] } {
  const unknown = new Set<string>()

  const replaced = html.replace(
    /&lt;&lt;([^<>]+)&gt;&gt;|<<([^<>]+)>>/g,
    (match, escapedName: string | undefined, rawName: string | undefined) => {
      const name = String(escapedName || rawName || '').trim()
      if (!name) return match

      if (Object.prototype.hasOwnProperty.call(replacements, name)) {
        return escapeHtml(replacements[name] ?? '')
      }

      unknown.add(name)
      return match
    }
  )

  return { html: replaced, unknownPlaceholders: Array.from(unknown) }
}

async function getReportDataFromToken(token: string): Promise<RenderReportData> {
  if (!supabaseAdmin) {
    throw new Error('Server not configured')
  }

  const { data: tokenData, error: tokenErr } = await supabaseAdmin
    .from('print_tokens')
    .select('id, attempt_id, user_id, expires_at, used, used_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr || !tokenData) {
    throw new Error('Invalid token')
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    throw new Error('Token expired')
  }

  if (!tokenData.used) {
    const nowIso = new Date().toISOString()
    const { error: usedErr } = await supabaseAdmin
      .from('print_tokens')
      .update({ used: true, used_at: nowIso })
      .eq('id', tokenData.id)

    if (usedErr) {
      const errAny = usedErr as any
      console.error('[rapport/render-publication] failed to mark token used:', {
        code: errAny?.code,
        message: errAny?.message,
        hint: errAny?.hint,
        details: errAny?.details,
      })
    }
  } else {
    if (!tokenData.used_at) {
      throw new Error('Token already used')
    }

    const parsedUsedAtMs = parseTimestampMs(tokenData.used_at)
    const usedAtMs = parsedUsedAtMs ?? Date.now()
    const withinGrace = Date.now() - usedAtMs <= USED_GRACE_MS

    if (!withinGrace) {
      throw new Error('Token already used')
    }

    const nowIso = new Date().toISOString()
    const { error: refreshErr } = await supabaseAdmin
      .from('print_tokens')
      .update({ used_at: nowIso })
      .eq('id', tokenData.id)

    if (refreshErr) {
      console.error('[rapport/render-publication] failed to refresh token used_at:', refreshErr)
    }

    console.info('[rapport/render-publication] token already used (allowed within grace)')
  }

  const { data: attempt, error: attemptErr } = await supabaseAdmin
    .from('quiz_attempts')
    .select('id, result_payload, finished_at')
    .eq('id', tokenData.attempt_id)
    .maybeSingle()

  if (attemptErr || !attempt) {
    throw new Error('Attempt not found')
  }

  const { data: candidate, error: candidateErr } = await supabaseAdmin
    .from('candidates')
    .select('full_name')
    .eq('user_id', tokenData.user_id)
    .maybeSingle()

  if (candidateErr) {
    console.error('[rapport/render-publication] failed to fetch candidate:', candidateErr)
  }

  const payload = (attempt as any).result_payload || {}

  let profileCodeRaw = typeof payload?.profileCode === 'string' ? payload.profileCode : null
  let percentages: DiscPercentages | null = payload?.percentages || null

  if (!profileCodeRaw || !percentages) {
    const computed = await computeDiscFromAttemptAnswers((attempt as any).id)
    if (computed) {
      profileCodeRaw = computed.profileCode
      percentages = computed.percentages

      try {
        await supabaseAdmin
          .from('quiz_attempts')
          .update({
            result_payload: {
              profileCode: computed.profileCode,
              percentages: computed.percentages,
            },
          })
          .eq('id', (attempt as any).id)
      } catch (persistErr) {
        console.error('[rapport/render-publication] failed to persist computed result_payload:', persistErr)
      }
    }
  }

  const profileCode = normalizeProfileCode(profileCodeRaw || 'D')
  const safePercentages: DiscPercentages = percentages || {
    natural: { D: 0, I: 0, S: 0, C: 0 },
    response: { D: 0, I: 0, S: 0, C: 0 },
  }

  return {
    profileCode,
    assessmentDate: (attempt as any).finished_at || new Date().toISOString(),
    candidateName: candidate?.full_name || 'Deelnemer',
    percentages: safePercentages,
  }
}

function getPublicationFilePath(profileCode: string, file: string): string {
  const { templatesRoot } = resolveTemplatesRoots()
  return path.join(templatesRoot, profileCode, 'publication-web-resources', 'html', file)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const file = searchParams.get('file')

    if (!token) {
      return respondError(req, null, 'Missing token', 400)
    }

    if (!file || !PUBLICATION_FILES.has(file)) {
      return respondError(req, token, 'Invalid file', 400)
    }

    let data: RenderReportData
    try {
      data = await getReportDataFromToken(token)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Internal server error'
      const status =
        message === 'Invalid token'
          ? 401
          : message === 'Token expired'
            ? 410
            : message === 'Token already used'
              ? 409
              : message === 'Attempt not found'
                ? 404
                : 500

      console.error('[rapport/render-publication] token error:', e)
      return respondError(req, token, message, status)
    }

    if (!isValidProfileCode(data.profileCode)) {
      return respondError(req, token, `Ongeldige profielcode: ${data.profileCode}`, 400)
    }

    const templateBasePath = `/report-templates/${data.profileCode}`
    const baseHref = `${templateBasePath}/publication-web-resources/html/`

    const htmlPath = getPublicationFilePath(data.profileCode, file)

    let html: string
    try {
      html = await readFile(htmlPath, 'utf8')
    } catch (e: any) {
      if (e?.code === 'ENOENT') {
        return respondError(req, token, 'Template file not found', 404)
      }
      throw e
    }

    html = injectBaseHref(html, baseHref)

    if (file === 'publication.html') {
      html = ensureCoverDynamicScript(html)
    }

    const replacements: Record<string, string> = {
      Naam: data.candidateName,
      Voornaam: getVoornaam(data.candidateName),
      Datum:
        file === 'publication-1.html'
          ? `${formatDutchDate(data.assessmentDate)}\u00A0\u00A0\u00A0${data.profileCode}`
          : formatDutchDate(data.assessmentDate),
      Stijl: file === 'publication-1.html' ? '' : data.profileCode,
    }

    const { html: replacedHtml, unknownPlaceholders } = replacePlaceholders(html, replacements)

    let finalHtml = replacedHtml
    if (file === 'publication-2.html') {
      finalHtml = replaceDiscChartImageInHtml(finalHtml, data.percentages)
      finalHtml = removeDiscChartMidlineOverlayFromHtml(finalHtml)
      finalHtml = replaceDiscPercentagesInHtml(finalHtml, data.percentages)
    }

    if (unknownPlaceholders.length > 0) {
      console.warn('[rapport/render-publication] unknown placeholders:', {
        file,
        unknownPlaceholders,
      })
    }

    return new NextResponse(finalHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (e) {
    console.error('[rapport/render-publication] error:', e)
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const message = e instanceof Error ? e.message : 'Internal server error'
    return respondError(req, token, message, 500)
  }
}
