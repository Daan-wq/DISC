// @ts-nocheck
// Supabase Edge Function: on_quiz_finished_generate_and_send_pdf
// This function validates the caller's session, checks attempt ownership,
// and delegates PDF generation + email to the Next.js API at /api/quiz/finish.
// Note: Puppeteer cannot run in Deno Edge; delegating to Node runtime is intentional.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SITE_URL = Deno.env.get('SITE_URL') || Deno.env.get('NEXT_PUBLIC_BASE_URL')

    if (!SUPABASE_URL || !SERVICE_ROLE || !SITE_URL) {
      return new Response(JSON.stringify({ error: 'Missing environment (SUPABASE_URL, SERVICE_ROLE, SITE_URL)' }), { status: 500 })
    }

    const auth = req.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : null
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: userRes } = await supabaseAdmin.auth.getUser(token)
    const user = userRes?.user
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const body = await req.json()
    const { attempt_id, quiz_id, result_id, placeholderData } = body || {}
    if (!attempt_id || !quiz_id) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    // Verify ownership of attempt before delegating
    const { data: attempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id, quiz_id')
      .eq('id', attempt_id)
      .maybeSingle()

    if (!attempt || attempt.user_id !== user.id || attempt.quiz_id !== quiz_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    // Delegate to Next.js API on Node for heavy PDF generation
    const resp = await fetch(`${SITE_URL}/api/quiz/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ attempt_id, quiz_id, result_id, placeholderData })
    })

    const json = await resp.json().catch(() => ({}))
    return new Response(JSON.stringify(json), { status: resp.status })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unhandled', details: (e as Error).message || String(e) }), { status: 500 })
  }
})
