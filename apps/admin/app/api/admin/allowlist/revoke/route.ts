import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'
import { validateCsrf } from '@/server/admin/csrf'

const BodySchema = z.object({
  email: z.string().email(),
  quiz_id: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // CSRF validation
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
      .delete({ count: 'exact' })
      .eq('email_normalized', email)

    // If quiz_id is provided, delete only for that quiz. If omitted/null, delete all rows for this email.
    if (quizId) {
      query = query.eq('quiz_id', quizId)
    }

    const { data: deletedRows, error: delErr, count } = await query.select('id')
    if (delErr) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    const deleted = (deletedRows?.length ?? count ?? 0) as number

    await audit('allowlist_delete', { email, quiz_id: quizId, deleted })
    return NextResponse.json({ ok: true, deleted })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}

async function audit(type: string, payload: Record<string, unknown>) {
  try {
    if (!supabaseAdmin) return
    await supabaseAdmin.from('admin_events').insert({ type, actor: 'admin', payload })
  } catch {}
}
