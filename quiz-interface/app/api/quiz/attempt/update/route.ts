import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

const BodySchema = z.object({
  attemptId: z.string().uuid(),
  currentQuestion: z.number().int().min(1).max(96),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    console.log('[attempt/update] START')

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

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

    const body = await req.json()
    const parsed = BodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { attemptId, currentQuestion } = parsed.data

    console.log('[attempt/update] user:', user.id, 'attempt:', attemptId, 'question:', currentQuestion)

    // Update current question (use service role to bypass RLS)
    const { error } = await supabaseAdmin
      .from('quiz_attempts')
      .update({ current_question: currentQuestion })
      .eq('id', attemptId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[attempt/update] error:', error)
      return NextResponse.json({ error: 'Failed to update attempt' }, { status: 500 })
    }

    console.log('[attempt/update] success')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[attempt/update] exception:', e?.message)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}
