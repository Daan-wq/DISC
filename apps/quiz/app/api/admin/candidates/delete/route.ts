import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/server/admin/session'
import { validateCsrf } from '@/server/admin/csrf'

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // CSRF validation for state-changing request
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

    // Get candidate to find user_id
    const { data: candidate, error: candidateGetErr } = await supabaseAdmin
      .from('candidates')
      .select('id, user_id')
      .eq('id', candidateId)
      .single()

    if (candidateGetErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Delete in order of dependencies:
    // 1. Delete answers (depends on candidate_id)
    const { error: answersErr } = await supabaseAdmin
      .from('answers')
      .delete()
      .eq('candidate_id', candidateId)

    if (answersErr) {
      console.error('Failed to delete answers:', answersErr)
      return NextResponse.json({ error: 'Failed to delete answers' }, { status: 500 })
    }

    // 2. Delete quiz_attempts (depends on user_id)
    if (candidate.user_id) {
      const { error: attemptsErr } = await supabaseAdmin
        .from('quiz_attempts')
        .delete()
        .eq('user_id', candidate.user_id)

      if (attemptsErr) {
        console.error('Failed to delete quiz_attempts:', attemptsErr)
        return NextResponse.json({ error: 'Failed to delete quiz attempts' }, { status: 500 })
      }
    }

    // 3. Delete candidate
    const { error: candidateErr } = await supabaseAdmin
      .from('candidates')
      .delete()
      .eq('id', candidateId)

    if (candidateErr) {
      console.error('Failed to delete candidate:', candidateErr)
      return NextResponse.json({ error: 'Failed to delete candidate' }, { status: 500 })
    }

    // Log the deletion
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
