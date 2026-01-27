import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  q1_personal: z.number().int().min(0).max(10),
  q2_instructions: z.number().int().min(0).max(10),
  q3_pleasant: z.number().int().min(0).max(10),
  q4_recognizable: z.number().int().min(0).max(10),
  q5_need_more_explanation: z.number().int().min(0).max(10),
  q6_notes: z.string().max(5000).optional().nullable(),
})

type Body = z.infer<typeof BodySchema>

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const body: Body = parsed.data

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id')
      .eq('id', body.attempt_id)
      .maybeSingle()

    if (attemptErr || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const emailNormalized = (user.email || '').toLowerCase().trim()
    if (!emailNormalized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: allow } = await supabaseAdmin
      .from('allowlist')
      .select('testgroup')
      .eq('email_normalized', emailNormalized)
      .maybeSingle()

    if (allow?.testgroup !== true) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error: insErr } = await supabaseAdmin.from('feedback_submissions').insert({
      attempt_id: body.attempt_id,
      user_id: user.id,
      email: user.email || null,
      q1_personal: body.q1_personal,
      q2_instructions: body.q2_instructions,
      q3_pleasant: body.q3_pleasant,
      q4_recognizable: body.q4_recognizable,
      q5_need_more_explanation: body.q5_need_more_explanation,
      q6_notes: body.q6_notes ?? null,
    })

    if (insErr) {
      const code = (insErr as any)?.code
      if (code === '23505') {
        return NextResponse.json({ ok: true, already_submitted: true })
      }
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unhandled', details: e?.message || String(e) }, { status: 500 })
  }
}
