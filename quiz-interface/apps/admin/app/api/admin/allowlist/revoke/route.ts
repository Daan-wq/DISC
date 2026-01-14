import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '../../../../server/admin/session'
import { supabaseAdmin } from '../../../../lib/supabase'
import { validateCsrf } from '../../../../server/admin/csrf'

const BodySchema = z.object({
  email: z.string().email(),
  quiz_id: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const csrfError = validateCsrf(req)
    if (csrfError) {
      console.warn('[allowlist/revoke] CSRF validation failed:', csrfError)
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const email = parsed.data.email.trim().toLowerCase()
    const quizId = parsed.data.quiz_id ?? null

    let query = supabaseAdmin
      .from('allowlist')
      .update({ status: 'revoked' }, { count: 'exact' })
      .eq('email_normalized', email)
      .in('status', ['pending', 'claimed', 'used'])

    if (quizId) {
      query = query.eq('quiz_id', quizId)
    }

    const { data: updatedRows, error: upErr, count } = await query.select('id')
    if (upErr) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    const updated = (updatedRows?.length ?? count ?? 0) as number

    await audit('allowlist_revoke', { email, quiz_id: quizId, updated })
    return NextResponse.json({ ok: true, updated })
  } catch {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}

async function audit(type: string, payload: Record<string, unknown>) {
  try {
    if (!supabaseAdmin) return
    await supabaseAdmin.from('admin_events').insert({ type, actor: 'admin', payload })
  } catch {}
}