import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { getCurrentAuth } from '../auth'
import { requireActiveAuth } from '../auth-guard'
import { isAdminRole } from '~/lib/auth/roles'
import type { SupabaseClient } from '@supabase/supabase-js'

// ponytail: deep Onboarding module — pure functions with injected client
export async function fetchOnboarding(supabase: SupabaseClient, auth: Awaited<ReturnType<typeof getCurrentAuth>>) {
  if (!auth.user) return { auth, profile: null }
  const { data: profile, error } = await supabase.from('profiles').select('full_name, nim, user_type, account_status, is_active').eq('id', auth.user.id).maybeSingle()
  if (error) throw new Error(`Gagal memuat profil: ${error.message}`)
  return { auth, profile }
}

export async function fetchStudentHome(supabase: SupabaseClient, auth: Awaited<ReturnType<typeof requireActiveAuth>>) {
  const [{ data: profile, error: profileError }, { data: events, error: eventsError }, { data: attendance, error: attendanceError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, nim, role, account_status, is_active, email').eq('id', auth.user.id).maybeSingle(),
    supabase.from('events').select('id, name, event_date, start_time, location').eq('status', 'active').order('event_date', { ascending: true }).order('start_time', { ascending: true }).limit(8),
    supabase.from('attendances').select('id, status, method, check_in_at, events(name)').eq('user_id', auth.user.id).order('check_in_at', { ascending: false }).limit(5),
  ])
  if (profileError) throw new Error(`Gagal memuat profil: ${profileError.message}`)
  if (eventsError) throw new Error(`Gagal memuat acara: ${eventsError.message}`)
  if (attendanceError) throw new Error(`Gagal memuat riwayat: ${attendanceError.message}`)
  const eventIds = events?.map((e) => e.id) ?? []
  const { data: openSessions, error: openError } = eventIds.length > 0 ? await supabase.from('attendance_sessions').select('event_id').in('event_id', eventIds).eq('is_open', true) : { data: [], error: null }
  if (openError) throw new Error(`Gagal memuat sesi: ${openError.message}`)
  return { auth, profile, events: events ?? [], openEventIds: (openSessions ?? []).map((s) => s.event_id), attendance: attendance ?? [] }
}

export const getOnboardingData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await getCurrentAuth()
  return fetchOnboarding(createAdminClient(), auth)
})

export const getStudentHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  return fetchStudentHome(createAdminClient(), auth)
})

export const getProfileData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const { data: profile, error } = await createAdminClient().from('profiles').select('role, full_name, nim, user_type, division, account_status, is_active').eq('id', auth.user.id).maybeSingle()
  if (error) throw new Error(`Gagal memuat profil: ${error.message}`)
  if (!profile) throw new Error('Profile not found')
  return { auth, profile, isAdmin: isAdminRole(profile.role) }
})
