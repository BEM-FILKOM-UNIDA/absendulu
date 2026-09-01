import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createAdminClient } from './supabase'
import { isAdminRole } from '~/lib/auth/roles'

function readCookies(request: Request) {
  return request.headers.get('cookie')?.split(';').filter(Boolean).map((item) => {
    const index = item.indexOf('=')
    return { name: (index >= 0 ? item.slice(0, index) : item).trim(), value: index >= 0 ? item.slice(index + 1).trim() : '' }
  }) ?? []
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${value}`, `Path=${options.path ?? '/'}`, `SameSite=${options.sameSite ?? 'lax'}`]
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.httpOnly ?? true) parts.push('HttpOnly')
  if (options.secure ?? process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

export function createRequestSupabase(request: Request, responseCookies: string[]) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => readCookies(request),
      setAll: (cookies) => {
        responseCookies.push(...cookies.map(({ name, value, options }) => serializeCookie(name, value, options)))
      },
    },
  })
}

export async function getRequestUser(request: Request, responseCookies: string[]) {
  const supabase = createRequestSupabase(request, responseCookies)
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function getRequestAdmin(request: Request, responseCookies: string[]) {
  const { supabase, user } = await getRequestUser(request, responseCookies)
  if (!user) return { supabase, user: null, isAdmin: false }
  const { data: profile } = await createAdminClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { supabase, user, isAdmin: isAdminRole(profile?.role) }
}

export function responseWithCookies(body: unknown, status: number, responseCookies: string[]) {
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  for (const cookie of responseCookies) headers.append('Set-Cookie', cookie)
  return Response.json(body, { status, headers })
}
