import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getRequest } from '@tanstack/react-start/server'
import { readCookies, serializeCookie } from '~/lib/http/cookies'
import { getSecretKey, getServerPublishableKey, getServerUrl } from '~/lib/supabase/env'

export function createAdminClient(): SupabaseClient {
  return createClient(getServerUrl(), getSecretKey(), { auth: { autoRefreshToken: false, persistSession: false } })
}

// ponytail: unified cookie helper — single createSupabase replaces duplicated getAll/setAll in 2 wrappers
function createSupabase(request: Request, responseCookies: string[]) {
  return createServerClient(getServerUrl(), getServerPublishableKey(), {
    cookies: {
      getAll: () => readCookies(request),
      setAll: (cookies) => {
        responseCookies.push(...cookies.map(({ name, value, options }) => serializeCookie(name, value, options)))
      },
    },
  })
}

export function createServerSupabase(request?: Request) {
  const _request = request ?? getRequest()
  const responseCookies: string[] = []
  return { supabase: createSupabase(_request, responseCookies), responseCookies }
}

export function createRequestSupabase(request: Request, responseCookies: string[]) {
  return createSupabase(request, responseCookies)
}
