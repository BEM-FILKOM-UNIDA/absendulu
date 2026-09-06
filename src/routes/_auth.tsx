import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '~/components/app-shell'
import { getCurrentAuth } from '~/server/auth'
import { GENERATED_IDENTIFIER_PATTERN } from '~/lib/auth/identity'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    try {
      const auth = await getCurrentAuth()
      if (!auth.user) throw redirect({ to: '/login', search: { next: location.href } })
      if (!auth.profile || auth.profile.account_status === 'disabled' || !auth.profile.is_active) throw redirect({ to: '/account-disabled' })
      if (auth.profile.account_status !== 'active') {
        if (GENERATED_IDENTIFIER_PATTERN.test(auth.profile.nim ?? '')) throw redirect({ to: '/login', search: { error: 'unprovisioned' } })
        throw redirect({ to: '/complete-profile' })
      }
      return { auth }
    } catch (error) {
      console.error('Failed to get current auth on auth layout:', error)
      throw redirect({ to: '/login', search: { next: location.href } })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const auth = Route.useRouteContext().auth
  const isAdmin = auth.profile?.role === 'admin' || auth.profile?.role === 'admin_bem'
  return <AppShell isAdmin={isAdmin} />
}
