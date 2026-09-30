import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase-context'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'
import { fetchEventAttendance } from '~/server/data/attendance'
import { toCsv } from '~/lib/export/csv'

export const Route = createFileRoute('/api/events/$id/attendance-export')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const guard = await withAdminApi(request, { parseBody: false, requireSameOrigin: false })
        if (guard instanceof Response) return guard
        const { cookies } = guard
        const admin = createAdminClient()
        const { data: event, error: eventError } = await admin.from('events').select('id').eq('id', params.id).maybeSingle()
        if (eventError) return responseWithCookies({ error: 'Gagal memuat data absensi.' }, 500, cookies)
        if (!event) return responseWithCookies({ error: 'Acara tidak ditemukan.' }, 404, cookies)
        let rows: Awaited<ReturnType<typeof fetchEventAttendance>>
        try {
          rows = await fetchEventAttendance(admin, params.id)
        } catch {
          return responseWithCookies({ error: 'Gagal memuat data absensi.' }, 500, cookies)
        }
        const csv = toCsv(
          ['full_name', 'nim', 'check_in_at', 'status'],
          rows.map((row) => [row.profiles?.full_name ?? '', row.profiles?.nim ?? '', row.check_in_at ?? '', row.status ?? '']),
        )
        const headers = new Headers({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance-${params.id}.csv"`,
          'Cache-Control': 'no-store',
        })
        for (const cookie of cookies) headers.append('Set-Cookie', cookie)
        return new Response(csv, { status: 200, headers })
      },
    },
  },
})
