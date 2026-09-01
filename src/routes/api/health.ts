import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { error } = await createAdminClient().from('events').select('id').limit(1)
          if (error) throw error
          return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
        } catch {
          return Response.json({ status: 'degraded' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
        }
      },
    },
  },
})
