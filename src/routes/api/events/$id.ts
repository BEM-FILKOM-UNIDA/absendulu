import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { isSameOrigin } from '~/lib/http/request-security'
import { getRequestAdmin, responseWithCookies } from '~/server/request-auth'

export const Route = createFileRoute('/api/events/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const cookies: string[] = []
        const { isAdmin } = await getRequestAdmin(request, cookies)
        if (!isAdmin) return responseWithCookies({ error: 'Akses ditolak' }, 403, cookies)
        const { data, error } = await createAdminClient().from('events').select('id, name, description, event_date, start_time, end_time, location, status').eq('id', params.id).maybeSingle()
        if (error) return responseWithCookies({ error: 'Gagal memuat acara.' }, 500, cookies)
        if (!data) return responseWithCookies({ error: 'Acara tidak ditemukan.' }, 404, cookies)
        return responseWithCookies(data, 200, cookies)
      },
      DELETE: async ({ request, params }) => {
        const cookies: string[] = []
        if (!isSameOrigin(request)) return responseWithCookies({ error: 'Origin request tidak valid.' }, 403, cookies)
        const { isAdmin } = await getRequestAdmin(request, cookies)
        if (!isAdmin) return responseWithCookies({ error: 'Akses ditolak' }, 403, cookies)
        const admin = createAdminClient()
        const { data: event } = await admin.from('events').select('id').eq('id', params.id).maybeSingle()
        if (!event) return responseWithCookies({ error: 'Acara tidak ditemukan.' }, 404, cookies)
        const attendance = await admin.from('attendances').delete().eq('event_id', params.id)
        if (attendance.error) return responseWithCookies({ error: 'Data absensi acara gagal dihapus.' }, 500, cookies)
        const sessions = await admin.from('attendance_sessions').delete().eq('event_id', params.id)
        if (sessions.error) return responseWithCookies({ error: 'Sesi QR acara gagal dihapus.' }, 500, cookies)
        const deleted = await admin.from('events').delete().eq('id', params.id)
        if (deleted.error) return responseWithCookies({ error: 'Acara gagal dihapus.' }, 500, cookies)
        return new Response(null, { status: 204 })
      },
    },
  },
})
