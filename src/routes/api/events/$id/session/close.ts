import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { isSameOrigin } from '~/lib/http/request-security'
import { getRequestAdmin, responseWithCookies } from '~/server/request-auth'

export const Route = createFileRoute('/api/events/$id/session/close')({
  server: { handlers: { POST: async ({ request, params }) => {
    const cookies: string[] = []
    if (!isSameOrigin(request)) return responseWithCookies({ error: 'Origin request tidak valid.' }, 403, cookies)
    const { isAdmin } = await getRequestAdmin(request, cookies)
    if (!isAdmin) return responseWithCookies({ error: 'Akses ditolak' }, 403, cookies)
    const { data, error } = await createAdminClient().from('attendance_sessions').update({ is_open: false, closed_at: new Date().toISOString() }).eq('event_id', params.id).eq('is_open', true).select('id').maybeSingle()
    if (error) return responseWithCookies({ error: 'Gagal menutup sesi absensi.' }, 500, cookies)
    if (!data) return responseWithCookies({ error: 'Tidak ada sesi aktif.' }, 404, cookies)
    return Response.redirect(new URL(`/events/${params.id}`, request.url), 303)
  } } },
})
