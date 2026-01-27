import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE_NAME = 'admin_session'
// Cookie path - default '/' for standalone admin app, '/admin' for main app
const ADMIN_COOKIE_PATH = process.env.ADMIN_COOKIE_PATH || '/'
// Cookie domain - optional, only set if ADMIN_COOKIE_DOMAIN is explicitly configured
// Leave empty for automatic host scoping (e.g., disc-admin.vercel.app)
const ADMIN_COOKIE_DOMAIN = process.env.ADMIN_COOKIE_DOMAIN || ''

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

/**
 * Creates the session token and cookie string for use in Response headers.
 * Use this in API routes where cookies().set() doesn't work reliably on Vercel.
 */
export function createSessionCookie(username: string, ttlMinutes: number): string {
  const payload: AdminSessionPayload = {
    u: username,
    exp: Date.now() + ttlMinutes * 60 * 1000,
  }
  const token = sign(payload)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const domain = ADMIN_COOKIE_DOMAIN ? `; Domain=${ADMIN_COOKIE_DOMAIN}` : ''
  const cookie = `${COOKIE_NAME}=${token}; Path=${ADMIN_COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${ttlMinutes * 60}${secure}${domain}`
  console.log('[session] Created cookie for user:', username, 'ttl:', ttlMinutes, 'minutes', 'domain:', ADMIN_COOKIE_DOMAIN || '(auto)', 'secure:', !!secure, 'path:', ADMIN_COOKIE_PATH)
  return cookie
}

/**
 * @deprecated Use createSessionCookie() in API routes instead.
 * This function uses cookies() which doesn't work reliably in API routes on Vercel.
 */
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
