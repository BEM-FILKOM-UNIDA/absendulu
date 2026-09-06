import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublishableKey, getSupabaseUrl } from './env'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getPublishableKey())
  }
  return browserClient
}
