import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/server/admin/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 500)
    const since = searchParams.get('since')

    let query = supabaseAdmin
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gte('created_at', since)
    }

    const { data: items, error } = await query
    if (error) {
      console.error('[admin/feedback/list] DB error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const userIds = (items || []).map((i: any) => i.user_id).filter(Boolean)

    let candidateMap = new Map<string, { email: string | null; full_name: string | null }>()
    if (userIds.length > 0) {
      const { data: candidates, error: candErr } = await supabaseAdmin
        .from('candidates')
        .select('user_id, email, full_name')
        .in('user_id', userIds)

      if (candErr) {
        console.warn('[admin/feedback/list] Failed to fetch candidates:', candErr)
      } else {
        ;(candidates || []).forEach((c: any) => {
          candidateMap.set(c.user_id, { email: c.email ?? null, full_name: c.full_name ?? null })
        })
      }
    }

    const enriched = (items || []).map((i: any) => {
      const candidate = candidateMap.get(i.user_id)
      return {
        ...i,
        candidate_email: candidate?.email || null,
        candidate_name: candidate?.full_name || null,
      }
    })

    return NextResponse.json({ items: enriched })
  } catch (e: any) {
    console.error('[admin/feedback/list] Unhandled:', e?.message || String(e))
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}
