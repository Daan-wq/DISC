import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Hardcoded quiz ID (single quiz, never changes)
const QUIZ_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: { code: 'SERVER_NOT_CONFIGURED', message: 'Service role missing' } }, { status: 500 })
    }

    // Auth: require Bearer token
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null
    if (!token) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })

    const raw = await req.json().catch(() => ({}))
    const json = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? (raw as Record<string, unknown>) : {}
    console.log('[candidates/create] Received body:', JSON.stringify(json))

    const fullName = typeof json.fullName === 'string' ? (json.fullName as string) : undefined
    const email = typeof json.email === 'string' ? (json.email as string) : undefined

    // Try insert (unique on user_id, quiz_id). If conflict, select existing.
    const preferredName = fullName && fullName.trim().length > 0
      ? fullName.trim()
      : (user.email?.split('@')[0] || 'Deelnemer')

    try {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('candidates')
        .insert({ user_id: user.id, quiz_id: QUIZ_ID, email: (email || user.email || ''), full_name: preferredName })
        .select('id')
        .single()

      if (insErr) {
        // If unique violation, fetch existing row
        if ((insErr as any).code === '23505') {
          const { data: existing, error: selErr } = await supabaseAdmin
            .from('candidates')
            .select('id')
            .eq('user_id', user.id)
            .eq('quiz_id', QUIZ_ID)
            .maybeSingle()
          if (selErr || !existing) {
            return NextResponse.json({ error: { code: 'SELECT_FAILED', message: selErr?.message || 'Existing candidate not found after conflict' } }, { status: 500 })
          }
          return NextResponse.json({ candidateId: existing.id })
        }
        return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insErr.message } }, { status: 500 })
      }

      if (!inserted) {
        return NextResponse.json({ error: { code: 'NO_RESULT', message: 'Insert returned no row' } }, { status: 500 })
      }

      return NextResponse.json({ candidateId: inserted.id })
    } catch (e: any) {
      return NextResponse.json({ error: { code: 'UNHANDLED', message: e?.message || String(e) } }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'UNHANDLED', message: e?.message || String(e) } }, { status: 500 })
  }
}
