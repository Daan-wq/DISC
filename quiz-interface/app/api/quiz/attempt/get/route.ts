import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    console.log('[attempt/get] START')

    if (!supabaseAdmin) {
      console.error('[attempt/get] supabaseAdmin is null - SUPABASE_SERVICE_ROLE_KEY not set')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null

    if (!token) {
      console.error('[attempt/get] No auth token provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[attempt/get] Verifying token...')
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token)

    if (userErr) {
      console.error('[attempt/get] error verifying token:', userErr)
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
    }

    const user = userRes?.user

    if (!user) {
      console.error('[attempt/get] No user found from token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[attempt/get] user:', user.id)

    // Get attempt with current progress (use service role to bypass RLS)
    console.log('[attempt/get] Fetching attempt for user:', user.id)
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, quiz_id, current_question, started_at, finished_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (attemptErr) {
      console.error('[attempt/get] error fetching attempt:', attemptErr)
      return NextResponse.json({ error: 'Failed to fetch attempt', details: attemptErr }, { status: 500 })
    }

    if (!attempt) {
      console.log('[attempt/get] no attempt found for user:', user.id)
      return NextResponse.json({ attempt: null })
    }

    console.log('[attempt/get] found attempt:', attempt.id, 'at question:', attempt.current_question)

    // Get user's answers for this attempt (now linked via attempt_id)
    const { data: answersData, error: answersErr } = await supabaseAdmin
      .from('answers')
      .select('payload')
      .eq('attempt_id', attempt.id)
      .maybeSingle()

    if (answersErr) {
      console.error('[attempt/get] error fetching answers:', answersErr)
      // Don't fail - just return without answers
    }

    // Extract answers from payload JSONB object
    let rawAnswers: string[] = []
    if (answersData?.payload && answersData.payload.answers) {
      rawAnswers = answersData.payload.answers
      console.log('[attempt/get] found', rawAnswers.length, 'answers from payload')
    } else {
      console.log('[attempt/get] found 0 answers')
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        current_question: attempt.current_question || 1,
        started_at: attempt.started_at,
        finished_at: attempt.finished_at
      },
      answers: rawAnswers || []
    })
  } catch (e: any) {
    console.error('[attempt/get] exception:', e?.message, e?.stack)
    return NextResponse.json({ error: 'Unhandled error', message: e?.message }, { status: 500 })
  }
}
