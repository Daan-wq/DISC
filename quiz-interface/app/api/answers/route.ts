import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { CANONICAL_STATEMENTS } from '@/lib/data/canonical-statements'

// NOTE: This endpoint is for FINAL submission (all 48 answers)
// For incremental answer saving during the quiz, use /api/quiz/answers/save instead

const LetterSchema = z.enum(['A', 'B', 'C', 'D'])
const RawAnswer = z.union([LetterSchema, z.number().int().min(1).max(4)])
const QuizAnswerLike = z.object({ statementId: z.number(), selection: z.enum(['most','least']).optional() })
const BodySchema = z.object({
  quiz_session_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid(),
  attempt_id: z.string().uuid().optional(),
  answers: z.array(z.union([RawAnswer, QuizAnswerLike])).length(48), // MUST be exactly 48 for finish flow
  answer_texts: z.array(z.string().min(1)).length(48).optional()
})

type Letter = 'A' | 'B' | 'C' | 'D'
const numToLetter = (v: number): Letter => (['A', 'B', 'C', 'D'][v - 1] as Letter)

export async function POST(req: NextRequest) {
  try {
    // Auth check: require valid bearer token
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    console.log('[answers] incoming payload keys:', Object.keys(json || {}), 'user:', user.id)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      console.warn('[answers] validation failed:', parsed.error.format())
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      console.error('[answers] supabaseAdmin is null. Check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL are set on the server environment.')
      return NextResponse.json(
        { error: 'Server not configured for DB access' },
        { status: 500 }
      )
    }

    const { quiz_session_id, candidate_id, attempt_id, answers, answer_texts } = parsed.data

    // Ownership check: verify candidate belongs to user
    const { data: cand } = await supabaseAdmin
      .from('candidates')
      .select('user_id')
      .eq('id', candidate_id)
      .single()

    if (!cand || cand.user_id !== user.id) {
      console.warn('[answers] ownership check failed for candidate:', candidate_id, 'user:', user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Debug sample of first few entries
    try {
      console.log('[answers] typeof answers:', typeof answers, 'isArray:', Array.isArray(answers), 'len:', answers?.length)
      console.log('[answers] samples:', answers?.slice(0, 3))
      if (attempt_id) console.log('[answers] attempt_id:', attempt_id)
    } catch {}

    // Normalize to letters A..D (accept numbers 1..4 or objects with statementId)
    const normalized: Letter[] = answers.map((a) => {
      if (typeof a === 'number') return numToLetter(a)
      if (typeof a === 'string') return a.toUpperCase() as Letter
      if (a && typeof (a as any).statementId === 'number') {
        const idx = (((a as any).statementId - 1) % 4 + 4) % 4
        return (['A','B','C','D'][idx] as Letter)
      }
      throw new Error('Invalid answer element')
    })

    // Final validation: ensure all are letters A..D and count=48
    if (normalized.length !== 48 || normalized.some(l => !['A','B','C','D'].includes(l))) {
      console.warn('[answers] normalization failed:', { length: normalized.length, sample: normalized.slice(0,5) })
      return NextResponse.json(
        { error: 'Invalid payload after normalization' },
        { status: 400 }
      )
    }

    // Sanitize incoming answer_texts by removing leading 'MOST:' / 'LEAST:' labels if present
    const sanitizedTexts: string[] | null = (answer_texts && answer_texts.length === 48)
      ? answer_texts.map(t => t.replace(/^(MOST|LEAST):\s*/i, ''))
      : null

    // Try to map incoming texts to canonical statements by their leading number.
    const numberFrom = (s: string): number | null => {
      const m = s.match(/^\s*(\d+)\)\s*/)
      return m ? parseInt(m[1], 10) : null
    }
    // Option A: canonical lines via statementId when provided in answers payload
    const statementIds: Array<number | null> = answers.map((a) => {
      if (a && typeof a === 'object' && typeof (a as any).statementId === 'number') {
        return (a as any).statementId as number
      }
      return null
    })
    const hasAnyStatementIds = statementIds.some((n) => typeof n === 'number' && isFinite(n))
    const canonicalFromIds: Array<string | null> | null = hasAnyStatementIds
      ? statementIds.map((n) => {
          if (typeof n === 'number' && n >= 1 && n <= CANONICAL_STATEMENTS.length) return CANONICAL_STATEMENTS[n - 1]
          return null
        })
      : null

    // Option B: canonical lines via number parsed from provided answer_texts
    const canonicalFromTexts: Array<string | null> | null = sanitizedTexts
      ? sanitizedTexts.map((t) => {
          const single = String(t ?? '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
          const n = numberFrom(single)
          if (n && n >= 1 && n <= CANONICAL_STATEMENTS.length) return CANONICAL_STATEMENTS[n - 1]
          return null
        })
      : null

    // Build export text content as simple newline-separated lines (no spacer lines).
    // Prefer canonical lines when available; otherwise number the provided text.
    const toLine = (t: string | Letter, i: number) => {
      const raw = String(t ?? '')
      const single = raw.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
      const alreadyNumbered = /^\s*\d+\)\s/.test(single)
      return alreadyNumbered ? single : `${i + 1}) ${single}`
    }
    // Decide final lines: prefer statementId-based mapping, otherwise text-number mapping, otherwise fallback to-numbered input
    const buildFallback = (): string[] => (sanitizedTexts ?? normalized).map(toLine)
    let linesForExport: string[]
    if (canonicalFromIds && canonicalFromIds.some(l => l)) {
      // Fill missing slots from text or fallback
      const byText = canonicalFromTexts || []
      const fb = buildFallback()
      linesForExport = canonicalFromIds.map((l, i) => l ?? (byText[i] ?? fb[i])) as string[]
    } else if (canonicalFromTexts && canonicalFromTexts.some(l => l)) {
      const fb = buildFallback()
      linesForExport = canonicalFromTexts.map((l, i) => l ?? fb[i]) as string[]
    } else {
      linesForExport = buildFallback()
    }
    const answers_export_txt = linesForExport.join('\n') + '\n'

    // Debug: log a short escaped preview for quick inspection
    try {
      const esc = JSON.stringify(answers_export_txt.slice(0, 200))
      console.log('[answers] export preview (first 200, escaped):', esc)
    } catch {}

    // Prefer storing FULL sanitized answer texts in raw_answers; fallback to letters when texts are not provided
    const rawAnswersForStorage: (string | Letter)[] = linesForExport

    // Insert data into database
    const insertData: Record<string, any> = {
      raw_answers: rawAnswersForStorage,
      candidate_id,
      answers_export_txt,
      payload: {
        raw_answers: rawAnswersForStorage,
        answer_texts: sanitizedTexts || [],
        timestamp: new Date().toISOString()
      }
    }
    if (quiz_session_id) insertData.quiz_session_id = quiz_session_id
    if (attempt_id) insertData.attempt_id = attempt_id

    // First try insert
    console.log('[answers] inserting row into public.answers (raw_answers length):', rawAnswersForStorage.length, 'candidate_id:', candidate_id)
    let { data, error } = await supabaseAdmin
      .from('answers')
      .insert(insertData)
      .select('id')
      .single()

    // If unique violation on quiz_session_id, fallback to update (ignore if column doesn't exist)
    if (error && (error as any).code === '23505' && quiz_session_id) {
      const upd = await supabaseAdmin
        .from('answers')
        .update({
          raw_answers: rawAnswersForStorage,
          answers_export_txt,
          candidate_id,
        })
        .eq('quiz_session_id', quiz_session_id)
        .select('id')
        .single()

      data = upd.data
      error = upd.error as any
    }

    if (error) {
      console.error('[answers] DB operation failed:', error)
      // If RLS/RBAC blocks access, surface 401/403 appropriately if possible
      const status = (error as any).code === 'PGRST301'
        ? 401
        : (error as any).code === 'PGRST302'
          ? 403
          : 500
      return NextResponse.json(
        { error: 'DB insert failed', details: (error as any).message || String(error) },
        { status }
      )
    }

    console.log('[answers] inserted:', { id: data!.id })
    return NextResponse.json({
      id: data!.id,
      quiz_session_id: quiz_session_id ?? null,
      count: normalized.length
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Unhandled', details: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}
