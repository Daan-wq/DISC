import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  attempt_id: z.string().uuid(),
})

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
  return token || null
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const parsed = QuerySchema.safeParse({ attempt_id: searchParams.get('attempt_id') })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid attempt_id' }, { status: 400 })
    }

    const attemptId = parsed.data.attempt_id

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id')
      .eq('id', attemptId)
      .maybeSingle()

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const emailRaw = (user.email || '').trim()
    const emailNormalized = emailRaw.toLowerCase()

    let sendPdfUser = true
    let sendPdfTrainer = false
    let trainerEmail: string | null = null

    if (emailRaw) {
      const { data: allowByNormalized } = await supabaseAdmin
        .from('allowlist')
        .select('send_pdf_user, send_pdf_trainer, trainer_email, created_at')
        .eq('email_normalized', emailNormalized)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: allowByEmailRaw } = allowByNormalized
        ? { data: null }
        : await supabaseAdmin
            .from('allowlist')
            .select('send_pdf_user, send_pdf_trainer, trainer_email, created_at')
            .eq('email', emailRaw)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

      const { data: allowByEmailNormalized } = allowByNormalized || allowByEmailRaw
        ? { data: null }
        : await supabaseAdmin
            .from('allowlist')
            .select('send_pdf_user, send_pdf_trainer, trainer_email, created_at')
            .eq('email', emailNormalized)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

      const allow = allowByNormalized || allowByEmailRaw || allowByEmailNormalized

      if (allow) {
        sendPdfUser = allow.send_pdf_user !== false
        sendPdfTrainer = allow.send_pdf_trainer === true
        trainerEmail = allow.trainer_email || null
      }
    }

    const canUserDownload = !(sendPdfTrainer && !sendPdfUser)

    return NextResponse.json({
      can_user_download: canUserDownload,
      send_pdf_user: sendPdfUser,
      send_pdf_trainer: sendPdfTrainer,
      trainer_email: trainerEmail,
    })
  } catch (e: any) {
    console.error('[rapport/delivery-config] unhandled', { error: e?.message || String(e) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
