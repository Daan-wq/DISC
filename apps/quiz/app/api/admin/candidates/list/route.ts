import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/server/admin/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch candidates:', error)
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
    }

    return NextResponse.json({ candidates: data || [] })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}
