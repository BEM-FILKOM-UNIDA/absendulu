import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from './supabase'
import { getCurrentAuth } from './auth'
import { isAdminRole } from '~/lib/auth/roles'

async function requireActiveAuth() {
  const auth = await getCurrentAuth()
  if (!auth.user || !auth.profile || auth.profile.account_status !== 'active' || !auth.profile.is_active) throw new Error('Unauthorized')
  const { user, profile } = auth
  return { ...auth, user, profile }
}

export const getEventsData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = isAdminRole(auth.profile.role)
  let query = createAdminClient().from('events').select('id, name, description, event_date, start_time, end_time, location, status').order('event_date', { ascending: !isAdmin }).order('start_time', { ascending: true }).limit(100)
  if (!isAdmin) query = query.eq('status', 'active')
  const { data } = await query
  return { isAdmin, events: data ?? [] }
})

export const getHistoryData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = isAdminRole(auth.profile.role)
  let query = createAdminClient().from('attendances').select('id, user_id, status, method, check_in_at, notes, events(name)').order('check_in_at', { ascending: false }).limit(isAdmin ? 100 : 50)
  if (!isAdmin) query = query.eq('user_id', auth.user.id)
  const { data } = await query
  const rows = data ?? []
  const userIds = isAdmin ? [...new Set(rows.map((item) => item.user_id))] : []
  const { data: profiles } = userIds.length > 0 ? await createAdminClient().from('profiles').select('id, full_name, nim').in('id', userIds) : { data: [] }
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return { isAdmin, attendances: rows.map((attendance) => ({ ...attendance, profiles: isAdmin ? profilesById.get(attendance.user_id) ?? null : null })) }
})

export const getProfileData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const { data: profile } = await createAdminClient().from('profiles').select('role, full_name, nim, user_type, division, account_status, is_active').eq('id', auth.user.id).maybeSingle()
  if (!profile) throw new Error('Profile not found')
  return { auth, profile, isAdmin: isAdminRole(profile.role) }
})

export const getMembersData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  if (!isAdminRole(auth.profile.role)) throw new Error('Forbidden')
  const { data: members } = await createAdminClient().from('profiles').select('id, full_name, nim, email, user_type, account_status, is_active').order('full_name').limit(1000)
  return { members: members ?? [] }
})

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const admin = createAdminClient()
  const [eventsResult, profilesResult, sessionsResult] = await Promise.all([
    admin.from('events').select('id, name, event_date, start_time, status, location').order('event_date', { ascending: false }).limit(4),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('attendance_sessions').select('id').eq('is_open', true),
  ])
  const sessionIds = sessionsResult.data?.map((session) => session.id) ?? []
  const { count: checkIns } = sessionIds.length > 0 ? await admin.from('attendances').select('id', { count: 'exact', head: true }).in('session_id', sessionIds) : { count: 0 }
  return {
    auth,
    isAdmin: isAdminRole(auth.profile.role),
    events: eventsResult.data ?? [],
    stats: [
      { label: 'Acara terdekat', value: eventsResult.data?.length ?? 0, note: 'tercatat di Absendulu' },
      { label: 'Mahasiswa', value: profilesResult.count ?? 0, note: 'terdaftar di FILKOM' },
      { label: 'Absensi aktif', value: sessionIds.length, note: 'sedang dibuka' },
      { label: 'Sudah hadir', value: checkIns ?? 0, note: 'di acara berjalan' },
    ],
  }
})

export const getEventDetailData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
  const auth = await requireActiveAuth()
  const isAdmin = isAdminRole(auth.profile.role)
  const admin = createAdminClient()
  let eventQuery = admin.from('events').select('id, name, description, event_date, start_time, end_time, location, status').eq('id', data.id)
  if (!isAdmin) eventQuery = eventQuery.eq('status', 'active')
  const { data: event } = await eventQuery.maybeSingle()
  if (!event) throw new Error('Event not found')
  const { data: session } = isAdmin ? await admin.from('attendance_sessions').select('id, event_id, is_open').eq('event_id', data.id).eq('is_open', true).maybeSingle() : { data: null }
  const { count } = isAdmin && session ? await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id) : { count: 0 }
  return { event, isAdmin, session, attendanceCount: count ?? 0 }
})

export const getQrData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
  const auth = await requireActiveAuth()
  if (!isAdminRole(auth.profile.role)) throw new Error('Forbidden')
  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('id, name, event_date, start_time, end_time, location, status').eq('id', data.id).maybeSingle()
  if (!event) throw new Error('Event not found')
  const { data: session } = await admin.from('attendance_sessions').select('id, event_id, is_open, qr_token').eq('event_id', data.id).eq('is_open', true).maybeSingle()
  if (!session) return { event, session: null, attendanceCount: 0 }
  const { count } = await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id)
  return { event, session, attendanceCount: count ?? 0 }
})

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
