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

    // Get active users (heartbeat within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Get quiz_activity with user info via quiz_attempts
    const { data: activityData, error: activityError } = await supabaseAdmin
      .from('quiz_activity')
      .select('user_id, quiz_id, heartbeat_at')
      .gte('heartbeat_at', fiveMinutesAgo)
      .order('heartbeat_at', { ascending: false })

    if (activityError) {
      console.error('Failed to fetch activity:', activityError)
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }

    // Get candidate info for each active user
    const activities = await Promise.all(
      (activityData || []).map(async (activity: any) => {
        const { data: candidateData } = await supabaseAdmin!
          .from('quiz_attempts')
          .select('candidates!inner(email, full_name)')
          .eq('user_id', activity.user_id)
          .limit(1)
          .single()

        const candidate = (candidateData as any)?.candidates?.[0] || {}

        return {
          user_id: activity.user_id,
          quiz_id: activity.quiz_id,
          heartbeat_at: activity.heartbeat_at,
          candidate_email: candidate.email || 'Unknown',
          candidate_name: candidate.full_name || null,
        }
      })
    )

    return NextResponse.json({ activities })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}
