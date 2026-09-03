import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'
import type { EventStatus } from '~/lib/events/validation'

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['active'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export const Route = createFileRoute('/api/events/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const guard = await withAdminApi(request, { parseBody: false, requireSameOrigin: false })
        if (guard instanceof Response) return guard
        const { cookies } = guard
        const { data, error } = await createAdminClient().from('events').select('id, name, description, event_date, start_time, end_time, location, status').eq('id', params.id).maybeSingle()
        if (error) return responseWithCookies({ error: 'Gagal memuat acara.' }, 500, cookies)
        if (!data) return responseWithCookies({ error: 'Acara tidak ditemukan.' }, 404, cookies)
        return responseWithCookies(data, 200, cookies)
      },
      PATCH: async ({ request, params }) => {
        const guard = await withAdminApi(request)
        if (guard instanceof Response) return guard
        const { body, cookies } = guard
        const status = body && typeof body === 'object' && 'status' in body ? (body as { status?: unknown }).status : null
        if (typeof status !== 'string' || !['active', 'completed', 'cancelled', 'draft'].includes(status)) {
          return responseWithCookies({ error: 'Status tidak valid.' }, 400, cookies)
        }
        const admin = createAdminClient()
        const { data: event } = await admin.from('events').select('id, status').eq('id', params.id).maybeSingle()
        if (!event) return responseWithCookies({ error: 'Acara tidak ditemukan.' }, 404, cookies)
        const allowed = VALID_TRANSITIONS[event.status as EventStatus] ?? []
        if (!allowed.includes(status as EventStatus)) {
          return responseWithCookies({ error: `Tidak dapat mengubah status dari '${event.status}' ke '${status}'.` }, 400, cookies)
        }
        const { data, error } = await admin.from('events').update({ status }).eq('id', params.id).select('id, status').maybeSingle()
        if (error) return responseWithCookies({ error: 'Status acara gagal diperbarui.' }, 500, cookies)
        return responseWithCookies(data, 200, cookies)
      },
      DELETE: async ({ request, params }) => {
        const guard = await withAdminApi(request, { parseBody: false })
        if (guard instanceof Response) return guard
        const { cookies } = guard
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
