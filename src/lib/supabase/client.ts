import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

function getPublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
  // ponytail: fallback to anon key for Vercel envs still on legacy key; single lookup, no extra dep
  const value =
    import.meta.env[name] ??
    (name === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
      ? (import.meta.env as Record<string, string | undefined>)['NEXT_PUBLIC_SUPABASE_ANON_KEY']
      : undefined)
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
