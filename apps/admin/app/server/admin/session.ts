import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE_NAME = 'admin_session'
const ADMIN_COOKIE_PATH = process.env.ADMIN_COOKIE_PATH || '/'
const ADMIN_COOKIE_DOMAIN = process.env.ADMIN_COOKIE_DOMAIN || ''

export interface AdminSessionPayload {
  u: string
  exp: number
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
  try {
    const secret = getSecret()
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [data, sig] = parts
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url')

    const sigBuffer = Buffer.from(sig)
    const expectedBuffer = Buffer.from(expected)
    if (sigBuffer.length !== expectedBuffer.length) return null
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null

    const json = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AdminSessionPayload
    if (typeof json.exp !== 'number' || Date.now() > json.exp) return null
    if (typeof json.u !== 'string' || !json.u) return null

    return json
  } catch {
    return null
  }
}

export function createSessionCookie(username: string, ttlMinutes: number): string {
  const payload: AdminSessionPayload = {
    u: username,
    exp: Date.now() + ttlMinutes * 60 * 1000,
  }
  const token = sign(payload)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const domain = ADMIN_COOKIE_DOMAIN ? `; Domain=${ADMIN_COOKIE_DOMAIN}` : ''
  return `${COOKIE_NAME}=${token}; Path=${ADMIN_COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${ttlMinutes * 60}${secure}${domain}`
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
