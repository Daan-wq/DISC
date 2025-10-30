import { createClient } from '@supabase/supabase-js'

// Prefer NEXT_PUBLIC_* (used by browser/client), but fall back to non-public names
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing Supabase URL or anon key. Check env: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_URL/SUPABASE_ANON_KEY')
}

// Client-side Supabase client for browser/client-side operations
export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string)

// Admin client for server-side operations (only if service key is available)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl as string, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export interface SubmissionData {
  id?: string
  created_at?: string
  full_name: string
  email: string
  company?: string | null
  profile_code: string
  natural_d: number
  natural_i: number
  natural_s: number
  natural_c: number
  response_d: number
  response_i: number
  response_s: number
  response_c: number
  natural_d_pct: number
  natural_i_pct: number
  natural_s_pct: number
  natural_c_pct: number
  response_d_pct: number
  response_i_pct: number
  response_s_pct: number
  response_c_pct: number
  answers_json: any
  ip_address?: string | null
  user_agent?: string | null
}

// Server-side Supabase client helper
export function createServerSupabaseClient() {
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: false,
    },
  })
}
