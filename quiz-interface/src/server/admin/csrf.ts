import { NextRequest } from 'next/server'

// Allowed origins for admin state-changing requests
const ALLOWED_ORIGINS = (process.env.ADMIN_ALLOWED_ORIGINS || 'https://admin.tlcprofielen.nl').split(',').map(o => o.trim().toLowerCase())

// In development, also allow localhost
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://127.0.0.1:3000')
}

/**
 * Validates Origin/Referer header for CSRF protection on state-changing requests.
 * Returns null if valid, or an error message if invalid.
 */
export function validateCsrf(req: NextRequest): string | null {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  // For same-origin requests, browser may not send Origin header
  // In that case, check Referer
  if (!origin && !referer) {
    // No origin or referer - could be same-origin or non-browser client
    // For extra security, we require at least one of these headers
    // But allow if it's a localhost request in development
    if (process.env.NODE_ENV === 'development') {
      const host = req.headers.get('host') || ''
      if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
        return null // Allow in dev
      }
    }
    return 'Missing Origin or Referer header'
  }
  
  // Validate Origin if present
  if (origin) {
    const normalizedOrigin = origin.toLowerCase()
    if (!ALLOWED_ORIGINS.some(allowed => normalizedOrigin === allowed || normalizedOrigin.startsWith(allowed))) {
      return `Invalid Origin: ${origin}`
    }
    return null // Valid
  }
  
  // Validate Referer if Origin not present
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`.toLowerCase()
      if (!ALLOWED_ORIGINS.some(allowed => refererOrigin === allowed || refererOrigin.startsWith(allowed))) {
        return `Invalid Referer origin: ${refererOrigin}`
      }
      return null // Valid
    } catch {
      return `Invalid Referer format: ${referer}`
    }
  }
  
  return null // Should not reach here
}

/**
 * Quick check if request is from allowed origin.
 * Use in route handlers for state-changing operations.
 */
export function isCsrfValid(req: NextRequest): boolean {
  return validateCsrf(req) === null
}
