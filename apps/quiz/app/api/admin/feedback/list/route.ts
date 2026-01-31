import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/server/admin/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check admin session
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Fetch feedback with pagination
    const { data: feedback, error, count } = await supabaseAdmin
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[admin/feedback/list] Query error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Calculate averages
    const { data: avgData } = await supabaseAdmin
      .from('feedback')
      .select('q1_personal_email, q2_clear_instructions, q3_pleasant_experience, q4_self_recognition, q5_need_explanation')

    let averages: { q1: string; q2: string; q3: string; q4: string; q5: string; total: number } | null = null
    if (avgData && avgData.length > 0) {
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
      const avg = (arr: number[]) => arr.length > 0 ? (sum(arr) / arr.length).toFixed(1) : '0'
      
      averages = {
        q1: avg(avgData.map(f => f.q1_personal_email).filter(Boolean)),
        q2: avg(avgData.map(f => f.q2_clear_instructions).filter(Boolean)),
        q3: avg(avgData.map(f => f.q3_pleasant_experience).filter(Boolean)),
        q4: avg(avgData.map(f => f.q4_self_recognition).filter(Boolean)),
        q5: avg(avgData.map(f => f.q5_need_explanation).filter(Boolean)),
        total: avgData.length,
      }
    }

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      averages,
    })

  } catch (error) {
    console.error('[admin/feedback/list] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
