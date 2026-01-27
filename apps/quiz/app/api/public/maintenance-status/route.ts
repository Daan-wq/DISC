import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SETTINGS_KEY = 'maintenance_mode'

export async function GET(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ enabled: false })
        }

        const { data, error } = await supabaseAdmin
            .from('admin_settings')
            .select('value')
            .eq('key', SETTINGS_KEY)
            .single()

        if (error || !data) {
            return NextResponse.json({ enabled: false })
        }

        const value = data.value as any
        const enabled = value?.enabled === true

        return NextResponse.json({ enabled })
    } catch (e) {
        console.error('Failed to check maintenance status:', e)
        return NextResponse.json({ enabled: false })
    }
}
