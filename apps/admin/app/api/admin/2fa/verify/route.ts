import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/server/admin/session'
import { authenticator } from 'otplib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory store for temporary TOTP secrets during setup
// In production, use Redis or database
const tempSecrets = new Map<string, { secret: string; createdAt: number }>()

const BodySchema = z.object({
  totpCode: z.string().length(6).regex(/^\d+$/),
  secret: z.string() // The secret from the QR code generation
})

export async function POST(req: NextRequest) {
  try {
    // Check admin session
    const session = await getAdminSession()
    if (!session || !session.u) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { totpCode, secret } = parsed.data

    // Verify the TOTP code against the provided secret
    const isValid = authenticator.check(totpCode, secret)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 })
    }

    // Get admin from database
    const { supabaseAdmin } = await import('@/lib/supabase')
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', session.u.toLowerCase())
      .maybeSingle()

    if (fetchError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Save the secret and enable 2FA
    const { error: updateError } = await supabaseAdmin
      .from('admin_users')
      .update({
        totp_secret: secret,
        totp_enabled: true
      })
      .eq('id', admin.id)

    if (updateError) {
      console.error('[2fa-verify] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save 2FA settings' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: '2FA enabled successfully'
    })
  } catch (e) {
    console.error('[2fa-verify] Error:', e)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
