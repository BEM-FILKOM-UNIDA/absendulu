import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { isAdminRole } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/supabase/server'
import { normalizeProfileAccess } from '@/lib/auth/profile-access'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getCurrentUser()
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('role, account_status, is_active')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const access = normalizeProfileAccess(profile)
  if (!access || access.account_status !== 'active' || !access.is_active) {
    redirect('/login?pending=1')
  }

  const isAdmin = isAdminRole(access.role)

  return (
    <div className="flex min-h-[100dvh] bg-[var(--background)] lg:h-[100dvh] lg:overflow-hidden">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
        <Header isAdmin={isAdmin} />
        <main className="min-h-0 flex-1 px-5 py-7 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-9 lg:overflow-y-auto lg:pb-9">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
