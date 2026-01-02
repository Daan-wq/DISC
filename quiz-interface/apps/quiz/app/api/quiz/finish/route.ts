import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { QUIZ_ID } from '@/lib/constants'
import { randomUUID } from 'crypto'

// Ensure Node.js runtime
export const runtime = 'nodejs'
// Avoid ISR caching for API side-effects
export const dynamic = 'force-dynamic'
// PDF generation is now much faster without Chromium (typically <5 seconds)
export const maxDuration = 30

// Timing helper
interface Timings {
  t_start: number
  t_total?: number
}

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  result_id: z.string().uuid().optional(),
  // Optional: provide placeholders and chart data directly
  placeholderData: z.object({
    candidate: z.object({ full_name: z.string().min(1) }),
    results: z.object({
      created_at: z.string(),
      profile_code: z.string().min(1),
      natural_d: z.number(),
      natural_i: z.number(),
      natural_s: z.number(),
      natural_c: z.number(),
      response_d: z.number(),
      response_i: z.number(),
      response_s: z.number(),
      response_c: z.number(),
    }),
    meta: z.object({ dateISO: z.string().optional(), stijlLabel: z.string().optional() }).optional()
  }).optional(),
})

export async function POST(req: NextRequest) {
  const timings: Timings = { t_start: Date.now() }
  const requestId = req.headers.get('x-request-id') || randomUUID().slice(0, 8)
  
  let attempt_id: string | undefined
  
  try {
    console.log(`=== /api/quiz/finish START [${requestId}] ===${process.env.VERCEL_REGION ? ` region=${process.env.VERCEL_REGION}` : ''}`)
    
    if (!supabaseAdmin) {
      console.error('[finish] supabaseAdmin is null')
      return NextResponse.json({ error: 'Server not configured (no service role)' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null
    console.log('[finish] token present:', !!token)
    
    if (!token) {
      console.error('[finish] No authorization token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    console.log('[finish] authenticated user:', user?.id)
    
    if (!user) {
      console.error('[finish] User not found from token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    console.log('[finish] request body keys:', Object.keys(json))
    
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      console.error('[finish] validation failed:', parsed.error.format())
      // Don't expose validation details in production (information disclosure risk)
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })
      }
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { attempt_id, placeholderData: providedPD, result_id: _result_id } = parsed.data
    const quiz_id = QUIZ_ID
    console.log('[finish] attempt_id:', attempt_id, 'quiz_id:', quiz_id)

    // Verify ownership of attempt and get current state
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id, quiz_id, finished_at')
      .eq('id', attempt_id)
      .maybeSingle()
    
    console.log('[finish] attempt lookup - error:', attemptErr?.message, 'found:', !!attempt)
    
    if (attemptErr || !attempt) {
      console.error('[finish] Attempt not found:', { attemptErr: attemptErr?.message, attempt_id })
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    if (attempt.user_id !== user.id || attempt.quiz_id !== quiz_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const nowIso = new Date().toISOString()
    const finalPD = providedPD || null

    const profileCode = (finalPD?.results?.profile_code as string | undefined) || null
    const percentages = finalPD?.results
      ? {
          natural: {
            D: Math.round(finalPD.results.natural_d || 0),
            I: Math.round(finalPD.results.natural_i || 0),
            S: Math.round(finalPD.results.natural_s || 0),
            C: Math.round(finalPD.results.natural_c || 0),
          },
          response: {
            D: Math.round(finalPD.results.response_d || 0),
            I: Math.round(finalPD.results.response_i || 0),
            S: Math.round(finalPD.results.response_s || 0),
            C: Math.round(finalPD.results.response_c || 0),
          },
        }
      : null

    const nextUpdate: Record<string, unknown> = {
      finished_at: nowIso,
    }

    if (profileCode && percentages) {
      nextUpdate.result_payload = {
        profileCode,
        percentages,
      }
    }

    const { error: finishErr } = await supabaseAdmin
      .from('quiz_attempts')
      .update(nextUpdate)
      .eq('id', attempt_id)
      .eq('user_id', user.id)

    if (finishErr) {
      console.error(`[finish][${requestId}] Failed to mark attempt finished:`, finishErr)
      return NextResponse.json({ error: 'FINISH_FAILED', details: (finishErr as any)?.message }, { status: 500 })
    }

    const emailNormalized = (user.email || '').toLowerCase().trim()
    if (emailNormalized) {
      try {
        await supabaseAdmin
          .from('allowlist')
          .update({ status: 'used' })
          .eq('email_normalized', emailNormalized)
          .in('status', ['pending', 'claimed'])
      } catch (allowErr) {
        console.error(`[finish][${requestId}] Failed to mark allowlist used:`, allowErr)
      }
    }

    timings.t_total = Date.now() - timings.t_start
    console.log(`=== /api/quiz/finish END (SUCCESS) [${requestId}] ===`)
    return NextResponse.json({ ok: true, finished_at: nowIso, timings })
  } catch (e: any) {
    const elapsed = Date.now() - timings.t_start
    console.error(`[finish][${requestId}] EXCEPTION after ${elapsed}ms:`, e?.message || String(e))
    console.error(`[finish][${requestId}] Stack:`, e?.stack)

    console.log(`=== /api/quiz/finish END (ERROR) [${requestId}] after ${elapsed}ms ===`)
    return NextResponse.json({ error: 'UNHANDLED_ERROR', details: e?.message || String(e), elapsed_ms: elapsed }, { status: 500 })
  }
}
