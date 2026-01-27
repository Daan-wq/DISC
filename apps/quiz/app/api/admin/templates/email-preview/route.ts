import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/server/admin/session'
import { generateEmailHtml, generateEmailText } from '@/server/email/mailer'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name') || 'Voorbeeld'
    const company = process.env.COMPANY_NAME || 'The Lean Communication'
    const year = new Date().getFullYear()
    const html = generateEmailHtml({ name, year, company })
    const text = generateEmailText({ name, year, company })
    return NextResponse.json({ html, text })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}
