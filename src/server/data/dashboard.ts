import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth } from '../auth-guard'
import { cached, TTL } from '~/lib/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

// ponytail: deep Dashboard module — pure fetchDashboard with injected client, error not swallowed
// ponytail: global cache 30s for 70+ concurrent hits — per-instance, no dep
export async function fetchDashboard(supabase: SupabaseClient, auth: Awaited<ReturnType<typeof requireActiveAuth>>) {
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  // cache global parts (same for all users of same role) — auth is per-request
  const global = await cached(`dashboard:${isAdmin ? 'admin' : 'user'}`, TTL.dashboard, async () => {
    const [eventsResult, profilesResult, sessionsResult] = await Promise.all([
      supabase.from('events').select('id, name, event_date, start_time, status, location').order('event_date', { ascending: false }).limit(4),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('attendance_sessions').select('id').eq('is_open', true),
    ])
    if (eventsResult.error) throw new Error(`Gagal memuat acara: ${eventsResult.error.message}`)
    if (profilesResult.error) throw new Error(`Gagal memuat mahasiswa: ${profilesResult.error.message}`)
    if (sessionsResult.error) throw new Error(`Gagal memuat sesi: ${sessionsResult.error.message}`)
    const sessionIds = sessionsResult.data?.map((s) => s.id) ?? []
    const { count: checkIns, error: checkInsError } = sessionIds.length > 0 ? await supabase.from('attendances').select('id', { count: 'exact', head: true }).in('session_id', sessionIds) : { count: 0, error: null }
    if (checkInsError) throw new Error(`Gagal menghitung kehadiran: ${checkInsError.message}`)
    return { events: eventsResult.data ?? [], profilesCount: profilesResult.count ?? 0, sessionIds, checkIns: checkIns ?? 0 }
  })
  return {
    auth,
    isAdmin,
    events: global.events,
    stats: [
      { label: 'Acara terdekat', value: global.events.length, note: 'tercatat di Absendulu' },
      { label: 'Mahasiswa', value: global.profilesCount, note: 'terdaftar di FILKOM' },
      { label: 'Absensi aktif', value: global.sessionIds.length, note: 'sedang dibuka' },
      { label: 'Sudah hadir', value: global.checkIns, note: 'di acara berjalan' },
    ],
  }
}

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  return fetchDashboard(createAdminClient(), auth)
})
