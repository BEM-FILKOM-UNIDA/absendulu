import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import NewEventForm from '@/components/events/NewEventForm'

export default async function NewEventPage() {
  const { supabase, user } = await getCurrentUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }

  if (!isAdminRole(profile?.role)) redirect('/scan')

  return <NewEventForm />
}
