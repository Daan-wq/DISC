import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../server/admin/session'
import { supabaseAdmin } from '../../../../lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session || !session.u) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', session.u.toLowerCase())
      .maybeSingle()

    if (fetchError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('admin_users')
      .update({
        totp_secret: null,
        totp_enabled: false,
      })
      .eq('id', admin.id)

    if (updateError) {
      console.error('[2fa-disable] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: '2FA disabled successfully' })
  } catch (e) {
    console.error('[2fa-disable] Error:', e)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}