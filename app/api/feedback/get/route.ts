import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  attempt_id: z.string().uuid(),
})

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
  return token || null
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const parsed = QuerySchema.safeParse({ attempt_id: searchParams.get('attempt_id') })
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const attemptId = parsed.data.attempt_id

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id')
      .eq('id', attemptId)
      .maybeSingle()

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('feedback_submissions')
      .select('*')
      .eq('attempt_id', attemptId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    return NextResponse.json({ item: data || null })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unhandled', details: e?.message || String(e) }, { status: 500 })
  }
}
