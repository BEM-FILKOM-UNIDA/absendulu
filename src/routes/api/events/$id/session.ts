import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'

export const Route = createFileRoute('/api/events/$id/session')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const guard = await withAdminApi(request, { parseBody: false, requireSameOrigin: false })
        if (guard instanceof Response) return guard
        const { cookies } = guard
        const admin = createAdminClient()
        const { data, error } = await admin.from('attendance_sessions').select('id, event_id, is_open, qr_token, opened_by, opened_at, closed_at, attendances(id, user_id, status, method, check_in_at)').eq('event_id', params.id).eq('is_open', true).maybeSingle()
        if (error) return responseWithCookies({ error: 'Gagal memuat sesi absensi.' }, 500, cookies)
        if (!data) return responseWithCookies({ error: 'Tidak ada sesi aktif.' }, 404, cookies)
        const attendance = data.attendances ?? []
        const userIds = [...new Set(attendance.map((item) => item.user_id))]
        const { data: profiles, error: profilesError } = userIds.length > 0 ? await admin.from('profiles').select('id, full_name, nim').in('id', userIds) : { data: [], error: null }
        if (profilesError) return responseWithCookies({ error: 'Gagal memuat profil peserta.' }, 500, cookies)
        const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
        return responseWithCookies({ ...data, attendances: attendance.map((item) => ({ ...item, profiles: profilesById.get(item.user_id) ?? null })) }, 200, cookies)
      },
    },
  },
})
