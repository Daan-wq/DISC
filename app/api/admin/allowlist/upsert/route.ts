import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAllowlistEmail } from '@/server/email/mailer'

const BodySchema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  quiz_id: z.string().uuid().nullable().optional(),
  trainer_email: z.string().email().nullable().optional(),
  send_pdf_user: z.boolean().default(true),
  send_pdf_trainer: z.boolean().default(false),
  theme: z.enum(['tlc','imk']).default('tlc'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    const data = parsed.data

    const email_normalized = data.email.trim().toLowerCase()

    const { data: upserted, error } = await supabaseAdmin
      .from('allowlist')
      .upsert({
        email: data.email,
        full_name: data.full_name,
        quiz_id: data.quiz_id ?? null,
        trainer_email: data.trainer_email ?? null,
        send_pdf_user: data.send_pdf_user,
        send_pdf_trainer: data.send_pdf_trainer,
        theme: data.theme,
      }, { onConflict: 'email_normalized,quiz_id' })
      .select('id, email, status')
      .limit(1)

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    await audit('allowlist_upsert', { email_normalized, quiz_id: data.quiz_id ?? null })

    // Send invitation email automatically
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      await sendAllowlistEmail({
        to: data.email,
        fullName: data.full_name,
        quizUrl: `${siteUrl}/login`
      })
      console.log(`✅ Invitation email sent to ${data.email}`)
    } catch (emailError) {
      console.error('⚠️ Failed to send invitation email:', emailError)
      // Don't fail the request if email fails - allowlist entry was still created
    }

    return NextResponse.json({ ok: true, item: upserted?.[0] ?? null })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}

async function audit(type: string, payload: Record<string, unknown>) {
  try {
    if (!supabaseAdmin) return
    await supabaseAdmin.from('admin_events').insert({ type, actor: 'admin', payload })
  } catch {}
}
