import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/src/server/admin/session'

export async function POST() {
  clearAdminSession()
  return NextResponse.json({ ok: true })
}
