import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { parseEventInput } from '~/lib/events/validation'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const guard = await withAdminApi(request, { parseBody: false, requireSameOrigin: false })
        if (guard instanceof Response) return guard
        const { cookies } = guard
        const { data, error } = await createAdminClient().from('events').select('id, name, description, event_date, start_time, end_time, location, status').order('event_date', { ascending: false }).limit(100)
        if (error) return responseWithCookies({ error: 'Gagal memuat acara.' }, 500, cookies)
        return responseWithCookies(data, 200, cookies)
      },
      POST: async ({ request }) => {
        const guard = await withAdminApi(request)
        if (guard instanceof Response) return guard
        const { user, body, cookies } = guard
        const input = parseEventInput(body)
        if (!input) return responseWithCookies({ error: 'Data acara tidak valid. Periksa nama, tanggal, waktu, dan panjang teks.' }, 400, cookies)
        const { data, error } = await createAdminClient().from('events').insert({ ...input, created_by: user?.id ?? null }).select('id, name, description, event_date, start_time, end_time, location, status').single()
        if (error) return responseWithCookies({ error: 'Gagal membuat acara.' }, 500, cookies)
        return responseWithCookies(data, 201, cookies)
      },
    },
  },
})
