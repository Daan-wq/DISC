// Supabase Edge Function: send-allowlist-email
// Sends a simple email when someone is added to the allowlist
// Uses Supabase's built-in email functionality

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000'

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Get email from request
    const { email, invited_by } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send email using Supabase Auth's email functionality
    // This uses the built-in email templates
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_by: invited_by || 'DISC Team',
        message: 'Je kunt nu inloggen op de DISC quiz',
        quiz_url: `${SITE_URL}/quiz`
      },
      redirectTo: `${SITE_URL}/quiz`
    })

    if (error) {
      console.error('Error sending email:', error)
      
      // Update allowlist with error (optional)
      await supabase
        .from('allowlist')
        .update({ notified_at: null })
        .eq('email', email)

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Mark as notified
    await supabase
      .from('allowlist')
      .update({ notified_at: new Date().toISOString() })
      .eq('email', email)

    console.log(`Email sent to ${email}`)

    return new Response(
      JSON.stringify({ success: true, email }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
