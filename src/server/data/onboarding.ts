import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { getCurrentAuth } from '../auth'
import { requireActiveAuth } from '../auth-guard'

export const getOnboardingData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await getCurrentAuth()
  if (!auth.user) return { auth, profile: null }
  const { data: profile } = await createAdminClient()
    .from('profiles')
    .select('full_name, nim, user_type, account_status, is_active')
    .eq('id', auth.user.id)
    .maybeSingle()
  return { auth, profile }
})

export const getStudentHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const admin = createAdminClient()
  const [{ data: profile }, { data: events }, { data: attendance }] = await Promise.all([
    admin.from('profiles').select('id, full_name, nim, role, account_status, is_active, email').eq('id', auth.user.id).maybeSingle(),
    admin.from('events').select('id, name, event_date, start_time, location').eq('status', 'active').order('event_date', { ascending: true }).order('start_time', { ascending: true }).limit(8),
    admin.from('attendances').select('id, status, method, check_in_at, events(name)').eq('user_id', auth.user.id).order('check_in_at', { ascending: false }).limit(5),
  ])
  const eventIds = events?.map((event) => event.id) ?? []
  const { data: openSessions } = eventIds.length > 0 ? await admin.from('attendance_sessions').select('event_id').in('event_id', eventIds).eq('is_open', true) : { data: [] }
  return { auth, profile, events: events ?? [], openEventIds: (openSessions ?? []).map((session) => session.event_id), attendance: attendance ?? [] }
})

export const getProfileData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const { data: profile } = await createAdminClient().from('profiles').select('role, full_name, nim, user_type, division, account_status, is_active').eq('id', auth.user.id).maybeSingle()
  if (!profile) throw new Error('Profile not found')
  return { auth, profile, isAdmin: profile.role === 'admin' || profile.role === 'admin_bem' }
})
