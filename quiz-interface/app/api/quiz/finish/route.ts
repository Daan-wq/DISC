import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { generatePDFFromTemplate } from '@/lib/services/pdf-generator'
import { sendRapportEmail, generateEmailHtml, generateEmailText } from '@/server/email/mailer'
import { buildPdfStoragePath, buildPdfFilename, findUniqueStoragePath } from '@/lib/utils/slugify'
import { QUIZ_ID } from '@/lib/constants'

// Ensure Node.js runtime (Puppeteer not supported on Edge)
export const runtime = 'nodejs'
// Avoid ISR caching for API side-effects
export const dynamic = 'force-dynamic'
// PDF generation with Puppeteer can take up to 60 seconds
export const maxDuration = 60

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  result_id: z.string().uuid().optional(),
  // Optional: provide placeholders and chart data directly
  placeholderData: z.object({
    candidate: z.object({ full_name: z.string().min(1) }),
    results: z.object({
      created_at: z.string(),
      profile_code: z.string().min(1),
      natural_d: z.number(),
      natural_i: z.number(),
      natural_s: z.number(),
      natural_c: z.number(),
      response_d: z.number(),
      response_i: z.number(),
      response_s: z.number(),
      response_c: z.number(),
    }),
    meta: z.object({ dateISO: z.string().optional(), stijlLabel: z.string().optional() }).optional()
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    console.log('=== /api/quiz/finish START ===')
    
    if (!supabaseAdmin) {
      console.error('[finish] supabaseAdmin is null')
      return NextResponse.json({ error: 'Server not configured (no service role)' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null
    console.log('[finish] token present:', !!token)
    
    if (!token) {
      console.error('[finish] No authorization token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    console.log('[finish] authenticated user:', user?.id)
    
    if (!user) {
      console.error('[finish] User not found from token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    console.log('[finish] request body keys:', Object.keys(json))
    
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      console.error('[finish] validation failed:', parsed.error.format())
      // Don't expose validation details in production (information disclosure risk)
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })
      }
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { attempt_id, placeholderData: providedPD, result_id: _result_id } = parsed.data
    const quiz_id = QUIZ_ID
    console.log('[finish] attempt_id:', attempt_id, 'quiz_id:', quiz_id)

    // Verify ownership of attempt
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id, quiz_id, finished_at, pdf_path, pdf_filename')
      .eq('id', attempt_id)
      .maybeSingle()
    
    console.log('[finish] attempt lookup - error:', attemptErr?.message, 'found:', !!attempt)
    
    if (attemptErr || !attempt) {
      console.error('[finish] Attempt not found:', { attemptErr: attemptErr?.message, attempt_id })
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    if (attempt.user_id !== user.id || attempt.quiz_id !== quiz_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Idempotency: if PDF already exists, check if email was sent
    // If email wasn't sent yet, we need to send it now (don't skip!)
    if (attempt.pdf_path) {
      console.log('[finish] PDF already exists, checking email status')
      
      // Check if email was already sent for this attempt
      const { data: attemptWithEmail } = await supabaseAdmin
        .from('quiz_attempts')
        .select('email_status, email_sent_at')
        .eq('id', attempt_id)
        .single()
      
      const emailAlreadySent = attemptWithEmail?.email_status === 'sent' || attemptWithEmail?.email_sent_at
      
      if (emailAlreadySent) {
        console.log('[finish] PDF exists AND email already sent - returning cached result')
        return NextResponse.json({
          ok: true,
          storage_path: attempt.pdf_path,
          pdf_filename: attempt.pdf_filename || 'DISC-rapport.pdf',
          cached: true,
          email_status: 'already_sent'
        })
      }
      
      // PDF exists but email NOT sent - need to send email now
      console.log('[finish] PDF exists but email NOT sent - sending email now')
      
      // Download PDF from storage to attach to email
      const bucket = supabaseAdmin.storage.from('quiz-docs')
      const { data: pdfData, error: downloadErr } = await bucket.download(attempt.pdf_path)
      
      if (downloadErr || !pdfData) {
        console.error('[finish] Failed to download cached PDF for email:', downloadErr)
        return NextResponse.json({
          ok: true,
          storage_path: attempt.pdf_path,
          pdf_filename: attempt.pdf_filename || 'DISC-rapport.pdf',
          cached: true,
          email_status: 'failed',
          email_error: 'Could not retrieve PDF for email'
        })
      }
      
      // Convert Blob to Buffer
      const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())
      const pdfFilename = attempt.pdf_filename || 'DISC-rapport.pdf'
      const displayName = user.email?.split('@')[0] || 'user'
      
      // Send email for cached PDF
      const toEmail = user.email || ''
      let emailSent = false
      let emailError: string | null = null
      
      try {
        const year = new Date().getFullYear()
        const company = process.env.COMPANY_NAME || 'The Lean Communication'
        
        // Check allowlist delivery toggles
        const emailNormalized = toEmail.toLowerCase().trim()
        const { data: allow } = await supabaseAdmin
          .from('allowlist')
          .select('trainer_email, send_pdf_user, send_pdf_trainer, status')
          .eq('email_normalized', emailNormalized)
          .maybeSingle()
        
        const sendUser = allow?.send_pdf_user !== false
        const sendTrainer = !!(allow?.send_pdf_trainer && allow?.trainer_email)
        const trainerEmail = (allow?.trainer_email || '').trim()
        
        const recipients: string[] = []
        if (sendUser) recipients.push(toEmail)
        if (sendTrainer) recipients.push(trainerEmail)
        if (recipients.length === 0) recipients.push(toEmail)
        
        console.log('[finish] Sending cached PDF email to:', recipients)
        
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
              severity: 'success',
              source: 'mailer',
              message: `PDF emailed to ${rcpt} (cached)`,
              meta: { attempt_id, quiz_id, user_id: user.id }
            })
          } catch {}
        }
        
        emailSent = true
        console.log('[finish] Cached PDF email sent successfully')
        
        // Update allowlist status
        await supabaseAdmin
          .from('allowlist')
          .update({ status: 'used' })
          .eq('email_normalized', emailNormalized)
          .in('status', ['pending', 'claimed'])
      } catch (mailErr) {
        emailSent = false
        emailError = (mailErr as any)?.message || String(mailErr)
        console.error('[finish] Cached PDF email send failed:', mailErr)
        try {
          await supabaseAdmin.from('notifications').insert({
            severity: 'error',
            source: 'mailer',
            message: 'Failed to email cached PDF to user',
            meta: { attempt_id, quiz_id, user_id: user.id, error: emailError }
          })
        } catch {}
      }
      
      // Update attempt with email status
      try {
        await supabaseAdmin
          .from('quiz_attempts')
          .update({
            email_status: emailSent ? 'sent' : 'failed',
            email_error: emailError,
            email_sent_at: emailSent ? new Date().toISOString() : null
          })
          .eq('id', attempt_id)
      } catch (updateErr) {
        console.error('[finish] Failed to update email status:', updateErr)
      }
      
      return NextResponse.json({
        ok: true,
        storage_path: attempt.pdf_path,
        pdf_filename: pdfFilename,
        cached: true,
        email_status: emailSent ? 'sent' : 'failed',
        email_error: emailError
      })
    }

    // Optimistic lock: only proceed if we can claim finished_at
    const { data: claimed } = await supabaseAdmin
      .from('quiz_attempts')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', attempt_id)
      .is('finished_at', null)
      .select('id')
      .maybeSingle()

    if (!claimed) {
      // Race condition: another request may be processing, wait and check
      console.log('[finish] Race condition detected, waiting for other request')
      await new Promise(r => setTimeout(r, 2000))
      const { data: existing } = await supabaseAdmin
        .from('quiz_attempts')
        .select('pdf_path, pdf_filename')
        .eq('id', attempt_id)
        .single()
      
      if (existing?.pdf_path) {
        return NextResponse.json({
          ok: true,
          storage_path: existing.pdf_path,
          pdf_filename: existing.pdf_filename,
          cached: true
        })
      }
      return NextResponse.json({ error: 'Processing in progress, please retry' }, { status: 409 })
    }

    // Build placeholder data from provided data only (results table removed)
    let profileCode = 'D'
    const finalPD = providedPD || null

    profileCode = (finalPD?.results?.profile_code as string) || 'D'
    
    // Detecteer afwijkende patronen in natuurlijke scores
    let hasAlert = false
    if (finalPD?.results) {
      const naturalScores = [
        finalPD.results.natural_d,
        finalPD.results.natural_i,
        finalPD.results.natural_s,
        finalPD.results.natural_c
      ]
      // Alert als ALLE scores onder de 50% zijn (te laag)
      const allBelow50 = naturalScores.every(score => score < 50)
      
      // Alert als ALLE scores op of boven de 50% zijn (te hoog/vlak)
      const allAboveOrEqual50 = naturalScores.every(score => score >= 50)
      
      // Trigger alert bij beide patronen
      hasAlert = allBelow50 || allAboveOrEqual50
    }
    const pdfBuffer = await generatePDFFromTemplate({
      profileCode,
      placeholderData: finalPD as any,
      discData: finalPD ? {
        natural: {
          D: Math.round(finalPD.results.natural_d),
          I: Math.round(finalPD.results.natural_i),
          S: Math.round(finalPD.results.natural_s),
          C: Math.round(finalPD.results.natural_c),
        },
        response: {
          D: Math.round(finalPD.results.response_d),
          I: Math.round(finalPD.results.response_i),
          S: Math.round(finalPD.results.response_s),
          C: Math.round(finalPD.results.response_c),
        },
      } : undefined,
    })

    // Build readable storage path with user name
    const displayName = finalPD?.candidate?.full_name || (user.email?.split('@')[0] || 'user')
    const baseStoragePath = buildPdfStoragePath(user.id, quiz_id, displayName)
    const pdfFilename = buildPdfFilename(displayName)

    // Find unique path (handles collisions by appending -1, -2, etc.)
    const bucket = supabaseAdmin.storage.from('quiz-docs')
    const storagePath = await findUniqueStoragePath(baseStoragePath, async (path) => {
      const { data } = await bucket.list(path.substring(0, path.lastIndexOf('/')), {
        search: path.substring(path.lastIndexOf('/') + 1)
      })
      return (data && data.length > 0) || false
    })

    // Upload to storage (private bucket)
    const { error: upErr } = await bucket.upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false, // Never upsert since we found unique path
    })
    if (upErr) {
      return NextResponse.json({ error: 'Upload failed', details: upErr.message }, { status: 500 })
    }

    // Consolidated schema: store PDF metadata, alert flag, and profile code on the attempt
    // Set expiry to 180 days from now
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString()
    
    const { error: updateErr } = await supabaseAdmin
      .from('quiz_attempts')
      .update({
        pdf_path: storagePath,
        pdf_filename: pdfFilename,
        pdf_created_at: now.toISOString(),
        pdf_expires_at: expiresAt,
        alert: hasAlert,
      })
      .eq('id', attempt_id)
    
    if (updateErr) {
      console.error('[finish] Failed to update attempt with PDF metadata:', updateErr)
      return NextResponse.json({ error: 'Failed to save PDF metadata', details: updateErr.message }, { status: 500 })
    }
    
    console.log('[finish] PDF metadata saved successfully')

    // Create notification if alert was triggered (unusual score pattern)
    if (hasAlert) {
      try {
        const alertType = finalPD?.results ? (
          [finalPD.results.natural_d, finalPD.results.natural_i, finalPD.results.natural_s, finalPD.results.natural_c].every(s => s < 50)
            ? 'alle scores onder 50%'
            : 'alle scores op of boven 50%'
        ) : 'onbekend patroon'
        
        await supabaseAdmin.from('notifications').insert({
          severity: 'warning',
          source: 'quiz',
          message: `Afwijkend scorepatroon gedetecteerd: ${alertType}`,
          meta: { 
            attempt_id, 
            quiz_id, 
            user_id: user.id,
            user_email: user.email,
            candidate_name: finalPD?.candidate?.full_name || null,
            natural_scores: finalPD?.results ? {
              D: Math.round(finalPD.results.natural_d),
              I: Math.round(finalPD.results.natural_i),
              S: Math.round(finalPD.results.natural_s),
              C: Math.round(finalPD.results.natural_c),
            } : null
          }
        })
        console.log('[finish] Alert notification created')
      } catch (notifErr) {
        console.error('[finish] Failed to create alert notification:', notifErr)
      }
    }

    // Email the PDF as attachment (no Supabase URL)
    const toEmail = user.email || ''
    let emailSent = false
    let emailError: string | null = null
    
    try {
      const year = new Date().getFullYear()
      const company = process.env.COMPANY_NAME || 'The Lean Communication'

      // Check allowlist delivery toggles
      const emailNormalized = toEmail.toLowerCase().trim()
      const { data: allow } = await supabaseAdmin
        .from('allowlist')
        .select('trainer_email, send_pdf_user, send_pdf_trainer, status')
        .eq('email_normalized', emailNormalized)
        .maybeSingle()

      const sendUser = allow?.send_pdf_user !== false
      const sendTrainer = !!(allow?.send_pdf_trainer && allow?.trainer_email)
      const trainerEmail = (allow?.trainer_email || '').trim()

      const recipients: string[] = []
      if (sendUser) recipients.push(toEmail)
      if (sendTrainer) recipients.push(trainerEmail)
      if (recipients.length === 0) {
        recipients.push(toEmail) // safe fallback
      }

      // Send individually to recipients and record notifications
      for (const rcpt of recipients) {
        await sendRapportEmail({
          to: rcpt,
          subject: 'Uw DISC rapport is gereed',
          html: generateEmailHtml({ name: displayName, year, company }),
          text: generateEmailText({ name: displayName, year, company }),
          attachments: [{ filename: pdfFilename, content: pdfBuffer }]
        })
        // notification success
        try {
          await supabaseAdmin.from('notifications').insert({
            severity: 'success',
            source: 'mailer',
            message: `PDF emailed to ${rcpt}`,
            meta: { attempt_id, quiz_id, user_id: user.id }
          })
        } catch {}
      }

      // Mark email as successfully sent
      emailSent = true

      // Update allowlist status to "used" after successful email send
      await supabaseAdmin
        .from('allowlist')
        .update({ status: 'used' })
        .eq('email_normalized', emailNormalized)
        .in('status', ['pending', 'claimed'])
    } catch (mailErr) {
      // Email failed - record error details
      emailSent = false
      emailError = (mailErr as any)?.message || String(mailErr)
      console.error('Email send failed:', mailErr)
      try {
        await supabaseAdmin.from('notifications').insert({
          severity: 'error',
          source: 'mailer',
          message: 'Failed to email PDF to user',
          meta: { attempt_id, quiz_id, user_id: user.id, error: emailError }
        })
      } catch {}
    }

    // Update attempt with email status
    try {
      await supabaseAdmin
        .from('quiz_attempts')
        .update({
          email_status: emailSent ? 'sent' : 'failed',
          email_error: emailError,
          email_sent_at: emailSent ? new Date().toISOString() : null
        })
        .eq('id', attempt_id)
    } catch (updateErr) {
      console.error('Failed to update email status:', updateErr)
    }

    console.log('[finish] SUCCESS - PDF generated and emailed, email_sent:', emailSent)
    console.log('=== /api/quiz/finish END (SUCCESS) ===')
    return NextResponse.json({ ok: true, storage_path: storagePath, pdf_filename: pdfFilename })
  } catch (e: any) {
    console.error('[finish] EXCEPTION:', e?.message || String(e))
    console.error('[finish] Stack:', e?.stack)
    console.log('=== /api/quiz/finish END (ERROR) ===')
    return NextResponse.json({ error: 'Unhandled', details: e?.message || String(e) }, { status: 500 })
  }
}
