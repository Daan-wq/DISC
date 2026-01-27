import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Lean schema: accept attempt_id and sign the attempt's pdf_path
const BodySchema = z.object({
  attempt_id: z.string().uuid()
})

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured (no service role)' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const { attempt_id } = parsed.data

    // Fetch attempt and enforce ownership
    const { data: attempt, error } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id, pdf_path, pdf_filename')
      .eq('id', attempt_id)
      .maybeSingle()

    if (error || !attempt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!attempt.pdf_path) {
      return NextResponse.json({ error: 'No PDF available' }, { status: 404 })
    }

    // Create short-lived signed URL
    const signed = await supabaseAdmin.storage.from('quiz-docs').createSignedUrl(attempt.pdf_path, 60 * 60)
    if (signed.error) {
      return NextResponse.json({ error: 'Sign failed', details: signed.error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      signed_url: signed.data?.signedUrl,
      pdf_filename: attempt.pdf_filename || 'DISC-Rapport.pdf'
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unhandled', details: e?.message || String(e) }, { status: 500 })
  }
}
