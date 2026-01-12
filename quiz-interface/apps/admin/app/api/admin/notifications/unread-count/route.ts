import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../server/admin/session'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    return NextResponse.json({ count: count || 0 })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}
