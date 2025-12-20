import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'
import { validateCsrf } from '@/server/admin/csrf'

const SETTINGS_KEY = 'maintenance_mode'

async function getMaintenanceMode(): Promise<boolean> {
  try {
    if (!supabaseAdmin) return false

    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single()

    if (error || !data) return false

    const value = data.value as any
    return value?.enabled === true
  } catch (e) {
    console.error('Failed to get maintenance mode:', e)
    return false
  }
}

async function setMaintenanceMode(enabled: boolean, adminEmail: string): Promise<boolean> {
  try {
    if (!supabaseAdmin) return false

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert(
        {
          key: SETTINGS_KEY,
          value: { enabled },
          updated_by: adminEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (error) {
      console.error('Failed to set maintenance mode:', error)
      return false
    }

    return true
  } catch (e) {
    console.error('Failed to set maintenance mode:', e)
    return false
  }
}

async function logAdminEvent(adminEmail: string, action: string, payload: any) {
  try {
    if (!supabaseAdmin) return

    await supabaseAdmin
      .from('admin_events')
      .insert({
        type: 'MAINTENANCE_MODE_TOGGLE',
        actor: adminEmail,
        payload: { action, ...payload },
      })
  } catch (e) {
    console.error('Failed to log admin event:', e)
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enabled = await getMaintenanceMode()
    return NextResponse.json({ enabled })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // CSRF validation
    const csrfError = validateCsrf(req)
    if (csrfError) {
      console.warn('[settings/maintenance] CSRF validation failed:', csrfError)
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await req.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const success = await setMaintenanceMode(enabled, session.u)

    if (!success) {
      return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
    }

    // Log the action to admin_events
    await logAdminEvent(session.u, 'toggle', { enabled })

    console.log(`[maintenance-mode] ${session.u} toggled maintenance mode to ${enabled}`)

    return NextResponse.json({
      success: true,
      enabled,
    })
  } catch (e: any) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: 'Unhandled error' }, { status: 500 })
  }
}
