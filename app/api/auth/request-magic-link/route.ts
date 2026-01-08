import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url().refine(
    (url) => {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      return url.startsWith(baseUrl)
    },
    'Redirect URL must be on same domain'
  ).optional(),
  first_name: z.string().trim().min(1).optional(),
  tussenvoegsel: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-z\s'\-\/.]*$/, 'tussenvoegsel must be lowercase')
    .optional(),
  last_name: z.string().trim().min(1).optional()
})

function toProperCase(str: string): string {
  if (!str) return str
  // Split on spaces, hyphens, and apostrophes while preserving delimiters
  return str
    .split(/(\s|-|')/)
    .map((part, idx) => {
      // Keep delimiters as-is (even indices are delimiters after split)
      if (idx % 2 === 1) return part
      // Capitalize first letter, lowercase the rest
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join('')
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      // Server misconfigured: safest is to NOT send magic link
      return NextResponse.json({ sent: false, reason: 'SERVER_NOT_CONFIGURED' }, { status: 200 })
    }

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ sent: false, reason: 'INVALID_PAYLOAD' }, { status: 200 })
    }

    // Determine base URL from request origin (most reliable on Vercel)
    // Fall back to env vars, but NEVER to localhost in production
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/')
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    
    // In production, prefer request origin, then env. Never fall back to localhost.
    // In development, allow localhost fallback.
    let baseUrl: string
    if (isProduction) {
      baseUrl = requestOrigin || envBaseUrl || ''
      if (!baseUrl || baseUrl.includes('localhost')) {
        console.error('[magic-link] No valid production base URL. Origin:', requestOrigin, 'Env:', envBaseUrl)
        return NextResponse.json({ sent: false, reason: 'SERVER_NOT_CONFIGURED' }, { status: 200 })
      }
    } else {
      baseUrl = requestOrigin || envBaseUrl || 'http://localhost:3000'
    }
    
    console.log('[magic-link] Using baseUrl:', baseUrl, 'Origin:', requestOrigin, 'Env:', envBaseUrl)

    const email = parsed.data.email.trim().toLowerCase()
    let redirectTo = parsed.data.redirectTo
    const firstName = toProperCase((parsed.data.first_name || '').trim())
    const tussenvoegsel = (parsed.data.tussenvoegsel || '').trim().toLowerCase().replace(/\s+/g, ' ')
    const lastName = toProperCase((parsed.data.last_name || '').trim())

    // Check allowlist: prefer email_normalized, fallback to email
    const { data, error } = await supabaseAdmin
      .from('allowlist')
      .select('id, status, expires_at')
      .eq('email_normalized', email)
      .in('status', ['pending', 'claimed'])
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('request-magic-link allowlist DB error:', error.message)
      return NextResponse.json({ sent: false, reason: 'CHECK_FAILED' }, { status: 200 })
    }

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
        console.error('request-magic-link fallback allowlist DB error:', emailErr.message)
        return NextResponse.json({ sent: false, reason: 'CHECK_FAILED' }, { status: 200 })
      }
      found = byEmail as typeof found
    }

    if (!found) {
      // Not on allowlist
      return NextResponse.json({ sent: false, reason: 'NO_ACCESS' }, { status: 200 })
    }

    if (found.expires_at && new Date(found.expires_at) <= new Date()) {
      return NextResponse.json({ sent: false, reason: 'NO_ACCESS' }, { status: 200 })
    }

    // Allowed → send magic link using anon client
    // baseUrl is already determined above from request origin or env vars
    // If redirectTo not provided, build default and carry names
    if (!redirectTo) {
      const finalTarget = new URL('/quiz', baseUrl)
      if (firstName) finalTarget.searchParams.set('fn', firstName)
      if (tussenvoegsel) finalTarget.searchParams.set('tv', tussenvoegsel)
      if (lastName) finalTarget.searchParams.set('ln', lastName)
      const callbackUrl = new URL('/auth/callback', baseUrl)
      callbackUrl.searchParams.set('redirect', finalTarget.pathname + finalTarget.search)
      redirectTo = callbackUrl.toString()
    } else {
      // redirectTo provided, try to inject fn/ln into its inner 'redirect' param if present
      try {
        const u = new URL(redirectTo)
        const inner = u.searchParams.get('redirect') || '/quiz'
        const innerUrl = new URL(inner, baseUrl)
        if (firstName) innerUrl.searchParams.set('fn', firstName)
        if (tussenvoegsel) innerUrl.searchParams.set('tv', tussenvoegsel)
        if (lastName) innerUrl.searchParams.set('ln', lastName)
        u.searchParams.set('redirect', innerUrl.pathname + innerUrl.search)
        redirectTo = u.toString()
      } catch {
        // Fallback: leave as provided
      }
    }

    let sendErr: any = null
    {
      const res = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      })
      sendErr = (res as any)?.error
    }

    // If the allowlist is valid but the auth user doesn't exist yet, create it via admin API
    // and retry sending the inloglink. This avoids Supabase "confirm signup" emails.
    if (sendErr) {
      const msg = String(sendErr?.message || '').toLowerCase()
      const status = (sendErr as any)?.status

      const isMissingUser =
        status === 404 ||
        msg.includes('user not found') ||
        msg.includes('not found')

      if (isMissingUser && supabaseAdmin) {
        try {
          const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
          })

          if (createErr) {
            const createStatus = (createErr as any)?.status
            if (createStatus !== 422) {
              console.warn('[magic-link] Failed to create missing auth user', {
                email,
                message: (createErr as any)?.message || String(createErr),
                status: createStatus,
              })
            }
          }

          const retry = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
              shouldCreateUser: false,
            },
          })
          sendErr = (retry as any)?.error
        } catch (e: any) {
          console.warn('[magic-link] Failed to create missing auth user (exception)', {
            email,
            error: e?.message || String(e),
          })
        }
      }
    }

    if (sendErr) {
      console.error('request-magic-link send error:', sendErr.message)
      
      // Check if it's a rate limit error from Supabase
      const errorMsg = sendErr.message?.toLowerCase() || ''
      if (errorMsg.includes('rate limit') || errorMsg.includes('too many') || errorMsg.includes('after')) {
        // Extract seconds from error message if possible
        const match = sendErr.message?.match(/(\d+)\s*seconds?/i)
        const seconds = match ? parseInt(match[1]) : 60
        return NextResponse.json({ 
          sent: false, 
          reason: 'SUPABASE_RATE_LIMIT',
          retryAfterSeconds: seconds
        }, { status: 200 })
      }
      
      return NextResponse.json({ sent: false, reason: 'SEND_FAILED' }, { status: 200 })
    }

    // After successful OTP send, create candidate if it doesn't exist
    // We need to get the user from Supabase auth using admin client
    // since signInWithOtp just sends the link, doesn't create session yet
    const fullName = [firstName, tussenvoegsel, lastName].filter(Boolean).join(' ').trim() || email.split('@')[0]
    const QUIZ_ID = '00000000-0000-0000-0000-000000000001'
    
    try {
      // Get user via admin API using listUsers with filter
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listErr) {
        console.error('Failed to list users:', listErr.message)
      } else {
        // Find user by email
        const authUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        
        if (authUser) {
          // User exists, create candidate
          const { error: insertErr } = await supabaseAdmin
            .from('candidates')
            .insert({
              user_id: authUser.id,
              quiz_id: QUIZ_ID,
              email: email,
              full_name: fullName
            })
            .select('id')
            .single()

          if (insertErr && (insertErr as any).code !== '23505') {
            // 23505 = unique violation (candidate already exists, which is fine)
            console.error('Failed to create candidate:', insertErr)
          } else if (!insertErr) {
            console.log('Candidate created successfully for:', email)
          }
        } else {
          console.log('User not found in auth for email:', email)
        }
      }
    } catch (e) {
      console.error('Exception creating candidate:', e)
    }

    return NextResponse.json({ sent: true })
  } catch (e: any) {
    console.error('request-magic-link unhandled:', e?.message || String(e))
    return NextResponse.json({ sent: false, reason: 'UNHANDLED' }, { status: 200 })
  }
}
