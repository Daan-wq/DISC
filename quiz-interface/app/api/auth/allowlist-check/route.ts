import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

const BodySchema = z.object({
  email: z.string().email(),
})

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 5 // 5 attempts per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ eligible: false }, { status: 200 })
    }

    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ eligible: false }, { status: 200 })
    }
    const email = parsed.data.email.trim().toLowerCase()

    // Rate limiting by hashed email
    const emailHash = crypto.createHash('sha256').update(email).digest('hex')
    if (!checkRateLimit(emailHash)) {
      console.warn(`Rate limit exceeded for email hash: ${emailHash.substring(0, 8)}...`)
      return NextResponse.json({ eligible: false }, { status: 429 })
    }

    // Log check attempt (privacy-safe)
    console.log(`Allowlist pre-check for email hash: ${emailHash.substring(0, 8)}...`)

    // First check if email exists with 'used' status
    const { data: usedCheck, error: usedError } = await supabaseAdmin
      .from('allowlist')
      .select('id, status')
      .eq('email_normalized', email)
      .eq('status', 'used')
      .limit(1)
      .maybeSingle()

    if (!usedError && usedCheck) {
      return NextResponse.json({ eligible: false, reason: 'ALREADY_USED' }, { status: 200 })
    }

    // Accept global allowlist rows (quiz_id IS NULL) or any quiz-specific row
    const { data, error } = await supabaseAdmin
      .from('allowlist')
      .select('id, status, expires_at')
      .eq('email_normalized', email)
      .in('status', ['pending', 'claimed'])
      .limit(1)
      .maybeSingle()

    if (error) {
      // Do not leak DB details to client
      console.error('Allowlist check DB error:', error.message)
      return NextResponse.json({ eligible: false }, { status: 200 })
    }

    // Fallback: some old rows might only have `email` populated
    let found = data as { id: string; status: string; expires_at: string | null } | null
    if (!found) {
      const { data: byEmail, error: emailErr } = await supabaseAdmin
        .from('allowlist')
        .select('id, status, expires_at')
        .eq('email', email)
        .in('status', ['pending', 'claimed'])
        .limit(1)
        .maybeSingle()

      if (emailErr) {
        console.error('Allowlist fallback check DB error:', emailErr.message)
        return NextResponse.json({ eligible: false }, { status: 200 })
      }
      found = byEmail as typeof found
    }

    if (!found) {
      return NextResponse.json({ eligible: false }, { status: 200 })
    }

    if (found.expires_at && new Date(found.expires_at) <= new Date()) {
      return NextResponse.json({ eligible: false }, { status: 200 })
    }

    return NextResponse.json({ eligible: true })
  } catch (e) {
    console.error('Allowlist check error:', e)
    return NextResponse.json({ eligible: false }, { status: 200 })
  }
}
