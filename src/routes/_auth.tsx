import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '~/components/app-shell'
import { getCurrentAuth } from '~/server/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    const auth = await getCurrentAuth()
    if (!auth.user) throw redirect({ to: '/login', search: { next: location.href } })
    if (!auth.profile || auth.profile.account_status === 'disabled' || !auth.profile.is_active) throw redirect({ to: '/account-disabled' })
    if (auth.profile.account_status !== 'active') throw redirect({ to: '/complete-profile' })
    return { auth }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const auth = Route.useRouteContext().auth
  const isAdmin = auth.profile?.role === 'admin' || auth.profile?.role === 'admin_bem'
  return <AppShell isAdmin={isAdmin} />
}
