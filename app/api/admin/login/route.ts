import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { setAdminSession } from '@/server/admin/session'
import { readFileSync } from 'fs'
import { join } from 'path'
import { checkRateLimit, getClientIp, getResetTime } from '@/lib/rate-limiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  username: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { username, password, turnstileToken } = parsed.data
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

    // Rate limiting: 5 attempts per IP per 15 minutes (skip if whitelisted)
    const ipLimitKey = `login:ip:${clientIp}`
    if (!isWhitelisted && !checkRateLimit(ipLimitKey, 5, 15 * 60 * 1000)) {
      const resetTime = getResetTime(ipLimitKey)
      console.warn(`[login] Rate limit exceeded for IP: ${clientIp}`)
      await logEvent('admin_login_blocked', 'unknown', { reason: 'rate_limit_ip', ip: clientIp })
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.', retryAfter: resetTime },
        { status: 429, headers: { 'Retry-After': resetTime.toString() } }
      )
    }

    // Rate limiting: 3 attempts per username per 15 minutes
    const usernameLimitKey = `login:user:${submittedUser}`
    if (!checkRateLimit(usernameLimitKey, 3, 15 * 60 * 1000)) {
      const resetTime = getResetTime(usernameLimitKey)
      console.warn(`[login] Rate limit exceeded for username: ${submittedUser}`)
      await logEvent('admin_login_blocked', submittedUser, { reason: 'rate_limit_user' })
      return NextResponse.json(
        { error: 'Too many login attempts for this account. Try again later.', retryAfter: resetTime },
        { status: 429, headers: { 'Retry-After': resetTime.toString() } }
      )
    }

    // Verify Turnstile
    const secret = process.env.TURNSTILE_SECRET_KEY || ''
    const bypass = process.env.TURNSTILE_BYPASS === '1'
    if (!secret && !bypass) {
      return NextResponse.json({ error: 'Turnstile not configured' }, { status: 500 })
    }

    const ip = req.headers.get('x-forwarded-for') || undefined
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || ''
    const form = new URLSearchParams()
    form.set('secret', secret)
    form.set('response', turnstileToken)
    if (ip) form.set('remoteip', ip)
    if (sitekey) form.set('sitekey', sitekey)

    if (!bypass) {
      if (!turnstileToken || turnstileToken.length < 10) {
        return NextResponse.json({ error: 'Captcha token missing' }, { status: 400 })
      }
      const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      })
      const verify = await resp.json().catch(() => ({} as any))
      if (!verify?.success) {
        const codes = (verify && (verify['error-codes'] || verify['error_codes'])) || []
        // Log minimal details for debugging (no secrets)
        console.error('[turnstile-verify-failed]', { codes, hostname: verify?.hostname })
        return NextResponse.json({ error: 'Captcha verification failed', code: 'turnstile_failed', details: { codes, hostname: verify?.hostname || null } }, { status: 403 })
      }
    }

    const expectedUser = (process.env.ADMIN_USERNAME || 'info@echooo.nl').trim().toLowerCase()
    let rawHash = process.env.ADMIN_PASSWORD_BCRYPT || ''
    let hash = rawHash.replace(/^['"]|['"]$/g, '').trim()
    
    // Fallback: if hash doesn't start with $2, try reading from .admin-hash file
    if (!hash.startsWith('$2')) {
      try {
        const hashFilePath = join(process.cwd(), '.admin-hash')
        hash = readFileSync(hashFilePath, 'utf-8').trim()
      } catch (e) {
        console.error('[ERROR] Could not load admin hash from file')
      }
    }
    
    if (!hash || !hash.startsWith('$2')) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 })
    }

    if (submittedUser !== expectedUser) {
      await logEvent('admin_login_failed', username, { reason: 'wrong_username' })
      return NextResponse.json({ error: 'Unauthorized', code: 'wrong_username' }, { status: 401 })
    }

    let ok = await bcrypt.compare(password, hash)
    if (!ok && password.trim() !== password) {
      ok = await bcrypt.compare(password.trim(), hash)
    }
    
    if (!ok) {
      await logEvent('admin_login_failed', username, { reason: 'wrong_password' })
      return NextResponse.json({ error: 'Unauthorized', code: 'wrong_password' }, { status: 401 })
    }

    const ttl = parseInt(process.env.ADMIN_SESSION_TTL_MINUTES || '480', 10)
    await setAdminSession(expectedUser, ttl)
    await logEvent('admin_login_success', expectedUser, {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}

async function logEvent(type: string, actor: string, payload: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    if (!supabaseAdmin) return
    await supabaseAdmin.from('admin_events').insert({ type, actor, payload })
  } catch {}
}
