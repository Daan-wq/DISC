import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/server/admin/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MetricKey =
  | 'rating_user_friendly'
  | 'rating_easy'
  | 'rating_options_clear'
  | 'rating_instructions_clear'
  | 'rating_recognizable'
  | 'rating_honest_representation'
  | 'rating_trust_result'
  | 'rating_profile_recognizable'
  | 'rating_profile_explanation_clear'
  | 'rating_presentation_structure_clear'
  | 'rating_post_receipt_clarity'
  | 'rating_recommend_to_others'

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: 'rating_user_friendly', label: 'Gebruiksvriendelijk' },
  { key: 'rating_easy', label: 'Makkelijk' },
  { key: 'rating_options_clear', label: 'Keuzes duidelijk' },
  { key: 'rating_instructions_clear', label: 'Instructies duidelijk' },
  { key: 'rating_recognizable', label: 'Herkenbaar' },
  { key: 'rating_honest_representation', label: 'Eerlijke representatie' },
  { key: 'rating_trust_result', label: 'Vertrouwen in resultaat' },
  { key: 'rating_profile_recognizable', label: 'Profiel herkenbaar' },
  { key: 'rating_profile_explanation_clear', label: 'Uitleg duidelijk' },
  { key: 'rating_presentation_structure_clear', label: 'Structuur duidelijk' },
  { key: 'rating_post_receipt_clarity', label: 'Nazorg/ontvangst duidelijk' },
  { key: 'rating_recommend_to_others', label: 'Aanbevelen' },
]

function average(values: Array<number | null | undefined>) {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!nums.length) return null
  const sum = nums.reduce((a, b) => a + b, 0)
  return Math.round((sum / nums.length) * 10) / 10
}

function countBy(values: Array<string | null | undefined>) {
  const out: Record<string, number> = {}
  values
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .forEach((v) => {
      out[v] = (out[v] || 0) + 1
    })
  return out
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: items, error } = await supabaseAdmin
      .from('feedback_submissions')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) {
      console.error('[admin/feedback/summary] DB error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const total = (items || []).length
    const last7days = (items || []).filter((i: any) => i.created_at >= since7).length

    const metrics = METRICS.map((m) => {
      const values = (items || []).map((i: any) => i[m.key] as number | null)
      const avg = average(values)
      const count = values.filter((v: any) => typeof v === 'number').length
      return { ...m, avg, count }
    })

    const top = metrics
      .filter((m) => typeof m.avg === 'number')
      .sort((a, b) => (b.avg as number) - (a.avg as number))
      .slice(0, 3)

    const low = metrics
      .filter((m) => typeof m.avg === 'number')
      .sort((a, b) => (a.avg as number) - (b.avg as number))
      .slice(0, 3)

    const delivery = countBy((items || []).map((i: any) => i.delivery_preference as string | null))
    const length = countBy((items || []).map((i: any) => i.length_preference as string | null))

    const averages: Record<string, number | null> = {}
    metrics.forEach((m) => {
      averages[m.key] = m.avg
    })

    return NextResponse.json({
      total,
      last7days,
      since,
      days,
      averages,
      top,
      low,
      distributions: {
        delivery_preference: delivery,
        length_preference: length,
      },
    })
  } catch (e: any) {
    console.error('[admin/feedback/summary] Unhandled:', e?.message || String(e))
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}
