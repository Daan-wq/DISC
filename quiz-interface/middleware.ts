import { NextRequest, NextResponse } from 'next/server'

// Host isolation configuration
// Include Vercel domains for deployment
const QUIZ_HOSTS = (process.env.QUIZ_HOSTS || 'quiz.tlcprofielen.nl,localhost,disc-quiz.vercel.app').split(',').map(h => h.trim().toLowerCase())
const ADMIN_HOSTS = (process.env.ADMIN_HOSTS || 'admin.tlcprofielen.nl,disc-admin.vercel.app').split(',').map(h => h.trim().toLowerCase())

// Paths that should only be accessible on specific hosts
const ADMIN_PATHS = ['/admin', '/api/admin']
const QUIZ_PATHS = ['/quiz', '/api/quiz', '/api/answers', '/api/candidates', '/api/auth', '/api/documents', '/login', '/auth', '/result', '/no-access']

function getHostWithoutPort(host: string | null): string {
  if (!host) return ''
  return host.split(':')[0].toLowerCase()
}

function isAdminHost(host: string): boolean {
  return ADMIN_HOSTS.includes(host)
}

function isQuizHost(host: string): boolean {
  return QUIZ_HOSTS.includes(host)
}

function pathStartsWith(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
}

export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const host = getHostWithoutPort(req.headers.get('host'))
  const pathname = req.nextUrl.pathname

  // Local development: allow using both quiz + admin routes on localhost.
  // Host isolation is meant for production subdomains.
  if (host === 'localhost' || host === '127.0.0.1') {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-request-id', requestId)
    requestHeaders.set('x-host-type', 'local')
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('x-request-id', requestId)
    return response
  }

  // Host isolation: block cross-host access
  if (isQuizHost(host) && pathStartsWith(pathname, ADMIN_PATHS)) {
    // Quiz host cannot access admin routes
    console.warn(`[middleware] Blocked admin path on quiz host: ${host}${pathname}`)
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: { 'x-request-id': requestId } }
    )
  }

  if (isAdminHost(host) && pathStartsWith(pathname, QUIZ_PATHS)) {
    // Admin host cannot access quiz routes - redirect to admin login
    console.warn(`[middleware] Blocked quiz path on admin host: ${host}${pathname}`)
    const adminLoginUrl = new URL('/admin/login', req.url)
    const response = NextResponse.redirect(adminLoginUrl)
    response.headers.set('x-request-id', requestId)
    return response
  }

  // Clone request headers to add request ID and host info for downstream handlers
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set('x-host-type', isAdminHost(host) ? 'admin' : isQuizHost(host) ? 'quiz' : 'unknown')

  // Create response with request ID header for tracing
  const response = NextResponse.next({
    request: { headers: requestHeaders }
  })
  response.headers.set('x-request-id', requestId)

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
