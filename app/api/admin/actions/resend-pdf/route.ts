import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'
import { sendRapportEmail, generateEmailHtml, generateEmailText } from '@/server/email/mailer'
import { buildPdfFilename } from '@/lib/utils/slugify'

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  to: z.enum(['user','trainer','both']).default('both')
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const { attempt_id, to } = parsed.data

    const { data: attempt, error: aErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, quiz_id, user_id, pdf_path, pdf_filename, pdf_created_at')
      .eq('id', attempt_id)
      .maybeSingle()
    if (aErr || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    // Lookup user email (owner)
    const { data: userRow, error: uErr } = await supabaseAdmin.auth.admin.getUserById(attempt.user_id)
    if (uErr || !userRow?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const userEmail = (userRow.user.email || '').toLowerCase().trim()

    // Allowlist delivery
    const { data: allow } = await supabaseAdmin
      .from('allowlist')
      .select('trainer_email, send_pdf_user, send_pdf_trainer, full_name')
      .eq('email_normalized', userEmail)
      .maybeSingle()

    const sendUser = to === 'user' || to === 'both'
      ? (allow?.send_pdf_user !== false)
      : false
    const sendTrainer = to === 'trainer' || to === 'both'
      ? !!(allow?.send_pdf_trainer && allow?.trainer_email)
      : false

    const recipients: string[] = []
    if (sendUser) recipients.push(userEmail)
    if (sendTrainer && allow?.trainer_email) recipients.push(allow.trainer_email.trim())
    if (recipients.length === 0) return NextResponse.json({ error: 'No eligible recipients' }, { status: 400 })

    // Download existing PDF; do not regenerate here
    if (!attempt.pdf_path) return NextResponse.json({ error: 'No PDF available' }, { status: 400 })
    const dl = await supabaseAdmin.storage.from('quiz-docs').download(attempt.pdf_path)
    if (dl.error || !dl.data) return NextResponse.json({ error: 'Download failed' }, { status: 500 })
    const arrayBuffer = await dl.data.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    // Prepare template values
    const displayName = allow?.full_name || (userEmail.split('@')[0] || 'Deelnemer')
    const year = new Date().getFullYear()
    const company = process.env.COMPANY_NAME || 'The Lean Communication'
    
    // Use stored pdf_filename or build one from name (for legacy PDFs)
    const pdfFilename = attempt.pdf_filename || buildPdfFilename(displayName)

    for (const rcpt of recipients) {
      await sendRapportEmail({
        to: rcpt,
        subject: 'Uw DISC rapport is gereed',
        html: generateEmailHtml({ name: displayName, year, company }),
        text: generateEmailText({ name: displayName, year, company }),
        attachments: [{ filename: pdfFilename, content: pdfBuffer }]
      })
      try {
        await supabaseAdmin.from('notifications').insert({
          severity: 'success', source: 'mailer', message: `PDF re-sent to ${rcpt}`,
          meta: { attempt_id, quiz_id: attempt.quiz_id, user_id: attempt.user_id }
        })
      } catch {}
    }

    return NextResponse.json({ ok: true, recipients })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}
