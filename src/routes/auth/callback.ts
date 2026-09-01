import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSafeNextPath } from '~/lib/navigation'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { isAdminRole } from '~/lib/auth/roles'
import { GENERATED_IDENTIFIER_PATTERN } from '~/lib/auth/identity'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const nextPath = getSafeNextPath(url.searchParams.get('next'))
        const cookies: Array<{ name: string; value: string; options?: CookieOptions }> = []
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => request.headers.get('cookie')?.split('; ').filter(Boolean).map((item) => {
                const index = item.indexOf('=')
                return { name: index >= 0 ? item.slice(0, index) : item, value: index >= 0 ? item.slice(index + 1) : '' }
              }) ?? [],
              setAll: (items) => {
                cookies.push(...items)
              },
            },
          },
        )
        const error = url.searchParams.get('error')
        if (error) throw redirect({ to: '/login', search: { error: 'google' } })
        const code = url.searchParams.get('code')
        if (!code) throw redirect({ to: '/login', search: { error: 'invalid' } })
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) throw redirect({ to: '/login', search: { error: 'expired' } })
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw redirect({ to: '/login', search: { error: 'invalid' } })
        const { data: profile } = await supabase.from('profiles').select('role, account_status, is_active, nim').eq('id', user.id).maybeSingle()
        if (!profile || GENERATED_IDENTIFIER_PATTERN.test(profile.nim ?? '')) {
          throw redirect({ to: '/login', search: { error: 'unprovisioned' } })
        }
        const destination = profile.account_status === 'disabled' || !profile.is_active
          ? '/account-disabled'
          : profile.account_status !== 'active'
            ? '/complete-profile'
            : nextPath !== '/mahasiswa' ? nextPath : isAdminRole(profile.role) ? '/dashboard' : '/mahasiswa'
        if (cookies.length > 0) setResponseHeader('Set-Cookie', cookies.map(({ name, value, options }) => `${name}=${value}; Path=${options?.path ?? '/'}; HttpOnly; SameSite=Lax`).join(', '))
        void getRequest
        throw redirect({ href: destination })
      },
    },
  },
})
