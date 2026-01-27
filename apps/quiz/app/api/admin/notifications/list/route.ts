import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
    const since = searchParams.get('since')

    let query = supabaseAdmin.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit)
    if (since) {
      query = query.gte('created_at', since)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    return NextResponse.json({ items: data || [] })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}
