import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/server/admin/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Fetch quiz attempts
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('quiz_attempts')
      .select(`
        id,
        user_id,
        quiz_id,
        started_at,
        finished_at,
        score,
        result_payload,
        pdf_path,
        pdf_created_at,
        pdf_filename,
        pdf_expires_at,
        alert
      `)
      .order('started_at', { ascending: false })

    if (attemptsError) {
      return NextResponse.json({ error: 'Failed to fetch attempts', details: attemptsError }, { status: 500 })
    }

    // Get all user_ids from attempts
    const userIds = (attempts || []).map((a: any) => a.user_id).filter(Boolean)
    console.log('[debug] userIds:', userIds)

    // Fetch candidates for these user_ids
    const { data: candidates, error: candidatesError } = await supabaseAdmin
      .from('candidates')
      .select('id, user_id, email, full_name')
      .in('user_id', userIds)

    if (candidatesError) {
      return NextResponse.json({ error: 'Failed to fetch candidates', details: candidatesError }, { status: 500 })
    }

    console.log('[debug] candidates:', candidates?.length)

    // Create a map of user_id -> candidate
    const candidateMap = new Map()
    ;(candidates || []).forEach((c: any) => {
      candidateMap.set(c.user_id, c)
    })

    // Fetch answers for all candidates
    const candidateIds = Array.from(candidateMap.values()).map((c: any) => c.id).filter(Boolean)
    console.log('[debug] candidateIds:', candidateIds)

    let answersData: any[] = []
    let answersError: any = null

    if (candidateIds.length > 0) {
      const result = await supabaseAdmin
        .from('answers')
        .select('id, candidate_id, raw_answers, answers_export_txt')
        .in('candidate_id', candidateIds)
      answersData = result.data || []
      answersError = result.error
      console.log('[debug] answersData:', answersData?.length)
    }

    if (answersError) {
      console.error('[debug] answersError:', answersError)
    }

    // Create a map of candidate_id -> answers
    const answersMap = new Map()
    ;(answersData || []).forEach((a: any) => {
      answersMap.set(a.candidate_id, a)
    })

    console.log('[debug] answersMap size:', answersMap.size)

    // Merge data
    const result = (attempts || []).map((attempt: any) => {
      const candidate = candidateMap.get(attempt.user_id)
      const answers = answersMap.get(candidate?.id)
      console.log('[debug] attempt:', attempt.id, 'candidate:', candidate?.id, 'answers:', answers ? 'yes' : 'no')
      return {
        ...attempt,
        candidate_email: candidate?.email || 'Unknown',
        candidate_name: candidate?.full_name || null,
        answers: answers || null,
      }
    })

    return NextResponse.json({
      attempts: result,
      debug: {
        attemptCount: attempts?.length,
        candidateCount: candidates?.length,
        answersCount: answersData?.length,
        candidateMapSize: candidateMap.size,
        answersMapSize: answersMap.size
      }
    })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error', details: e.message }, { status: 500 })
  }
}
