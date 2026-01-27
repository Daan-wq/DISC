import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/server/admin/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const status = searchParams.get('status') || undefined
    const theme = searchParams.get('theme') || undefined
    
    // Query allowlist items
    let query = supabaseAdmin.from('allowlist').select('id, email, email_normalized, full_name, status, trainer_email, send_pdf_user, send_pdf_trainer, testgroup, theme, created_at').order('created_at', { ascending: false }).limit(200)

    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.in('status', ['pending', 'claimed', 'used'])
    }
    if (theme) query = query.eq('theme', theme)
    if (q) {
      // Use ilike on email and full_name
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
    
    const items = data || []
    
    // Haal alle users op (één keer)
    const { data: userData } = await supabaseAdmin!.auth.admin.listUsers()
    const users = userData?.users || []
    
    // Maak een map van email -> user_id
    const emailToUserId = new Map<string, string>(
      users.map(u => [u.email?.toLowerCase() || '', u.id] as [string, string])
    )
    
    // Voor elk allowlist item, check of er een quiz attempt is met alert
    const itemsWithAlerts = await Promise.all(items.map(async (item) => {
      const userId = emailToUserId.get(item.email_normalized)
      
      if (userId) {
        // Check quiz_attempts voor deze user
        const { data: attempts } = await supabaseAdmin!
          .from('quiz_attempts')
          .select('alert')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        return { ...item, has_alert: attempts?.alert || false }
      }
      
      return { ...item, has_alert: false }
    }))
    
    return NextResponse.json({ items: itemsWithAlerts })
  } catch (e) {
    return NextResponse.json({ error: 'Unhandled' }, { status: 500 })
  }
}
