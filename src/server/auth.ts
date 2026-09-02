import { createServerFn } from '@tanstack/react-start'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { normalizeProfileAccess } from '~/lib/auth/profile-access'
import { readCookies, serializeCookie } from '~/lib/http/cookies'

export type AuthProfile = {
  role: string | null
  account_status: 'invited' | 'active' | 'disabled'
  is_active: boolean
  nim: string | null
}

export type AuthSnapshot = {
  user: { id: string; email: string | null } | null
  profile: AuthProfile | null
}

async function readAuth(): Promise<AuthSnapshot> {
  const request = getRequest()
  const responseCookies: Array<{ name: string; value: string; options?: CookieOptions }> = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => readCookies(request),
        setAll: (cookies) => {
          responseCookies.push(...cookies)
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role, account_status, is_active, nim').eq('id', user.id).maybeSingle()
    : { data: null }

  if (responseCookies.length > 0) {
    setResponseHeader('Set-Cookie', responseCookies.map(({ name, value, options }) => serializeCookie(name, value, options)))
  }

  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    profile: normalizeProfileAccess(profile) ? { ...normalizeProfileAccess(profile)!, nim: profile?.nim ?? null } : null,
  }
}

export const getCurrentAuth = createServerFn({ method: 'GET' }).handler(readAuth)
