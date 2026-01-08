import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAllowlistEmail } from '@/server/email/mailer'
import { validateCsrf } from '@/server/admin/csrf'

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

    // CSRF validation for state-changing request
    const csrfError = validateCsrf(req)
    if (csrfError) {
      console.warn('[allowlist/upsert] CSRF validation failed:', csrfError)
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

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

    // Ensure auth user exists so login can always use the inloglink email (no signup confirmation)
    try {
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
      })

      if (createErr) {
        const status = (createErr as any)?.status
        if (status !== 422) {
          console.warn('[allowlist/upsert] Failed to ensure auth user exists', {
            email: data.email,
            message: (createErr as any)?.message || String(createErr),
            status,
          })
        }
      }
    } catch (e) {
      console.warn('[allowlist/upsert] Failed to ensure auth user exists (exception)', {
        email: data.email,
        error: (e as any)?.message || String(e),
      })
    }

    // Send invitation email automatically
    try {
      // IMPORTANT: Always use QUIZ_SITE_URL env var for quiz invitations
      // Never use request origin (that's the admin URL, not quiz URL)
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
      const isVercel = process.env.VERCEL === '1'

      // In local development: always use localhost
      // In production/Vercel: use env var or fallback to Vercel URL
      const quizSiteUrl = (!isProduction && !isVercel)
        ? (process.env.QUIZ_SITE_URL || 'http://localhost:3000')
        : (process.env.QUIZ_SITE_URL || 'https://disc-quiz-interface.vercel.app')

      await sendAllowlistEmail({
        to: data.email,
        fullName: data.full_name,
        quizUrl: `${quizSiteUrl}/login`
      })
      console.log(`Invitation email sent to ${data.email}`)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
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
