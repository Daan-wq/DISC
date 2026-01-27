/**
 * /api/debug/ping - Super simple health check endpoint
 * 
 * Router root: apps/quiz/app/api (NOT root app/api)
 * This is because package.json build script uses: pnpm --filter=quiz run build
 * 
 * Purpose: Verify API routes are reachable on Vercel
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  console.log('[debug/ping] Request received')
  
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    vercel: {
      isVercel: !!process.env.VERCEL,
      env: process.env.VERCEL_ENV || null,
      region: process.env.VERCEL_REGION || null,
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  })
}
