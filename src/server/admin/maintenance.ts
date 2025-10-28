import { supabaseAdmin } from '@/lib/supabase'

const SETTINGS_KEY = 'maintenance_mode'

export async function getMaintenanceMode(): Promise<boolean> {
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

export async function setMaintenanceMode(enabled: boolean, adminEmail: string): Promise<boolean> {
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
