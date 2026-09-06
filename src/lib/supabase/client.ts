import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

function getPublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
  const value = import.meta.env[name]
  if (!value) throw new Error(`${name} belum dikonfigurasi`)
  return value
}

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      getPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getPublicEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    )
  }
  return browserClient
}
