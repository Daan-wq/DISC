import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAllowlistEmail } from '@/server/email/mailer'
import { validateCsrf } from '@/server/admin/csrf'

const RowSchema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  quiz_id: z.string().uuid().nullable().optional(),
  trainer_email: z.string().email().nullable().optional(),
  send_pdf_user: z.boolean().default(true),
  send_pdf_trainer: z.boolean().default(false),
  testgroup: z.boolean().default(false),
  theme: z.enum(['tlc','imk']).default('tlc'),
})

const BodySchema = z.object({
  rows: z.array(RowSchema)
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // CSRF validation for state-changing request
    const csrfError = validateCsrf(req)
    if (csrfError) {
      console.warn('[allowlist/bulk-import] CSRF validation failed:', csrfError)
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      console.error('[bulk-import] Validation failed:', parsed.error.issues)
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
    }

    const rows = parsed.data.rows
    if (!rows.length) return NextResponse.json({ ok: true, inserted: 0, updated: 0 })

    console.log('[bulk-import] Processing', rows.length, 'rows')

    // Upsert in one batch
    const payload = rows.map(r => ({
      email: r.email,
      full_name: r.full_name || null,
      quiz_id: r.quiz_id ?? null,
      trainer_email: r.trainer_email ?? null,
      send_pdf_user: r.send_pdf_user,
      send_pdf_trainer: r.send_pdf_trainer,
      testgroup: r.testgroup,
      theme: r.theme,
    }))

    console.log('[bulk-import] Payload:', JSON.stringify(payload, null, 2))

    const { data, error } = await supabaseAdmin
      .from('allowlist')
      .upsert(payload, { onConflict: 'email_normalized' })
      .select('id')

    if (error) {
      console.error('[bulk-import] Database error:', error)
      return NextResponse.json({ error: 'DB error', details: error.message }, { status: 500 })
    }

    const testgroupCount = rows.filter(r => r.testgroup).length
    await audit('allowlist_bulk_import', { count: rows.length, testgroup_count: testgroupCount })

    // Send invitation emails to all imported users
    // IMPORTANT: Always use QUIZ_SITE_URL env var for quiz invitations
    // Never use request origin (that's the admin URL, not quiz URL)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    const quizSiteUrl = process.env.QUIZ_SITE_URL || (isProduction ? 'https://disc-quiz-interface.vercel.app' : 'http://localhost:3000')
    
    let emailsSent = 0
    let emailsFailed = 0
    
    for (const row of rows) {
      try {
        await sendAllowlistEmail({
          to: row.email,
          fullName: row.full_name,
          quizUrl: `${quizSiteUrl}/login`
        })
        emailsSent++
        console.log(`✅ Invitation email sent to ${row.email}`)
      } catch (emailError) {
        emailsFailed++
        console.error(`⚠️ Failed to send email to ${row.email}:`, emailError)
      }
    }

    console.log(`📧 Email summary: ${emailsSent} sent, ${emailsFailed} failed`)

    return NextResponse.json({ 
      ok: true, 
      count: data?.length || 0,
      emails: { sent: emailsSent, failed: emailsFailed }
    })
  } catch (e: any) {
    console.error('[bulk-import] Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled', details: e?.message }, { status: 500 })
  }
}

async function audit(type: string, payload: Record<string, unknown>) {
  try {
    if (!supabaseAdmin) return
    await supabaseAdmin.from('admin_events').insert({ type, actor: 'admin', payload })
  } catch {}
}
