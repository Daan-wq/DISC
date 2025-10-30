import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    const { data: userRes } = await supabaseAdmin.auth.getUser(token)
    const user = userRes?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { attemptId, currentQuestion } = body

    if (!attemptId || currentQuestion === undefined) {
      return NextResponse.json({ error: 'Missing attemptId or currentQuestion' }, { status: 400 })
    }

    if (typeof currentQuestion !== 'number' || currentQuestion < 1 || currentQuestion > 86) {
      return NextResponse.json({ error: 'Invalid currentQuestion (must be 1-86)' }, { status: 400 })
    }

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
