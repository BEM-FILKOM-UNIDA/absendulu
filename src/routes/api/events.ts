import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { isSameOrigin } from '~/lib/http/request-security'
import { parseEventInput } from '~/lib/events/validation'
import { getRequestAdmin, responseWithCookies } from '~/server/request-auth'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookies: string[] = []
        const { isAdmin } = await getRequestAdmin(request, cookies)
        if (!isAdmin) return responseWithCookies({ error: 'Akses ditolak' }, 403, cookies)
        const { data, error } = await createAdminClient().from('events').select('id, name, description, event_date, start_time, end_time, location, status').order('event_date', { ascending: false }).limit(100)
        if (error) return responseWithCookies({ error: 'Gagal memuat acara.' }, 500, cookies)
        return responseWithCookies(data, 200, cookies)
      },
      POST: async ({ request }) => {
        const cookies: string[] = []
        if (!isSameOrigin(request)) return responseWithCookies({ error: 'Origin request tidak valid.' }, 403, cookies)
        const { user, isAdmin } = await getRequestAdmin(request, cookies)
        if (!isAdmin) return responseWithCookies({ error: 'Akses ditolak' }, 403, cookies)
        let body: unknown
        try { body = await request.json() } catch { return responseWithCookies({ error: 'Body request tidak valid.' }, 400, cookies) }
        const input = parseEventInput(body)
        if (!input) return responseWithCookies({ error: 'Data acara tidak valid. Periksa nama, tanggal, waktu, dan panjang teks.' }, 400, cookies)
        const { data, error } = await createAdminClient().from('events').insert({ ...input, created_by: user?.id ?? null }).select('id, name, description, event_date, start_time, end_time, location, status').single()
        if (error) return responseWithCookies({ error: 'Gagal membuat acara.' }, 500, cookies)
        return responseWithCookies(data, 201, cookies)
      },
    },
  },
})
