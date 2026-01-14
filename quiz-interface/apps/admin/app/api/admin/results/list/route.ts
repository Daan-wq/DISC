import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { getAdminSession } from '../../../../server/admin/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

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
      console.error('Failed to fetch attempts:', attemptsError)
      return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 })
    }

    const userIds = (attempts || []).map((a: any) => a.user_id).filter(Boolean)

    const { data: candidates, error: candidatesError } = await supabaseAdmin
      .from('candidates')
      .select('id, user_id, email, full_name')
      .in('user_id', userIds)

    if (candidatesError) {
      console.error('Failed to fetch candidates:', candidatesError)
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
    }

    const candidateMap = new Map()
    ;(candidates || []).forEach((c: any) => {
      candidateMap.set(c.user_id, c)
    })

    const candidateIds = Array.from(candidateMap.values()).map((c: any) => c.id).filter(Boolean)

    let answersData: any[] = []
    let answersError: any = null

    if (candidateIds.length > 0) {
      const result = await supabaseAdmin
        .from('answers')
        .select('id, candidate_id, raw_answers, answers_export_txt')
        .in('candidate_id', candidateIds)
      answersData = result.data || []
      answersError = result.error
    } else {
      console.warn('[results/list] No candidate IDs found - answers will be empty')
    }

    if (answersError) {
      console.error('Failed to fetch answers:', answersError)
    }

    const answersMap = new Map()
    ;(answersData || []).forEach((a: any) => {
      answersMap.set(a.candidate_id, a)
    })

    const result = (attempts || []).map((attempt: any) => {
      const candidate = candidateMap.get(attempt.user_id)
      return {
        ...attempt,
        candidate_email: candidate?.email || 'Unknown',
        candidate_name: candidate?.full_name || null,
        answers: answersMap.get(candidate?.id) || null,
      }
    })

    return NextResponse.json({ attempts: result })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}