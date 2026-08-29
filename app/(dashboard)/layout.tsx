import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import { normalizeProfileAccess } from '@/lib/auth/profile-access'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }
  const access = normalizeProfileAccess(profile)

  if (!access || access.account_status !== 'active' || !access.is_active) redirect('/login?pending=1')

  const isAdmin = isAdminRole(access.role)
  return (
    <div className="flex min-h-[100dvh] bg-[var(--background)]">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header isAdmin={isAdmin} />
        <main className="flex-1 px-5 pb-24 py-7 sm:px-8 sm:py-9 sm:pb-24 lg:pb-9">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
