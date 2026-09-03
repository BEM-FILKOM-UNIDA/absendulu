import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'

export const Route = createFileRoute('/api/events/$id/session/close')({
  server: { handlers: { POST: async ({ request, params }) => {
    const guard = await withAdminApi(request, { parseBody: false })
    if (guard instanceof Response) return guard
    const { cookies } = guard
    const { data, error } = await createAdminClient().from('attendance_sessions').update({ is_open: false, closed_at: new Date().toISOString() }).eq('event_id', params.id).eq('is_open', true).select('id').maybeSingle()
    if (error) return responseWithCookies({ error: 'Gagal menutup sesi absensi.' }, 500, cookies)
    if (!data) return responseWithCookies({ error: 'Tidak ada sesi aktif.' }, 404, cookies)
    return Response.redirect(new URL(`/events/${params.id}`, request.url), 303)
  } } },
})
