import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/server/admin/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { id: candidateId } = await params

    // Get candidate info
    const { data: candidateData, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (candidateError || !candidateData) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Get answers
    const { data: answerData, error: answerError } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (answerError || !answerData) {
      return NextResponse.json({ error: 'Answers not found' }, { status: 404 })
    }

    return NextResponse.json({
      candidate: candidateData,
      answer: answerData,
    })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}
