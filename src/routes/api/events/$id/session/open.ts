import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'

export const Route = createFileRoute('/api/events/$id/session/open')({
  server: { handlers: { POST: async ({ request, params }) => {
    const guard = await withAdminApi(request, { parseBody: false })
    if (guard instanceof Response) return guard
    const { user, cookies } = guard
    const admin = createAdminClient()
    const { data: event, error: eventError } = await admin.from('events').select('id, status').eq('id', params.id).maybeSingle()
    if (eventError) return responseWithCookies({ error: 'Gagal memeriksa acara.' }, 500, cookies)
    if (!event) return responseWithCookies({ error: 'Acara tidak ditemukan.' }, 404, cookies)
    if (event.status !== 'active') return responseWithCookies({ error: 'Hanya acara aktif yang dapat membuka absensi.' }, 400, cookies)
    const { data: existing } = await admin.from('attendance_sessions').select('id').eq('event_id', params.id).eq('is_open', true).maybeSingle()
    if (existing) return Response.redirect(new URL(`/events/${params.id}/qr`, request.url), 303)
    const { error } = await admin.from('attendance_sessions').insert({ event_id: params.id, qr_token: crypto.randomBytes(24).toString('base64url'), opened_by: user?.id ?? null, is_open: true })
    if (error) return error.code === '23505' ? Response.redirect(new URL(`/events/${params.id}/qr`, request.url), 303) : responseWithCookies({ error: 'Gagal membuka sesi absensi.' }, 500, cookies)
    return Response.redirect(new URL(`/events/${params.id}/qr`, request.url), 303)
  } } },
})
