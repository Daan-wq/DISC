import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../server/admin/session'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session || !session.u) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = authenticator.generateSecret()

    const otpauthUrl = authenticator.keyuri(session.u, 'DISC Quiz Admin Dashboard', secret)
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    return NextResponse.json({
      secret,
      qrCode,
      message: 'Scan this QR code with your authenticator app',
    })
  } catch (e) {
    console.error('[2fa-generate] Error:', e)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}