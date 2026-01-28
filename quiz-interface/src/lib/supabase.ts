import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Prefer NEXT_PUBLIC_* (used by browser/client), but fall back to non-public names
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_ANON_KEY).')
  }
  _supabase = createClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}

function getSupabaseAdminClient(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin env vars missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return _supabaseAdmin
}

// Client-side Supabase client for browser/client-side operations
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// Admin client for server-side operations (only if service key is available)
export const supabaseAdmin = supabaseServiceKey
  ? new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        const client = getSupabaseAdminClient()
        const value = (client as any)[prop]
        return typeof value === 'function' ? value.bind(client) : value
      },
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
  getSupabaseClient()
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: false,
    },
  })
}
