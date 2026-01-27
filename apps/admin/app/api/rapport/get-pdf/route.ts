import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

 export async function GET(req: NextRequest) {
  try {
    console.log('[rapport/get-pdf] Disabled legacy PDF endpoint. Use HTML print flow instead.', {
      url: req.url,
      referer: req.headers.get('referer'),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json(
      {
        error: 'PDF_ENDPOINT_DISABLED',
        details: 'Deze PDF endpoint is uitgeschakeld. Gebruik de HTML print flow via /rapport/print-html.',
      },
      { status: 410 }
    )
  } catch (e: any) {
    console.error('[rapport/get-pdf] error:', e?.message || String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
 }
