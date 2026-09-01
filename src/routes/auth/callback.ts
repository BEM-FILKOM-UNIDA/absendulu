import { createFileRoute } from '@tanstack/react-router'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSafeNextPath } from '~/lib/navigation'
import { isAdminRole } from '~/lib/auth/roles'
import { GENERATED_IDENTIFIER_PATTERN } from '~/lib/auth/identity'

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite === true ? 'Strict' : options.sameSite}`)
  if (options.priority) parts.push(`Priority=${options.priority}`)
  if (options.partitioned) parts.push('Partitioned')
  return parts.join('; ')
}

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const nextPath = getSafeNextPath(url.searchParams.get('next'))
        const cookies: Array<{ name: string; value: string; options?: CookieOptions }> = []
        const responseHeaders: Record<string, string> = {}
        const redirectTo = (path: string, search?: Record<string, string>) => {
          const location = new URL(path, request.url)
          for (const [key, value] of Object.entries(search ?? {})) location.searchParams.set(key, value)
          const headers = new Headers({ Location: location.toString() })
          for (const [name, value] of Object.entries(responseHeaders)) headers.set(name, value)
          for (const cookie of cookies) headers.append('Set-Cookie', serializeCookie(cookie.name, cookie.value, cookie.options))
          return new Response(null, { status: 302, headers })
        }
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => request.headers.get('cookie')?.split('; ').filter(Boolean).map((item) => {
                const index = item.indexOf('=')
                return { name: index >= 0 ? item.slice(0, index) : item, value: index >= 0 ? item.slice(index + 1) : '' }
              }) ?? [],
              setAll: (items, headers) => {
                cookies.push(...items)
                Object.assign(responseHeaders, headers)
              },
            },
          },
        )
        const error = url.searchParams.get('error')
        if (error) return redirectTo('/login', { error: 'google' })
        const code = url.searchParams.get('code')
        if (!code) return redirectTo('/login', { error: 'invalid' })
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) return redirectTo('/login', { error: 'expired' })
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return redirectTo('/login', { error: 'invalid' })
        const { data: profile } = await supabase.from('profiles').select('role, account_status, is_active, nim').eq('id', user.id).maybeSingle()
        if (!profile || GENERATED_IDENTIFIER_PATTERN.test(profile.nim ?? '')) {
          return redirectTo('/login', { error: 'unprovisioned' })
        }
        const destination = profile.account_status === 'disabled' || !profile.is_active
          ? '/account-disabled'
          : profile.account_status !== 'active'
            ? '/complete-profile'
            : nextPath !== '/' && nextPath !== '/mahasiswa' ? nextPath : isAdminRole(profile.role) ? '/dashboard' : '/mahasiswa'
        return redirectTo(destination)
      },
    },
  },
})
