import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'

import { supabase, supabaseAdmin } from '@/lib/supabase'
import { computeDisc, type AnswerInput } from '@/lib/disc'
import { renderProfileHtml, renderProfileHtmlWithOptions } from '@/server/rapport-pdf/renderProfileHtml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const PDF_CACHE_VERSION = 'api2pdf-v5-a4-fit'

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  use_cache: z.boolean().optional(),
})

type DiscScores = { D: number; I: number; S: number; C: number }

type DiscPercentages = {
  natural: DiscScores
  response: DiscScores
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
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

function sanitizeFilename(value: string): string {
  const trimmed = String(value || '').trim()
  const safe = trimmed
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return safe || 'DISC-Rapport'
}

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
  return token || null
}

function parseTtlDays(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

function parseDelayMs(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

function parseTimeoutMs(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

function addDaysIso(fromIso: string, days: number): string {
  const base = new Date(fromIso)
  if (Number.isNaN(base.getTime())) return fromIso
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString()
}

function isFutureIso(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() > Date.now()
}

async function downloadStoragePdf(path: string): Promise<ArrayBuffer | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin.storage.from('quiz-docs').download(path)
  if (error || !data) return null

  return await data.arrayBuffer()
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

  if (answersErr || !answersRow) return null

  const rawAnswers = (answersRow as any)?.payload?.answers
  if (!Array.isArray(rawAnswers) || rawAnswers.length !== 48) return null

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

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchApi2PdfWithRetry(args: {
  makeRequest: () => Promise<Response>
  requestId: string
  attemptId: string
  mode: 'html' | 'url'
  maxRetries: number
  baseDelayMs: number
}): Promise<Response> {
  let attempt = 0
  // total attempts = 1 + maxRetries
  while (true) {
    attempt += 1
    const resp = await args.makeRequest()
    if (resp.ok) return resp

    const isRetryable = resp.status >= 500 && resp.status !== 501
    if (!isRetryable || attempt > 1 + args.maxRetries) {
      return resp
    }

    const delay = Math.min(args.baseDelayMs * attempt, 10_000)
    console.warn('[rapport/download-pdf] api2pdf retrying after error', {
      requestId: args.requestId,
      attempt_id: args.attemptId,
      mode: args.mode,
      status: resp.status,
      attempt,
      delay_ms: delay,
    })

    await sleepMs(delay)
  }
}

async function uploadHtmlToStorageAndSignUrl(args: {
  attemptId: string
  requestId: string
  html: string
}): Promise<{ storagePath: string; signedUrl: string }> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin not configured')
  }

  const storagePath = `reports/${args.attemptId}/${PDF_CACHE_VERSION}/source-${args.requestId}.html`
  const htmlBytes = new TextEncoder().encode(args.html)

  const uploadRes = await supabaseAdmin.storage.from('quiz-docs').upload(storagePath, htmlBytes, {
    cacheControl: '0',
    contentType: 'text/html; charset=utf-8',
    upsert: true,
  })

  if (uploadRes.error) {
    throw new Error(`Failed to upload HTML to storage: ${uploadRes.error.message}`)
  }

  const signedRes = await supabaseAdmin.storage.from('quiz-docs').createSignedUrl(storagePath, 5 * 60)
  if (signedRes.error || !signedRes.data?.signedUrl) {
    throw new Error(`Failed to create signed URL for HTML: ${signedRes.error?.message || 'unknown error'}`)
  }

  return { storagePath, signedUrl: signedRes.data.signedUrl }
}

function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'name' in e && (e as any).name === 'AbortError'
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise

  let timeout: NodeJS.Timeout | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          const err = new Error('Timeout')
          ;(err as any).name = 'AbortError'
          reject(err)
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function generatePdfWithPuppeteer(args: {
  html: string
  timeoutMs: number
}): Promise<Uint8Array> {
  const puppeteerMod = await import('puppeteer')
  const puppeteer = (puppeteerMod as any).default || puppeteerMod

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    page.on('pageerror', (err) => {
      console.error('[rapport/download-pdf] puppeteer pageerror', {
        error: err?.message || String(err),
        stack: (err as any)?.stack,
      })
    })

    page.on('console', (msg) => {
      const type = msg.type()
      if (type !== 'error' && type !== 'warning') return
      console.warn('[rapport/download-pdf] puppeteer console', {
        type,
        text: msg.text(),
      })
    })

    await page.setContent(args.html, { waitUntil: ['load', 'networkidle0'] })

    // networkidle0 does not guarantee that large data-URI images (like the cover background)
    // have fully decoded. If we generate the PDF too early, Chromium can output a blank cover.
    try {
      const decodeTimeout = Math.min(7000, Math.max(1500, Math.floor(args.timeoutMs / 6)))
      await runWithTimeout(
        page.evaluate(async () => {
          async function waitForDocAssets(doc: Document): Promise<void> {
            const fonts: any = (doc as any).fonts
            if (fonts?.ready) {
              try {
                await fonts.ready
              } catch {
                // ignore
              }
            }

            const imgs = Array.from(doc.images || []) as HTMLImageElement[]
            await Promise.all(
              imgs.map(async (img) => {
                try {
                  if (typeof (img as any).decode === 'function') {
                    await (img as any).decode()
                    return
                  }
                } catch {
                  // ignore decode errors
                }

                if (img.complete) return

                await new Promise<void>((resolve) => {
                  const done = () => resolve()
                  img.addEventListener('load', done, { once: true })
                  img.addEventListener('error', done, { once: true })
                })
              })
            )
          }

          await waitForDocAssets(document)

          const frames = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[]
          for (const f of frames) {
            const d = f.contentDocument
            if (d) {
              await waitForDocAssets(d)
            }
          }
        }),
        decodeTimeout
      )
    } catch {
      // Best-effort; continue even if decoding takes too long.
    }

    // The cover page is rendered in an iframe and uses a dynamic overlay script
    // (cover-dynamic.js) to replace the per-word positioned spans with a centered name block.
    // In headless PDF generation we must wait for iframe DOM + overlay to be ready,
    // otherwise the iframe can render as a blank/white page in the resulting PDF.
    try {
      const timeout = Math.min(5000, Math.max(1000, Math.floor(args.timeoutMs / 10)))
      await page.waitForFunction(
        () => {
          const frames = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[]
          if (frames.length === 0) {
            const hasName = Boolean(document.getElementById('_idTextSpan002'))
            const hasOverlay = Boolean(document.getElementById('__cover_dynamic_overlay'))
            return hasName ? hasOverlay : true
          }

          return frames.every((f) => {
            const d = f.contentDocument
            if (!d || d.readyState !== 'complete') return false

            const hasName = Boolean(d.getElementById('_idTextSpan002'))
            const hasOverlay = Boolean(d.getElementById('__cover_dynamic_overlay'))

            // If it looks like a cover page (has the original name span), we expect the overlay.
            return hasName ? hasOverlay : true
          })
        },
        { timeout }
      )
    } catch {
      // If the iframe/overlay doesn't render in time, continue (better a PDF than a crash).
    }

    // Give the browser one more frame to paint after scripts/assets settle.
    try {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve())
          })
      )
    } catch {
      // ignore
    }

    const pdfData = await runWithTimeout(
      page.pdf({
        width: '210mm',
        height: '297mm',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        preferCSSPageSize: false,
      }) as Promise<Uint8Array>,
      args.timeoutMs
    )

    return pdfData
  } finally {
    await browser.close()
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function truncateString(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value
  return value.slice(0, maxLen) + `...[truncated ${value.length - maxLen} chars]`
}

async function readResponseBodySafe(resp: Response): Promise<{ json: any | null; text: string | null }> {
  try {
    const cloned = resp.clone()
    const text = await cloned.text()
    if (!text) return { json: null, text: '' }
    try {
      return { json: JSON.parse(text), text }
    } catch {
      return { json: null, text }
    }
  } catch {
    return { json: null, text: null }
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || randomUUID().slice(0, 8)
  const t0 = Date.now()
  let stage = 'init'
  let stageTimeoutMs: number | null = null
  let api2pdfModeForError: 'html' | 'url' | null = null

  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured (no service role)', request_id: requestId },
        { status: 500 }
      )
    }

    const pdfRendererRaw = (process.env.PDF_RENDERER || '').trim().toLowerCase()
    const isVercelRuntime =
      process.env.VERCEL === '1' ||
      typeof process.env.VERCEL_ENV === 'string' ||
      typeof process.env.VERCEL_URL === 'string'

    const defaultRenderer = isVercelRuntime ? 'api2pdf' : 'local'
    const requestedRenderer = pdfRendererRaw || defaultRenderer
    const effectiveRenderer = isVercelRuntime ? 'api2pdf' : requestedRenderer
    const useLocalRenderer = effectiveRenderer === 'local'

    const apiKey = process.env.API2PDF_API_KEY
    const api2pdfApiKey = apiKey || ''
    if (!useLocalRenderer && !api2pdfApiKey) {
      return NextResponse.json(
        { error: 'Server not configured (missing API2PDF_API_KEY)', request_id: requestId },
        { status: 500 }
      )
    }

    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized', request_id: requestId }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized', request_id: requestId }, { status: 401 })

    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', request_id: requestId }, { status: 400 })
    }

    const { attempt_id, use_cache } = parsed.data

    const shouldUseCache = process.env.NODE_ENV === 'production' && use_cache !== false

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id, result_payload, finished_at, pdf_path, pdf_filename, pdf_expires_at')
      .eq('id', attempt_id)
      .maybeSingle()

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found', request_id: requestId }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden', request_id: requestId }, { status: 403 })
    }

    const cacheVersionOk =
      typeof attempt.pdf_path === 'string' && attempt.pdf_path.includes(`/${PDF_CACHE_VERSION}/`)

    const cacheValid = Boolean(
      attempt.pdf_path && cacheVersionOk && isFutureIso((attempt as any).pdf_expires_at)
    )

    if (shouldUseCache && cacheValid && attempt.pdf_path) {
      try {
        const cached = await downloadStoragePdf(attempt.pdf_path)
        if (cached) {
          const filename = attempt.pdf_filename || 'DISC-Rapport.pdf'
          return new Response(cached, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Cache-Control': 'no-store',
              'x-pdf-cache': 'hit',
              'x-request-id': requestId,
              'x-pdf-renderer': 'cache',
            },
          })
        }
      } catch (e: any) {
        console.warn('[rapport/download-pdf] cache download failed', {
          requestId,
          attempt_id,
          error: e?.message || String(e),
        })
      }
    }

    const { data: candidate } = await supabaseAdmin
      .from('candidates')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const payload = (attempt as any)?.result_payload || {}

    let profileCode: string | null = (payload as any).profileCode || null
    let percentages: DiscPercentages | null = (payload as any).percentages || null

    if (!profileCode || !percentages) {
      const computed = await computeDiscFromAttemptAnswers(attempt_id)
      if (computed) {
        profileCode = computed.profileCode
        percentages = computed.percentages

        try {
          await supabaseAdmin
            .from('quiz_attempts')
            .update({
              result_payload: {
                profileCode,
                percentages,
              },
            })
            .eq('id', attempt_id)
            .eq('user_id', user.id)
        } catch (persistErr) {
          console.error('[rapport/download-pdf] failed to persist computed result_payload', {
            requestId,
            attempt_id,
            error: (persistErr as any)?.message || String(persistErr),
          })
        }
      }
    }

    if (!profileCode || !percentages) {
      return NextResponse.json(
        { error: 'Report data not available', request_id: requestId },
        { status: 404 }
      )
    }

    const assessmentDate = attempt.finished_at || new Date().toISOString()
    const candidateName = candidate?.full_name || 'Deelnemer'

    stage = 'render_html'
    const html = useLocalRenderer
      ? await renderProfileHtmlWithOptions(
          profileCode,
          {
            profileCode,
            assessmentDate,
            candidateName,
            percentages,
          },
          { allowScripts: true }
        )
      : await renderProfileHtml(profileCode, {
          profileCode,
          assessmentDate,
          candidateName,
          percentages,
        })

    const htmlChars = html.length
    const htmlKb = Math.round(htmlChars / 1024)

    const filename = `${sanitizeFilename(`DISC-Profiel-${candidateName}`)}.pdf`

    if (useLocalRenderer) {
      stage = 'local_pdf'
      const localTimeoutMs = parseTimeoutMs(process.env.LOCAL_PDF_RENDER_TIMEOUT_MS, 60_000)
      stageTimeoutMs = localTimeoutMs

      const pdfUint8 = await generatePdfWithPuppeteer({ html, timeoutMs: localTimeoutMs })

      stage = 'upload_pdf'
      stageTimeoutMs = null
      const storagePath = `reports/${attempt_id}/${PDF_CACHE_VERSION}/${filename}`

      try {
        const uploadRes = await supabaseAdmin.storage
          .from('quiz-docs')
          .upload(storagePath, pdfUint8, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (uploadRes.error) {
          console.error('[rapport/download-pdf] storage upload failed', {
            requestId,
            attempt_id,
            error: uploadRes.error.message,
          })
        } else {
          const nowIso = new Date().toISOString()
          const ttlDays = parseTtlDays(process.env.RAPPORT_PDF_CACHE_TTL_DAYS, 30)
          const expiresAt = addDaysIso(nowIso, ttlDays)
          try {
            await supabaseAdmin
              .from('quiz_attempts')
              .update({
                pdf_path: storagePath,
                pdf_filename: filename,
                pdf_created_at: nowIso,
                pdf_expires_at: expiresAt,
              })
              .eq('id', attempt_id)
              .eq('user_id', user.id)
          } catch (updateErr) {
            console.error('[rapport/download-pdf] failed to update attempt pdf fields', {
              requestId,
              attempt_id,
              error: (updateErr as any)?.message || String(updateErr),
            })
          }
        }
      } catch (e: any) {
        console.error('[rapport/download-pdf] storage exception', {
          requestId,
          attempt_id,
          error: e?.message || String(e),
        })
      }

      const totalMs = Date.now() - t0
      console.log('[rapport/download-pdf] success', {
        requestId,
        attempt_id,
        profileCode,
        renderer: 'local',
        total_elapsed_ms: totalMs,
        pdf_kb: Math.round(pdfUint8.byteLength / 1024),
      })

      const pdfArrayBuffer = new Uint8Array(pdfUint8).buffer

      return new Response(pdfArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'x-pdf-cache': shouldUseCache ? 'miss' : 'disabled',
          'x-request-id': requestId,
          'x-pdf-renderer': 'local',
        },
      })
    }

    const delayMs = parseDelayMs(process.env.API2PDF_RENDER_DELAY_MS, 5000)
    const api2pdfTimeoutMs = parseTimeoutMs(process.env.API2PDF_REQUEST_TIMEOUT_MS, 90_000)
    const pdfDownloadTimeoutMs = parseTimeoutMs(process.env.API2PDF_PDF_DOWNLOAD_TIMEOUT_MS, 90_000)

    const api2pdfRetryCountRaw = Number.parseInt(process.env.API2PDF_RETRY_COUNT || '', 10)
    const api2pdfRetryCount = Number.isFinite(api2pdfRetryCountRaw) && api2pdfRetryCountRaw >= 0 ? api2pdfRetryCountRaw : 1
    const api2pdfRetryDelayMs = parseTimeoutMs(process.env.API2PDF_RETRY_DELAY_MS, 2000)

    const htmlUrlModeThresholdKb = Number.parseInt(process.env.API2PDF_HTML_URL_MODE_THRESHOLD_KB || '', 10)
    const effectiveHtmlUrlModeThresholdKb =
      Number.isFinite(htmlUrlModeThresholdKb) && htmlUrlModeThresholdKb > 0 ? htmlUrlModeThresholdKb : 8000

    let htmlStoragePath: string | null = null
    const api2pdfMode: 'html' | 'url' = htmlKb >= effectiveHtmlUrlModeThresholdKb ? 'url' : 'html'
    api2pdfModeForError = api2pdfMode

    const api2pdfT0 = Date.now()
    let apiResp: Response
    try {
      if (api2pdfMode === 'url') {
        stage = 'upload_html'
        const { storagePath, signedUrl } = await uploadHtmlToStorageAndSignUrl({
          attemptId: attempt_id,
          requestId,
          html,
        })
        htmlStoragePath = storagePath

        stage = 'api2pdf_url'
        stageTimeoutMs = api2pdfTimeoutMs
        apiResp = await fetchApi2PdfWithRetry({
          requestId,
          attemptId: attempt_id,
          mode: api2pdfMode,
          maxRetries: api2pdfRetryCount,
          baseDelayMs: api2pdfRetryDelayMs,
          makeRequest: () =>
            fetchWithTimeout(
              'https://v2.api2pdf.com/chrome/pdf/url',
              {
                method: 'POST',
                headers: {
                  Authorization: api2pdfApiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: signedUrl,
                  options: {
                    paperWidth: 8.268,
                    paperHeight: 11.693,
                    marginTop: 0,
                    marginBottom: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    scale: 1,
                    printBackground: true,
                    preferCSSPageSize: false,
                    delay: delayMs,
                  },
                }),
              },
              api2pdfTimeoutMs
            ),
        })
      } else {
        stage = 'api2pdf_html'
        stageTimeoutMs = api2pdfTimeoutMs
        apiResp = await fetchApi2PdfWithRetry({
          requestId,
          attemptId: attempt_id,
          mode: api2pdfMode,
          maxRetries: api2pdfRetryCount,
          baseDelayMs: api2pdfRetryDelayMs,
          makeRequest: () =>
            fetchWithTimeout(
              'https://v2.api2pdf.com/chrome/pdf/html',
              {
                method: 'POST',
                headers: {
                  Authorization: api2pdfApiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  html,
                  options: {
                    paperWidth: 8.268,
                    paperHeight: 11.693,
                    marginTop: 0,
                    marginBottom: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    scale: 1,
                    printBackground: true,
                    preferCSSPageSize: false,
                    delay: delayMs,
                  },
                }),
              },
              api2pdfTimeoutMs
            ),
        })
      }
    } finally {
      if (htmlStoragePath) {
        try {
          await supabaseAdmin.storage.from('quiz-docs').remove([htmlStoragePath])
        } catch (e: any) {
          console.warn('[rapport/download-pdf] failed to cleanup temp html', {
            requestId,
            attempt_id,
            storagePath: htmlStoragePath,
            error: e?.message || String(e),
          })
        }
      }
    }

    const api2pdfElapsed = Date.now() - api2pdfT0

    const { json: apiJson, text: apiTextRaw } = await readResponseBodySafe(apiResp)
    const apiText = typeof apiTextRaw === 'string' ? truncateString(apiTextRaw, 4000) : null

    if (!apiResp.ok) {
      console.error('[rapport/download-pdf] api2pdf error', {
        requestId,
        attempt_id,
        mode: api2pdfMode,
        status: apiResp.status,
        elapsed_ms: api2pdfElapsed,
        html_chars: htmlChars,
        html_kb: htmlKb,
        body: apiJson,
        body_text: apiText,
      })

      const status = apiResp.status === 503 ? 503 : 500
      return NextResponse.json(
        {
          error: 'PDF_GENERATION_FAILED',
          status: apiResp.status,
          request_id: requestId,
          mode: api2pdfMode,
          html_chars: htmlChars,
          html_kb: htmlKb,
          api2pdf_body: apiJson,
          api2pdf_body_text: apiText,
          api2pdf_elapsed_ms: api2pdfElapsed,
        },
        { status, headers: { 'x-request-id': requestId, 'x-pdf-renderer': 'api2pdf' } }
      )
    }

    const fileUrl = apiJson?.FileUrl || apiJson?.fileUrl
    if (!fileUrl || typeof fileUrl !== 'string') {
      console.error('[rapport/download-pdf] api2pdf missing FileUrl', {
        requestId,
        attempt_id,
        mode: api2pdfMode,
        html_chars: htmlChars,
        html_kb: htmlKb,
        body: apiJson,
        body_text: apiText,
      })
      return NextResponse.json(
        {
          error: 'PDF_GENERATION_FAILED',
          request_id: requestId,
          mode: api2pdfMode,
          html_chars: htmlChars,
          html_kb: htmlKb,
          api2pdf_body: apiJson,
          api2pdf_body_text: apiText,
          api2pdf_elapsed_ms: api2pdfElapsed,
        },
        { status: 500, headers: { 'x-request-id': requestId, 'x-pdf-renderer': 'api2pdf' } }
      )
    }

    stage = 'download_pdf'
    stageTimeoutMs = pdfDownloadTimeoutMs
    const pdfResp = await fetchWithTimeout(fileUrl, { method: 'GET' }, pdfDownloadTimeoutMs)
    if (!pdfResp.ok) {
      console.error('[rapport/download-pdf] failed to download pdf from fileUrl', {
        requestId,
        attempt_id,
        status: pdfResp.status,
      })
      return NextResponse.json(
        { error: 'PDF_DOWNLOAD_FAILED', request_id: requestId },
        { status: 500, headers: { 'x-request-id': requestId, 'x-pdf-renderer': 'api2pdf' } }
      )
    }

    stage = 'upload_pdf'
    stageTimeoutMs = null
    const pdfBytes = await pdfResp.arrayBuffer()
    const pdfUint8 = new Uint8Array(pdfBytes)

    const storagePath = `reports/${attempt_id}/${PDF_CACHE_VERSION}/${filename}`

    try {
      const uploadRes = await supabaseAdmin.storage
        .from('quiz-docs')
        .upload(storagePath, pdfUint8, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadRes.error) {
        console.error('[rapport/download-pdf] storage upload failed', {
          requestId,
          attempt_id,
          error: uploadRes.error.message,
        })
      } else {
        const nowIso = new Date().toISOString()
        const ttlDays = parseTtlDays(process.env.RAPPORT_PDF_CACHE_TTL_DAYS, 30)
        const expiresAt = addDaysIso(nowIso, ttlDays)
        try {
          await supabaseAdmin
            .from('quiz_attempts')
            .update({
              pdf_path: storagePath,
              pdf_filename: filename,
              pdf_created_at: nowIso,
              pdf_expires_at: expiresAt,
            })
            .eq('id', attempt_id)
            .eq('user_id', user.id)
        } catch (updateErr) {
          console.error('[rapport/download-pdf] failed to update attempt pdf fields', {
            requestId,
            attempt_id,
            error: (updateErr as any)?.message || String(updateErr),
          })
        }
      }
    } catch (e: any) {
      console.error('[rapport/download-pdf] storage exception', {
        requestId,
        attempt_id,
        error: e?.message || String(e),
      })
    }

    const totalMs = Date.now() - t0
    console.log('[rapport/download-pdf] success', {
      requestId,
      attempt_id,
      profileCode,
      api2pdf_elapsed_ms: api2pdfElapsed,
      total_elapsed_ms: totalMs,
      pdf_kb: Math.round(pdfBytes.byteLength / 1024),
    })

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'x-pdf-cache': shouldUseCache ? 'miss' : 'disabled',
        'x-request-id': requestId,
        'x-pdf-renderer': 'api2pdf',
      },
    })
  } catch (e: any) {
    if (isAbortError(e)) {
      const elapsedMs = Date.now() - t0
      console.error('[rapport/download-pdf] timeout', {
        requestId,
        stage,
        mode: api2pdfModeForError,
        timeout_ms: stageTimeoutMs,
        elapsed_ms: elapsedMs,
      })
      return NextResponse.json(
        {
          error: 'Timeout while generating PDF',
          request_id: requestId,
          elapsed_ms: elapsedMs,
          stage,
          mode: api2pdfModeForError,
          timeout_ms: stageTimeoutMs,
        },
        { status: 504, headers: { 'x-request-id': requestId, 'x-pdf-renderer': api2pdfModeForError ? 'api2pdf' : 'unknown' } }
      )
    }

    console.error('[rapport/download-pdf] unhandled', {
      requestId,
      error: e?.message || String(e),
      stack: e?.stack,
    })

    const elapsedMs = Date.now() - t0
    return NextResponse.json(
      {
        error: 'Internal server error',
        request_id: requestId,
        elapsed_ms: elapsedMs,
      },
      { status: 500, headers: { 'x-request-id': requestId } }
    )
  }
}
