import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { getAdminSession } from '../../../../server/admin/session'
import { validateCsrf } from '../../../../server/admin/csrf'

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfError = validateCsrf(req)
    if (csrfError) {
      console.warn('[candidates/delete] CSRF validation failed:', csrfError)
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const candidateId = searchParams.get('id')

    if (!candidateId) {
      return NextResponse.json({ error: 'Missing candidate ID' }, { status: 400 })
    }

    const { data: candidate, error: candidateGetErr } = await supabaseAdmin
      .from('candidates')
      .select('id, user_id, quiz_id')
      .eq('id', candidateId)
      .single()

    if (candidateGetErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    try {
      const { error: resultsErr } = await supabaseAdmin.from('results').delete().eq('candidate_id', candidateId)

      if (resultsErr && (resultsErr as any)?.code !== '42P01') {
        console.error('Failed to delete results:', resultsErr)
        return NextResponse.json({ error: 'Failed to delete results' }, { status: 500 })
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (!msg.toLowerCase().includes('does not exist')) {
        console.error('Failed to delete results (exception):', e)
        return NextResponse.json({ error: 'Failed to delete results' }, { status: 500 })
      }
    }

    const attemptIds: string[] = []
    if (candidate.user_id) {
      let q = supabaseAdmin.from('quiz_attempts').select('id').eq('user_id', candidate.user_id)
      if (candidate.quiz_id) {
        q = q.eq('quiz_id', candidate.quiz_id)
      }

      const { data: attempts, error: attemptsSelectErr } = await q
      if (attemptsSelectErr) {
        console.error('Failed to fetch quiz_attempts for deletion:', attemptsSelectErr)
        return NextResponse.json({ error: 'Failed to fetch quiz attempts' }, { status: 500 })
      }

      for (const row of attempts || []) {
        if ((row as any)?.id) attemptIds.push((row as any).id)
      }
    }

    const { error: answersByCandidateErr } = await supabaseAdmin.from('answers').delete().eq('candidate_id', candidateId)

    if (answersByCandidateErr) {
      console.error('Failed to delete answers by candidate_id:', answersByCandidateErr)
      return NextResponse.json({ error: 'Failed to delete answers' }, { status: 500 })
    }

    if (attemptIds.length > 0) {
      const { error: answersByAttemptErr } = await supabaseAdmin.from('answers').delete().in('attempt_id', attemptIds)

      if (answersByAttemptErr) {
        console.error('Failed to delete answers by attempt_id:', answersByAttemptErr)
        return NextResponse.json({ error: 'Failed to delete answers' }, { status: 500 })
      }
    }

    if (candidate.user_id) {
      let q = supabaseAdmin.from('quiz_attempts').delete().eq('user_id', candidate.user_id)
      if (candidate.quiz_id) {
        q = q.eq('quiz_id', candidate.quiz_id)
      }

      const { error: attemptsErr } = await q
      if (attemptsErr) {
        console.error('Failed to delete quiz_attempts:', attemptsErr)
        return NextResponse.json({ error: 'Failed to delete quiz attempts' }, { status: 500 })
      }
    }

    const { data: deletedCandidate, error: candidateErr } = await supabaseAdmin
      .from('candidates')
      .delete()
      .eq('id', candidateId)
      .select('id')

    if (candidateErr) {
      console.error('Failed to delete candidate:', candidateErr)
      return NextResponse.json({ error: 'Failed to delete candidate' }, { status: 500 })
    }

    if (!deletedCandidate || (Array.isArray(deletedCandidate) && deletedCandidate.length === 0)) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    await logEvent('candidate_deleted', session.u, { candidate_id: candidateId, user_id: candidate.user_id })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}

async function logEvent(type: string, actor: string, payload: Record<string, unknown>) {
  try {
    if (!supabaseAdmin) return
    await supabaseAdmin.from('admin_events').insert({ type, actor, payload })
  } catch (e) {
    console.error('Failed to log event:', e)
  }
}