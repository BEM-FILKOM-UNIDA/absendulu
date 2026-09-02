import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getRequest } from '@tanstack/react-start/server'
import { readCookies, serializeCookie } from '~/lib/http/cookies'

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase server environment belum dikonfigurasi')
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function createServerSupabase(request?: Request) {
  const _request = request ?? getRequest()
  const responseCookies: string[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => readCookies(_request),
        setAll: (cookies) => {
          responseCookies.push(...cookies.map(({ name, value, options }) => serializeCookie(name, value, options)))
        },
      },
    },
  )
  return { supabase, responseCookies }
}

export function createRequestSupabase(request: Request, responseCookies: string[]) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => readCookies(request),
        setAll: (cookies) => {
          responseCookies.push(...cookies.map(({ name, value, options }) => serializeCookie(name, value, options)))
        },
      },
    },
  )
}
