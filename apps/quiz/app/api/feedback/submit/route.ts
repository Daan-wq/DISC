import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendFeedbackNotificationEmail } from '@/server/email/mailer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FeedbackSchema = z.object({
  attempt_id: z.string().uuid().optional(),
  full_name: z.string().min(1, 'Naam is verplicht'),
  email: z.string().email('Ongeldig e-mailadres'),
  q1_personal_email: z.number().min(1).max(10),
  q2_clear_instructions: z.number().min(1).max(10),
  q3_pleasant_experience: z.number().min(1).max(10),
  q4_self_recognition: z.number().min(1).max(10),
  q5_need_explanation: z.number().min(1).max(10),
  q6_comments: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = FeedbackSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Insert feedback
    const { data: feedback, error: insertError } = await supabaseAdmin
      .from('feedback')
      .insert({
        user_id: user.id,
        attempt_id: data.attempt_id || null,
        full_name: data.full_name,
        email: data.email,
        q1_personal_email: data.q1_personal_email,
        q2_clear_instructions: data.q2_clear_instructions,
        q3_pleasant_experience: data.q3_pleasant_experience,
        q4_self_recognition: data.q4_self_recognition,
        q5_need_explanation: data.q5_need_explanation,
        q6_comments: data.q6_comments || null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[feedback/submit] Insert error:', insertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Send notification email to admins
    try {
      await sendFeedbackNotificationEmail({
        feedbackId: feedback.id,
        fullName: data.full_name,
        email: data.email,
        scores: {
          q1: data.q1_personal_email,
          q2: data.q2_clear_instructions,
          q3: data.q3_pleasant_experience,
          q4: data.q4_self_recognition,
          q5: data.q5_need_explanation,
        },
        comments: data.q6_comments,
      })
    } catch (emailError) {
      console.error('[feedback/submit] Email notification failed:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      id: feedback.id,
      message: 'Bedankt voor je feedback!' 
    })

  } catch (error) {
    console.error('[feedback/submit] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
