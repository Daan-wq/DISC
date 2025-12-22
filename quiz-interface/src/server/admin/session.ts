import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE_NAME = 'admin_session'
// Cookie path - default '/' for standalone admin app, '/admin' for main app
const ADMIN_COOKIE_PATH = process.env.ADMIN_COOKIE_PATH || '/'
// NOTE: We intentionally do NOT set a cookie domain.
// This makes the cookie automatically scoped to the exact host (e.g., disc-admin.vercel.app)
// Setting a domain like 'tlcprofielen.nl' would break cookies on vercel.app domains.

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
  if (!token) {
    console.log('[session] No token provided')
    return null
  }
  try {
    const secret = getSecret()
    const parts = token.split('.')
    if (parts.length !== 2) {
      console.log('[session] Invalid token format')
      return null
    }
    const [data, sig] = parts
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url')
    
    // timingSafeEqual requires same length buffers
    const sigBuffer = Buffer.from(sig)
    const expectedBuffer = Buffer.from(expected)
    if (sigBuffer.length !== expectedBuffer.length) {
      console.log('[session] Signature length mismatch')
      return null
    }
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.log('[session] Signature verification failed')
      return null
    }
    
    const json = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AdminSessionPayload
    if (typeof json.exp !== 'number' || Date.now() > json.exp) {
      console.log('[session] Token expired')
      return null
    }
    if (typeof json.u !== 'string' || !json.u) {
      console.log('[session] Invalid username in token')
      return null
    }
    return json
  } catch (e) {
    console.log('[session] Verification error:', e)
    return null
  }
}

export async function setAdminSession(username: string, ttlMinutes: number) {
  const payload: AdminSessionPayload = {
    u: username,
    exp: Date.now() + ttlMinutes * 60 * 1000,
  }
  const token = sign(payload)
  console.log('[session] Setting session for user:', username, 'ttl:', ttlMinutes, 'minutes')
  const store = await cookies()
  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: ADMIN_COOKIE_PATH,
    maxAge: ttlMinutes * 60,
    // No domain set - cookie is automatically scoped to the current host
  })
  console.log('[session] Cookie set successfully')
}

export async function clearAdminSession() {
  const store = await cookies()
  store.set({ name: COOKIE_NAME, value: '', path: ADMIN_COOKIE_PATH, maxAge: 0 })
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  console.log('[session] Getting session, cookie present:', !!token)
  const result = verify(token)
  console.log('[session] Session valid:', !!result)
  return result
}

export { COOKIE_NAME }
