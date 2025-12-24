import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/server/admin/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Check admin session
    const session = await getAdminSession()
    if (!session || !session.u) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get admin from database
    const { supabaseAdmin } = await import('@/lib/supabase')
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admin_users')
      .select('totp_enabled, last_login_at')
      .eq('email', session.u.toLowerCase())
      .maybeSingle()

    if (fetchError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    return NextResponse.json({
      totp_enabled: admin.totp_enabled || false,
      last_login_at: admin.last_login_at
    })
  } catch (e) {
    console.error('[2fa-status] Error:', e)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
