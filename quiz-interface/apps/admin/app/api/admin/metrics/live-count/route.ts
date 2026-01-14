import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../server/admin/session'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(_req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const threshold = new Date(Date.now() - 60_000).toISOString()
    const QUIZ_ID = '00000000-0000-0000-0000-000000000001'

    const { count, error } = await supabaseAdmin
      .from('quiz_activity')
      .select('user_id', { count: 'exact', head: true })
      .eq('quiz_id', QUIZ_ID)
      .gte('heartbeat_at', threshold)

    if (error) return NextResponse.json({ error: 'Query failed' }, { status: 500 })

    return NextResponse.json({ live_count: count || 0 })
  } catch {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}