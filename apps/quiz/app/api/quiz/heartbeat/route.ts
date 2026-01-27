import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { QUIZ_ID } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
    quiz_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
        }

        // Auth via Authorization: Bearer <token>
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

        const json = await req.json().catch(() => ({}))
        const parsed = BodySchema.safeParse(json)
        const quizId = (parsed.success && parsed.data.quiz_id) || QUIZ_ID

        const { error } = await supabaseAdmin.from('quiz_activity').upsert({
            user_id: user.id,
            quiz_id: quizId,
            heartbeat_at: new Date().toISOString(),
        })
        if (error) {
            return NextResponse.json({ error: 'Upsert failed' }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
    }
}
