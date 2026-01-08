import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    now: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || null,
    vercel: {
      env: process.env.VERCEL_ENV || null,
      url: process.env.VERCEL_URL || null,
      region: process.env.VERCEL_REGION || null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    },
    git: {
      sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      ref: process.env.VERCEL_GIT_COMMIT_REF || null,
      message: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
    },
  })
}
