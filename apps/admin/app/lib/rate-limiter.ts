interface RateLimitRecord {
  count: number
  resetAt: number
  lastAttempt: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 1000
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
      lastAttempt: now,
    })
    return true
  }

  if (record.count >= maxAttempts) {
    record.lastAttempt = now
    return false
  }

  record.count++
  record.lastAttempt = now
  return true
}

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

export function getResetTime(identifier: string): number {
  const record = rateLimitMap.get(identifier)
  if (!record) return 0

  const now = Date.now()
  const remaining = record.resetAt - now
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier)
}

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
