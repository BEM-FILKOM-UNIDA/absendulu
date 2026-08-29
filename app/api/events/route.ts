import { NextRequest, NextResponse } from 'next/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser, getUserRole } from '@/lib/supabase/request'
import { isSameOrigin } from '@/lib/http/request-security'
import { isAdminRole } from '@/lib/auth/roles'

const EVENT_STATUSES = new Set(['draft', 'active', 'completed', 'cancelled'])
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^\d{2}:\d{2}$/

type EventInput = {
  name: string
  description: string | null
  event_date: string
  start_time: string
  end_time: string | null
  location: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
}

function parseEventInput(value: unknown): EventInput | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null
  const event_date = typeof body.event_date === 'string' ? body.event_date : ''
  const start_time = typeof body.start_time === 'string' ? body.start_time : ''
  const end_time = typeof body.end_time === 'string' && body.end_time ? body.end_time : null
  const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null
  const status = typeof body.status === 'string' && EVENT_STATUSES.has(body.status)
    ? body.status as EventInput['status']
    : 'active'

  if (!name || name.length > 160 || (description && description.length > 5000) || (location && location.length > 200)) return null
  if (!DATE_PATTERN.test(event_date) || !TIME_PATTERN.test(start_time)) return null
  if (end_time && !TIME_PATTERN.test(end_time)) return null
  if (end_time && end_time <= start_time) return null

  return { name, description, event_date, start_time, end_time, location, status }
}

export async function GET() {
  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await supabase
    .from('events')
    .select('id, name, description, event_date, start_time, end_time, location, status')
    .order('event_date', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: 'Gagal memuat acara.' }, { status: 500 })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' },
  })
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 })
  }
  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 })
  }

  const input = parseEventInput(body)
  if (!input) {
    return NextResponse.json({ error: 'Data acara tidak valid. Periksa nama, tanggal, waktu, dan panjang teks.' }, { status: 400 })
  }

  const { user } = await getUser(request)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, created_by: user?.id ?? null })
    .select('id, name, description, event_date, start_time, end_time, location, status')
    .single()

  if (error) return NextResponse.json({ error: 'Gagal membuat acara.' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
