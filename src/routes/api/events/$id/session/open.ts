import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { isSameOrigin } from '~/lib/http/request-security'
import { getRequestAdmin, responseWithCookies } from '~/server/request-auth'

export const Route = createFileRoute('/api/events/$id/session/open')({
  server: { handlers: { POST: async ({ request, params }) => {
    const cookies: string[] = []
    if (!isSameOrigin(request)) return responseWithCookies({ error: 'Origin request tidak valid.' }, 403, cookies)
    const { user, isAdmin } = await getRequestAdmin(request, cookies)
    if (!isAdmin) return responseWithCookies({ error: 'Akses ditolak' }, 403, cookies)
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
