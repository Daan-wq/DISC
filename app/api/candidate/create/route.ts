import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  email: z.string().email(),
  fullName: z.string().optional()
})

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const email = parsed.data.email.trim().toLowerCase()
    const fullName = parsed.data.fullName || email.split('@')[0]

    console.log('[candidate/create] Request:', { email, fullName })

    // Get authenticated user from Authorization header
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null

    if (!token) {
      console.log('[candidate/create] No token provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    console.log('[candidate/create] Auth check:', { userId: user?.id, error: userErr?.message })
    if (!user || userErr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if candidate already exists for this user
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .maybeSingle()

    console.log('[candidate/create] Existing check:', { existing: existing?.id, error: existErr?.message })

    if (existing) {
      // Candidate already exists
      console.log('[candidate/create] Returning existing candidate:', existing.id)
      return NextResponse.json({ candidateId: existing.id })
    }

    // Create new candidate
    const QUIZ_ID = '00000000-0000-0000-0000-000000000001'
    console.log('[candidate/create] Creating new candidate:', { user_id: user.id, email, fullName })
    const { data: newCandidate, error: insertErr } = await supabaseAdmin
      .from('candidates')
      .insert({
        user_id: user.id,
        quiz_id: QUIZ_ID,
        email: email,
        full_name: fullName
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[candidate/create] Failed to create candidate:', insertErr)
      return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
    }

    console.log('[candidate/create] Candidate created successfully:', newCandidate.id)
    return NextResponse.json({ candidateId: newCandidate.id })
  } catch (e: any) {
    console.error('candidate/create error:', e?.message || String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
