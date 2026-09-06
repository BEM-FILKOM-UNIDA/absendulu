import { createFileRoute } from '@tanstack/react-router'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSafeNextPath } from '~/lib/http/navigation'
import { isAdminRole } from '~/lib/auth/roles'
import { GENERATED_IDENTIFIER_PATTERN } from '~/lib/auth/identity'
import { readCookies, serializeCookie } from '~/lib/http/cookies'
import { getServerPublishableKey, getServerUrl } from '~/lib/supabase/env'
import { createAdminClient } from '~/server/supabase-context'

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
        const supabase = createServerClient(getServerUrl(), getServerPublishableKey(), {
            cookies: {
              getAll: () => readCookies(request),
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

        // Use the admin client to read the profile — avoids dependency on the user's
        // session cookies being fully propagated within this same request, and avoids
        // RLS being evaluated with a potentially stale auth.uid() during the callback.
        const { data: profile } = await createAdminClient()
          .from('profiles')
          .select('role, account_status, is_active, nim')
          .eq('id', user.id)
          .maybeSingle()

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
