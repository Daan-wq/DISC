import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE_NAME = 'admin_session'
// Domain for admin cookie - only set in production to restrict to admin subdomain
const ADMIN_COOKIE_DOMAIN = process.env.ADMIN_COOKIE_DOMAIN || undefined
// Cookie path - default '/' for standalone admin app, '/admin' for main app
const ADMIN_COOKIE_PATH = process.env.ADMIN_COOKIE_PATH || '/'

export interface AdminSessionPayload {
  u: string // username
  exp: number // epoch ms
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || ''
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SESSION_SECRET missing or too short')
  }
  return secret
}

export function sign(payload: AdminSessionPayload): string {
  const secret = getSecret()
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${hmac}`
}

export function verify(token: string | undefined | null): AdminSessionPayload | null {
  if (!token) return null
  const secret = getSecret()
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [data, sig] = parts
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const json = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AdminSessionPayload
    if (typeof json.exp !== 'number' || Date.now() > json.exp) return null
    if (typeof json.u !== 'string' || !json.u) return null
    return json
  } catch {
    return null
  }
}

export async function setAdminSession(username: string, ttlMinutes: number) {
  const payload: AdminSessionPayload = {
    u: username,
    exp: Date.now() + ttlMinutes * 60 * 1000,
  }
  const token = sign(payload)
  const store = await cookies()
  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: ADMIN_COOKIE_PATH,
    maxAge: ttlMinutes * 60,
    ...(ADMIN_COOKIE_DOMAIN && { domain: ADMIN_COOKIE_DOMAIN }),
  })
}

export async function clearAdminSession() {
  const store = await cookies()
  store.set({ name: COOKIE_NAME, value: '', path: ADMIN_COOKIE_PATH, maxAge: 0 })
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return verify(token)
}

export { COOKIE_NAME }
