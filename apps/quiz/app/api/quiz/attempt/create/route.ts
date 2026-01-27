import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { QUIZ_ID } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        console.log('[attempt/create] START')

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
        }

        const authHeader = req.headers.get('authorization') || ''
        const token = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : null

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userRes } = await supabase.auth.getUser(token)
        const user = userRes?.user

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[attempt/create] user:', user.id)

        // Create attempt with service role (bypasses RLS)
        const { data, error } = await supabaseAdmin
            .from('quiz_attempts')
            .insert({
                quiz_id: QUIZ_ID,
                user_id: user.id,
                started_at: new Date().toISOString()
            })
            .select('id, quiz_id')
            .single()

        if (error) {
            console.error('[attempt/create] error:', error)

            // If unique violation, fetch existing
            if ((error as any).code === '23505') {
                console.log('[attempt/create] unique violation - fetching existing attempt')
                const { data: found, error: fetchErr } = await supabaseAdmin
                    .from('quiz_attempts')
                    .select('id, quiz_id')
                    .eq('user_id', user.id)
                    .eq('quiz_id', QUIZ_ID)
                    .maybeSingle()

                if (fetchErr) {
                    console.error('[attempt/create] failed to fetch existing:', fetchErr)
                    return NextResponse.json({ error: 'Failed to fetch existing attempt' }, { status: 500 })
                }

                if (found) {
                    console.log('[attempt/create] found existing:', found.id)
                    return NextResponse.json({ id: found.id, quiz_id: found.quiz_id })
                } else {
                    console.error('[attempt/create] unique violation but no existing attempt found')
                    return NextResponse.json({ error: 'Duplicate key but no existing attempt' }, { status: 500 })
                }
            }

            return NextResponse.json({ error: 'Failed to create attempt' }, { status: 500 })
        }

        console.log('[attempt/create] created:', data?.id)
        return NextResponse.json({ id: data!.id, quiz_id: data!.quiz_id })
    } catch (e: any) {
        console.error('[attempt/create] exception:', e?.message)
        return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
    }
}
