import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth } from '../auth-guard'

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
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
    isAdmin,
    events: eventsResult.data ?? [],
    stats: [
      { label: 'Acara terdekat', value: eventsResult.data?.length ?? 0, note: 'tercatat di Absendulu' },
      { label: 'Mahasiswa', value: profilesResult.count ?? 0, note: 'terdaftar di FILKOM' },
      { label: 'Absensi aktif', value: sessionIds.length, note: 'sedang dibuka' },
      { label: 'Sudah hadir', value: checkIns ?? 0, note: 'di acara berjalan' },
    ],
  }
})
