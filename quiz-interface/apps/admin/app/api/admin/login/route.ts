import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createSessionCookie } from '../../../server/admin/session'
import { checkRateLimit, getClientIp, getResetTime, getRemainingAttempts } from '../../../lib/rate-limiter'
import { authenticator } from 'otplib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  username: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.preprocess((v) => (v === null ? undefined : v), z.string().optional().default('')),
  totpCode: z.preprocess((v) => (v === null ? undefined : v), z.string().optional().default('')),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { username, password, turnstileToken, totpCode } = parsed.data
    const submittedUser = username.trim().toLowerCase()

    const clientIp = getClientIp(req.headers)
    console.log(`[login] Attempt from IP: ${clientIp}`)

    // Check IP whitelist (if configured)
    const ipWhitelist = (process.env.ADMIN_IP_WHITELIST || '').split(',').map(ip => ip.trim()).filter(Boolean)
    const isWhitelisted = ipWhitelist.length > 0 && ipWhitelist.includes(clientIp)
    
    if (ipWhitelist.length > 0 && !isWhitelisted) {
      console.warn(`[login] IP not whitelisted: ${clientIp}`)
      await logEvent('admin_login_blocked', 'unknown', { reason: 'ip_not_whitelisted', ip: clientIp })
      return NextResponse.json(
        { error: 'Access denied: IP not whitelisted' },
        { status: 403 }
      )
    }

    // Rate limit keys
    const ipLimitKey = `login:ip:${clientIp}`
    const usernameLimitKey = `login:user:${submittedUser}`

    // Check if already rate limited
    const isIpRateLimited = () => !isWhitelisted && getRemainingAttempts(ipLimitKey, 5, 15 * 60 * 1000) <= 0
    const isUserRateLimited = () => getRemainingAttempts(usernameLimitKey, 5, 15 * 60 * 1000) <= 0

    if (isIpRateLimited()) {
      const resetTime = getResetTime(ipLimitKey)
      console.warn(`[login] Rate limit exceeded for IP: ${clientIp}`)
      await logEvent('admin_login_blocked', 'unknown', { reason: 'rate_limit_ip', ip: clientIp })
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.', retryAfter: resetTime },
        { status: 429, headers: { 'Retry-After': resetTime.toString() } }
      )
    }

    if (isUserRateLimited()) {
      const resetTime = getResetTime(usernameLimitKey)
      console.warn(`[login] Rate limit exceeded for username: ${submittedUser}`)
      await logEvent('admin_login_blocked', submittedUser, { reason: 'rate_limit_user' })
      return NextResponse.json(
        { error: 'Too many login attempts for this account. Try again later.', retryAfter: resetTime },
        { status: 429, headers: { 'Retry-After': resetTime.toString() } }
      )
    }

    const incrementRateLimits = () => {
      if (!isWhitelisted) checkRateLimit(ipLimitKey, 5, 15 * 60 * 1000)
      checkRateLimit(usernameLimitKey, 5, 15 * 60 * 1000)
    }

    // Verify Turnstile (only on initial credentials step)
    const is2FAStep = totpCode && totpCode.length > 0
    const secret = process.env.TURNSTILE_SECRET_KEY || ''
    const isLocalhost = clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === 'localhost'
    const isDevelopment = process.env.NODE_ENV === 'development'
    const skipTurnstile = is2FAStep || (isDevelopment && (isLocalhost || clientIp === 'unknown'))
    
    if (!skipTurnstile && !secret) {
      return NextResponse.json({ error: 'Turnstile not configured' }, { status: 500 })
    }

    if (!skipTurnstile) {
      if (!turnstileToken || turnstileToken.length < 10) {
        return NextResponse.json({ error: 'Captcha token missing', code: 'captcha_token_missing' }, { status: 400 })
      }
      
      const ip = req.headers.get('x-forwarded-for') || undefined
      const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || ''
      const form = new URLSearchParams()
      form.set('secret', secret)
      form.set('response', turnstileToken)
      if (ip) form.set('remoteip', ip)
      if (sitekey) form.set('sitekey', sitekey)

      const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      })
      const verify = await resp.json().catch(() => ({} as any))
      if (!verify?.success) {
        const codes = (verify && (verify['error-codes'] || verify['error_codes'])) || []
        console.error('[turnstile-verify-failed]', { codes, hostname: verify?.hostname })
        return NextResponse.json({ error: 'Captcha verification failed', code: 'turnstile_failed', details: { codes, hostname: verify?.hostname || null } }, { status: 403 })
      }
    }

    // Fetch admin from database
    const { supabaseAdmin } = await import('../../../lib/supabase')
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, password_hash, totp_secret, totp_enabled')
      .eq('email', submittedUser)
      .maybeSingle()

    if (fetchError || !admin) {
      incrementRateLimits()
      await logEvent('admin_login_failed', username, { reason: 'user_not_found' })
      return NextResponse.json({ error: 'Unauthorized', code: 'user_not_found' }, { status: 401 })
    }

    // Verify password
    const passwordOk = await bcrypt.compare(password, admin.password_hash)
    if (!passwordOk) {
      incrementRateLimits()
      await logEvent('admin_login_failed', username, { reason: 'wrong_password' })
      return NextResponse.json({ error: 'Unauthorized', code: 'wrong_password' }, { status: 401 })
    }

    // Verify 2FA if enabled
    if (admin.totp_enabled) {
      if (!totpCode || totpCode.length !== 6) {
        return NextResponse.json({ error: '2FA code required', code: 'totp_required' }, { status: 401 })
      }

      const totpValid = authenticator.check(totpCode, admin.totp_secret)
      if (!totpValid) {
        incrementRateLimits()
        await logEvent('admin_login_failed', username, { reason: 'invalid_totp' })
        return NextResponse.json({ error: 'Invalid 2FA code', code: 'invalid_totp' }, { status: 401 })
      }
    }

    // Update last_login_at
    void supabaseAdmin
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id)

    const ttl = parseInt(process.env.ADMIN_SESSION_TTL_MINUTES || '480', 10)
    console.log('[login] Creating session cookie for user:', submittedUser, 'TTL:', ttl, 'minutes')
    console.log('[login] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
    
    // Use Set-Cookie header only - more reliable than cookies() API
    // Note: Do NOT use both methods as they create different tokens (different timestamps)
    const sessionCookie = createSessionCookie(submittedUser, ttl)
    console.log('[login] Full Set-Cookie header:', sessionCookie)
    await logEvent('admin_login_success', submittedUser, {})

    // Create response with Set-Cookie header
    const response = new NextResponse(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': sessionCookie,
        },
      }
    )
    console.log('[login] Response created, Set-Cookie header in response:', response.headers.get('Set-Cookie'))
    return response
  } catch (e) {
    console.error('[login] Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}

async function logEvent(type: string, actor: string, payload: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import('../../../lib/supabase')
    if (!supabaseAdmin) return
    await supabaseAdmin.from('admin_events').insert({ type, actor, payload })
  } catch {}
}