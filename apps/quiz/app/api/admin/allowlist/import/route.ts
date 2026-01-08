import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Entry = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  quiz_id: z.string().uuid(),
  expires_at: z.string().datetime().optional().nullable(),
})

const BodySchema = z.object({
  entries: z.array(Entry).min(1)
})

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    // Require authenticated caller; you can extend to check for admin role
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRes } = await supabase.auth.getUser(token)
    if (!userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })

    // Normalize emails and upsert
    const rows = parsed.data.entries.map(e => {
      const normalized = e.email.trim().toLowerCase()
      return {
        email: normalized,
        full_name: e.full_name || null,
        quiz_id: e.quiz_id,
        expires_at: e.expires_at || null,
        status: 'pending' as const,
      }
    })

    const { data, error } = await supabaseAdmin
      .from('allowlist')
      .upsert(rows, { onConflict: 'email_normalized,quiz_id' })
      .select('id')

    if (error) return NextResponse.json({ error: 'Upsert failed', details: error.message }, { status: 500 })

    // Ensure auth users exist so login can always use the inloglink email (no signup confirmation)
    for (const row of rows) {
      try {
        const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: row.email,
          email_confirm: true,
        })

        if (createErr) {
          const status = (createErr as any)?.status
          if (status !== 422) {
            console.warn('[allowlist/import] Failed to ensure auth user exists', {
              email: row.email,
              message: (createErr as any)?.message || String(createErr),
              status,
            })
          }
        }
      } catch (e) {
        console.warn('[allowlist/import] Failed to ensure auth user exists (exception)', {
          email: row.email,
          error: (e as any)?.message || String(e),
        })
      }
    }

    return NextResponse.json({ ok: true, upserted: data?.length || 0 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unhandled', details: e?.message || String(e) }, { status: 500 })
  }
}

