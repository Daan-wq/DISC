/**
 * In-memory rate limiter with IP and identifier support
 * For production, use Redis instead
 */

interface RateLimitRecord {
  count: number
  resetAt: number
  lastAttempt: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

/**
 * Check if request should be rate limited
 * @param identifier Unique identifier (IP, email hash, etc)
 * @param maxAttempts Maximum attempts allowed
 * @param windowMs Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 1000
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // New identifier or window expired
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
      lastAttempt: now,
    })
    return true
  }

  // Check if limit exceeded
  if (record.count >= maxAttempts) {
    record.lastAttempt = now
    return false
  }

  // Increment and allow
  record.count++
  record.lastAttempt = now
  return true
}

/**
 * Get remaining attempts for an identifier
 */
export function getRemainingAttempts(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 1000
): number {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetAt) {
    return maxAttempts
  }

  return Math.max(0, maxAttempts - record.count)
}

/**
 * Get time until rate limit resets (in seconds)
 */
export function getResetTime(identifier: string): number {
  const record = rateLimitMap.get(identifier)
  if (!record) return 0

  const now = Date.now()
  const remaining = record.resetAt - now
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

/**
 * Clear rate limit for an identifier (admin function)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier)
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return 'unknown'
}
