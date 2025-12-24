import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/server/admin/session'

// IMPORTANT: GET must NOT have side-effects!
// Next.js prefetches links, and a GET that clears cookies will log users out unexpectedly.
// Only POST is allowed to clear the session.
export async function GET() {
  // Return 405 Method Not Allowed - do NOT clear session on GET
  // This prevents Next.js prefetch from logging users out
  console.warn('[logout] GET request received - this should not happen. Returning 405.')
  return NextResponse.json(
    { error: 'Method Not Allowed. Use POST to logout.' },
    { status: 405 }
  )
}

export async function POST() {
  console.log('[logout] POST request - clearing session')
  await clearAdminSession()
  return NextResponse.json({ ok: true })
}
