import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function createMissingEnvClient(name: string) {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`${name} is not configured.`)
      },
    }
  ) as any
}

const hasSupabasePublicEnv = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabasePublicEnv
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : createMissingEnvClient('Supabase')

export const supabaseAdmin = hasSupabasePublicEnv && supabaseServiceKey
  ? createClient(supabaseUrl as string, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export function createServerSupabaseClient() {
  if (!hasSupabasePublicEnv) {
    throw new Error('Supabase is not configured.')
  }

  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: false,
    },
  })
}
