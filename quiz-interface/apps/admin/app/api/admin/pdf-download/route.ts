import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '../../../server/admin/session'
import { supabaseAdmin } from '../../../lib/supabase'

const QuerySchema = z.object({
  attempt_id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const attempt_id = searchParams.get('attempt_id')

    const parsed = QuerySchema.safeParse({ attempt_id })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, pdf_path, pdf_filename, pdf_expires_at')
      .eq('id', attempt_id)
      .maybeSingle()

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (!attempt.pdf_path) {
      return NextResponse.json({ error: 'No PDF available' }, { status: 400 })
    }

    if (attempt.pdf_expires_at && new Date(attempt.pdf_expires_at) < new Date()) {
      return NextResponse.json({ error: 'PDF has expired' }, { status: 410 })
    }

    const { data, error } = await supabaseAdmin.storage.from('quiz-docs').createSignedUrl(attempt.pdf_path, 3600)

    if (error || !data) {
      console.error('Failed to generate signed URL:', error)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    return NextResponse.json({
      url: data.signedUrl,
      filename: attempt.pdf_filename || 'DISC-rapport.pdf',
      expiresAt: attempt.pdf_expires_at,
    })
  } catch (e) {
    console.error('PDF download error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}