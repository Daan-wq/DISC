// @ts-nocheck
// Supabase Edge Function: on_quiz_finished_generate_and_send_pdf
// This function validates the caller's session, checks attempt ownership,
// and delegates PDF generation + email to the Next.js API at /api/quiz/finish.
// Note: Puppeteer cannot run in Deno Edge; delegating to Node runtime is intentional.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    return new Response(
      JSON.stringify({
        error: 'LEGACY_PDF_PIPELINE_DISABLED',
        details: 'PDF generatie en mail verzending via deze Edge Function is uitgeschakeld. Gebruik de HTML print flow.',
        url: url.toString(),
      }),
      { status: 410 }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unhandled', details: (e as Error).message || String(e) }), { status: 500 })
  }
 })
