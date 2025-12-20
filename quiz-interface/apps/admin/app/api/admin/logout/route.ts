import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/server/admin/session'

export async function GET() {
  clearAdminSession()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
}

export async function POST() {
  clearAdminSession()
  return NextResponse.json({ ok: true })
}
