import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  answers: z.array(z.enum(['A', 'B', 'C', 'D'])).min(1).max(48),
  answer_texts: z.array(z.string()).min(1).max(48).optional()
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Auth check: require valid bearer token
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    console.log('[answers/save] incoming payload - answers count:', json.answers?.length, 'user:', user.id)

    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      console.warn('[answers/save] validation failed:', parsed.error.format())
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      console.error('[answers/save] supabaseAdmin is null')
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      )
    }

    const { attempt_id, candidate_id, answers, answer_texts } = parsed.data

    // Ownership check: verify candidate belongs to user
    const { data: cand } = await supabaseAdmin
      .from('candidates')
      .select('user_id')
      .eq('id', candidate_id)
      .single()

    if (!cand || cand.user_id !== user.id) {
      console.warn('[answers/save] ownership check failed for candidate:', candidate_id, 'user:', user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[answers/save] Saving', answers.length, 'answers for attempt:', attempt_id)

    // Check if answers already exist for this attempt
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('answers')
      .select('id, raw_answers')
      .eq('attempt_id', attempt_id)
      .maybeSingle()

    if (checkErr) {
      console.error('[answers/save] error checking existing answers:', checkErr)
      return NextResponse.json({ error: 'Failed to check existing answers' }, { status: 500 })
    }

    // Prepare the data to save in payload (JSONB)
    const payloadData = {
      answers: answers,
      timestamp: new Date().toISOString()
    }

    if (existing) {
      // Update existing answers record
      console.log('[answers/save] Updating existing answers record:', existing.id)
      const { error: updateErr } = await supabaseAdmin
        .from('answers')
        .update({ payload: payloadData })
        .eq('id', existing.id)

      if (updateErr) {
        console.error('[answers/save] error updating answers:', updateErr)
        return NextResponse.json({ error: 'Failed to update answers' }, { status: 500 })
      }

      console.log('[answers/save] Successfully updated', answers.length, 'answers')
      return NextResponse.json({
        id: existing.id,
        action: 'updated',
        count: answers.length
      })
    } else {
      // Insert new answers record
      console.log('[answers/save] Creating new answers record')
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('answers')
        .insert({
          attempt_id,
          candidate_id,
          payload: payloadData,
          quiz_session_id: candidate_id
        })
        .select('id')
        .single()

      if (insertErr) {
        console.error('[answers/save] error inserting answers:', insertErr)
        return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
      }

      console.log('[answers/save] Successfully created answers record with', answers.length, 'answers')
      return NextResponse.json({
        id: inserted.id,
        action: 'created',
        count: answers.length
      })
    }
  } catch (e: any) {
    console.error('[answers/save] exception:', e?.message)
    return NextResponse.json({ error: 'Unhandled error', message: e?.message }, { status: 500 })
  }
}
