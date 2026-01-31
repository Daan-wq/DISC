import nodemailer from 'nodemailer'
import { Buffer } from 'node:buffer'

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | Uint8Array
    contentType?: string
  }>
}

export async function sendRapportEmail(options: EmailOptions) {
  // Convert Uint8Array attachments to Buffer for Nodemailer
  const attachments = options.attachments?.map(att => ({
    filename: att.filename,
    content: Buffer.from(att.content),
    contentType: att.contentType || 'application/pdf'
  }))

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || 'Your DISC profile results are ready.',
    attachments
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email error:', error)
    throw error
  }
}

/**
 * Generate HTML email (inline CSS, table-based layout, universal client compatibility)
 * 
 * Design principles:
 * - Table-based layout (no flex/grid)
 * - Inline CSS on all elements
 * - Web-safe fonts only
 * - Solid colors (no gradients/images)
 * - Single column, centered, 600px max width
 * - Works across Gmail/Outlook/Apple Mail (web & mobile)
 */
export function generateEmailHtml(data: { name: string; year: number | string; company: string }): string {
  const bg = '#f4f4f4'
  const cardBg = '#FFFFFF'
  const text = '#333333'
  const textMuted = '#666666'
  const muted = '#999999'
  
  // Extract first name only
  const firstName = data.name.split(' ')[0]
  
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Je persoonlijke TLC Profiel</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: ${bg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bg}; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBg}; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 20px 20px 20px;">
              <img src="https://lsfhegbphxdapjodmjua.supabase.co/storage/v1/object/public/Images/TLC-3.png" alt="TLC Profielen" style="max-width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="color: ${text}; font-size: 24px; margin: 0 0 20px 0; text-align: center;">Hierbij je persoonlijke TLC Profiel</h1>
              <p style="color: ${textMuted}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Beste ${firstName},
              </p>
              <p style="color: ${textMuted}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Je volledige rapport is bijgevoegd als PDF-bestand.
              </p>
              <p style="color: ${textMuted}; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Hartelijke groet,<br/>
                Het team van TLC Profielen
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center;">
              <p style="color: ${muted}; font-size: 12px; margin: 0;">
                © ${data.year} ${data.company}. Alle rechten voorbehouden.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`
}

/**
 * Generate plain text version (exact same copy)
 */
export function generateEmailText(data: { name: string; year: number | string; company: string }): string {
  // Extract first name only
  const firstName = data.name.split(' ')[0]
  
  return [
    `Beste ${firstName},`,
    '',
    'Hierbij je persoonlijke TLC Profiel.',
    '',
    'Je volledige rapport is bijgevoegd als PDF-bestand.',
    '',
    'Hartelijke groet,',
    'Het team van TLC Profielen',
    '',
    `© ${data.year} ${data.company}. Alle rechten voorbehouden.`
  ].join('\n')
}

/**
 * Send allowlist invitation email
 */
export async function sendAllowlistEmail(options: {
  to: string
  fullName?: string
  quizUrl: string
}) {
  const name = options.fullName || options.to.split('@')[0]
  const company = 'TLC Profielen'
  const year = new Date().getFullYear()
  
  const html = generateAllowlistEmailHtml({ name, quizUrl: options.quizUrl, company, year })
  const text = generateAllowlistEmailText({ name, quizUrl: options.quizUrl, company, year })
  
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@tlcprofielen.nl',
    to: options.to,
    subject: 'Uitnodiging vragenlijst TLC Profiel',
    html,
    text
  }
  
  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Allowlist email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Allowlist email error:', error)
    throw error
  }
}

/**
 * Generate HTML for allowlist invitation email
 */
function generateAllowlistEmailHtml(data: { name: string; quizUrl: string; company: string; year: number }): string {
  const bg = '#f4f4f4'
  const cardBg = '#FFFFFF'
  const text = '#333333'
  const textMuted = '#666666'
  const muted = '#999999'
  const border = '#eeeeee'
  const buttonBg = '#4F46E5'
  const buttonText = '#FFFFFF'
  
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Uitnodiging vragenlijst TLC Profiel</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: ${bg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bg}; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBg}; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 20px 20px 20px;">
              <img src="https://lsfhegbphxdapjodmjua.supabase.co/storage/v1/object/public/Images/TLC-3.png" alt="TLC Profielen" style="max-width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="color: ${text}; font-size: 24px; margin: 0 0 20px 0; text-align: center;">Je bent uitgenodigd!</h1>
              <p style="color: ${textMuted}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Beste ${data.name},
              </p>
              <p style="color: ${textMuted}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Je bent uitgenodigd om de TLC vragenlijst in te vullen. De uitkomsten helpen je om inzicht te krijgen in je communicatiestijl en gedragspatronen.
              </p>
              <p style="color: ${textMuted}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Klik op de knop om te beginnen met de vragenlijst:
              </p>
            </td>
          </tr>
          
          <!-- Button -->
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="${data.quizUrl}" style="display: inline-block; padding: 14px 40px; background-color: ${buttonBg}; color: ${buttonText}; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Start de vragenlijst</a>
            </td>
          </tr>
          
          <!-- Alternative Link -->
          <tr>
            <td style="padding: 0 40px 40px 40px; border-top: 1px solid ${border};">
              <p style="color: ${muted}; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Als de knop niet werkt, kopieer en plak dan deze link in je browser:<br/>
                <a href="${data.quizUrl}" style="color: ${buttonBg}; word-break: break-all;">${data.quizUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center;">
              <p style="color: ${muted}; font-size: 12px; margin: 0;">
                © ${data.year} ${data.company}. Alle rechten voorbehouden.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`
}

/**
 * Generate plain text for allowlist invitation email
 */
function generateAllowlistEmailText(data: { name: string; quizUrl: string; company: string; year: number }): string {
  return [
    `Beste ${data.name},`,
    '',
    'Je bent uitgenodigd om de TLC vragenlijst in te vullen. De uitkomsten helpen je om inzicht te krijgen in je communicatiestijl en gedragspatronen.',
    '',
    'Klik op de link om te beginnen met de vragenlijst:',
    data.quizUrl,
    '',
    `© ${data.year} ${data.company}. Alle rechten voorbehouden.`
  ].join('\n')
}

/**
 * Send feedback notification email to admins
 */
export interface FeedbackNotificationData {
  feedbackId: string
  fullName: string
  email: string
  scores: {
    q1: number
    q2: number
    q3: number
    q4: number
    q5: number
  }
  comments?: string
}

export async function sendFeedbackNotificationEmail(data: FeedbackNotificationData) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL
  if (!adminEmail) {
    console.warn('[mailer] No admin email configured for feedback notifications')
    return { success: false, reason: 'no_admin_email' }
  }

  const company = 'TLC Profielen'
  const year = new Date().getFullYear()
  
  const html = generateFeedbackNotificationHtml(data, company, year)
  const text = generateFeedbackNotificationText(data, company, year)
  
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@tlcprofielen.nl',
    to: adminEmail,
    subject: `Nieuwe feedback ontvangen van ${data.fullName}`,
    html,
    text
  }
  
  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Feedback notification email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Feedback notification email error:', error)
    throw error
  }
}

function generateFeedbackNotificationHtml(data: FeedbackNotificationData, company: string, year: number): string {
  const bg = '#f4f4f4'
  const cardBg = '#FFFFFF'
  const text = '#333333'
  const textMuted = '#666666'
  const muted = '#999999'
  
  const questions = [
    { label: 'Persoonlijke uitnodiging', score: data.scores.q1 },
    { label: 'Duidelijkheid instructies', score: data.scores.q2 },
    { label: 'Prettig invullen', score: data.scores.q3 },
    { label: 'Herkenning uitkomsten', score: data.scores.q4 },
    { label: 'Behoefte aan uitleg', score: data.scores.q5 },
  ]
  
  const scoresHtml = questions.map(q => 
    `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${q.label}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${q.score}/10</td></tr>`
  ).join('')
  
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>Nieuwe Feedback</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: ${bg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bg}; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBg}; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 30px 40px;">
              <h1 style="color: ${text}; font-size: 22px; margin: 0 0 20px 0;">Nieuwe Feedback Ontvangen</h1>
              <p style="color: ${textMuted}; font-size: 16px; margin: 0 0 10px 0;"><strong>Van:</strong> ${data.fullName}</p>
              <p style="color: ${textMuted}; font-size: 16px; margin: 0 0 20px 0;"><strong>E-mail:</strong> ${data.email}</p>
              
              <h2 style="color: ${text}; font-size: 18px; margin: 20px 0 10px 0;">Scores</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 4px;">
                <thead>
                  <tr style="background-color: #f9f9f9;">
                    <th style="padding: 10px; text-align: left;">Vraag</th>
                    <th style="padding: 10px; text-align: center;">Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${scoresHtml}
                </tbody>
              </table>
              
              ${data.comments ? `
              <h2 style="color: ${text}; font-size: 18px; margin: 20px 0 10px 0;">Opmerkingen</h2>
              <p style="color: ${textMuted}; font-size: 14px; line-height: 1.6; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">${data.comments}</p>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center;">
              <p style="color: ${muted}; font-size: 12px; margin: 0;">© ${year} ${company}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateFeedbackNotificationText(data: FeedbackNotificationData, company: string, year: number): string {
  return [
    'Nieuwe Feedback Ontvangen',
    '',
    `Van: ${data.fullName}`,
    `E-mail: ${data.email}`,
    '',
    'Scores:',
    `- Persoonlijke uitnodiging: ${data.scores.q1}/10`,
    `- Duidelijkheid instructies: ${data.scores.q2}/10`,
    `- Prettig invullen: ${data.scores.q3}/10`,
    `- Herkenning uitkomsten: ${data.scores.q4}/10`,
    `- Behoefte aan uitleg: ${data.scores.q5}/10`,
    '',
    data.comments ? `Opmerkingen:\n${data.comments}` : '',
    '',
    `© ${year} ${company}`
  ].filter(Boolean).join('\n')
}
