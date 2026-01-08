import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  responses: z.record(z.string(), z.any()),
})

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
  return token || null
}

function getResponseValue(responses: Record<string, any>, key: string): any {
  const raw = (responses as any)?.[key]
  if (!raw) return null
  if (typeof raw === 'object' && 'value' in raw) return (raw as any).value
  return raw
}

function getRating(responses: Record<string, any>, key: string): number | null {
  const v = getResponseValue(responses, key)
  if (typeof v !== 'number') return null
  if (!Number.isFinite(v)) return null
  const n = Math.trunc(v)
  if (n < 1 || n > 10) return null
  return n
}

function getText(responses: Record<string, any>, key: string): string | null {
  const v = getResponseValue(responses, key)
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const attemptId = parsed.data.attempt_id
    const responses = parsed.data.responses || {}

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id')
      .eq('id', attemptId)
      .maybeSingle()

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = {
      attempt_id: attemptId,
      user_id: user.id,
      responses,

      rating_user_friendly: getRating(responses, 'user_friendly'),
      rating_easy: getRating(responses, 'easy'),
      rating_options_clear: getRating(responses, 'options_clear'),
      rating_instructions_clear: getRating(responses, 'instructions_clear'),
      rating_recognizable: getRating(responses, 'recognizable'),
      delivery_preference: getText(responses, 'delivery_preference'),

      rating_honest_representation: getRating(responses, 'honest_representation'),
      rating_trust_result: getRating(responses, 'trust_result'),
      rating_profile_recognizable: getRating(responses, 'profile_recognizable'),
      rating_profile_explanation_clear: getRating(responses, 'profile_explanation_clear'),
      rating_presentation_structure_clear: getRating(responses, 'presentation_structure_clear'),
      rating_post_receipt_clarity: getRating(responses, 'post_receipt_clarity'),
      rating_recommend_to_others: getRating(responses, 'recommend_to_others'),

      length_preference: getText(responses, 'length_preference'),
    }

    const { data: saved, error } = await supabaseAdmin
      .from('feedback_submissions')
      .upsert(payload, { onConflict: 'attempt_id' })
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[feedback/submit] DB error:', error)
      return NextResponse.json({ error: 'DB error', details: error.message }, { status: 500 })
    }

    try {
      await supabaseAdmin.from('notifications').insert({
        severity: 'info',
        source: 'feedback',
        message: 'Nieuwe feedback ontvangen',
        meta: { attempt_id: attemptId, user_id: user.id, feedback_id: saved?.id || null },
      })
    } catch {
    }

    return NextResponse.json({ ok: true, id: saved?.id || null })
  } catch (e: any) {
    console.error('[feedback/submit] Unhandled:', e?.message || String(e))
    return NextResponse.json({ error: 'Unhandled', details: e?.message || String(e) }, { status: 500 })
  }
}
