import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          if (!url || !key) throw new Error('Supabase env vars not configured')
          const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
          const { error } = await client.from('events').select('id').limit(1)
          if (error) throw error
          return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
        } catch {
          return Response.json({ status: 'degraded' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
        }
      },
    },
  },
})
