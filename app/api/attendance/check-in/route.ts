import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { normalizeProfileAccess } from '@/lib/auth/profile-access'
import { isSameOrigin } from '@/lib/http/request-security'

function getAuthenticatedClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    },
  )
}

function toComparableMinutes(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)
  return Date.UTC(year, month - 1, day, hour, minute) / 60000
}

function getJakartaDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 })
  }
  const supabase = getAuthenticatedClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('account_status, is_active')
    .eq('id', user.id)
    .maybeSingle()
  const access = normalizeProfileAccess(profile)

  if (profileError || !access || access.account_status !== 'active' || !access.is_active) {
    return NextResponse.json({ error: 'Akun belum aktif atau sudah dinonaktifkan.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 })
  }

  const qrToken = body && typeof body === 'object' && 'qrToken' in body
    ? (body as { qrToken?: unknown }).qrToken
    : null
  if (typeof qrToken !== 'string' || qrToken.length < 16 || qrToken.length > 128) {
    return NextResponse.json({ error: 'QR token tidak valid.' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await admin
    .from('attendance_sessions')
    .select('id, event_id, is_open, events!inner(name, event_date, start_time, end_time, status)')
    .eq('qr_token', qrToken)
    .eq('is_open', true)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'QR Code tidak valid atau sesi sudah ditutup.' }, { status: 400 })
  }

  const event = Array.isArray(session.events) ? session.events[0] : session.events
  if (!event || event.status !== 'active') {
    return NextResponse.json({ error: 'Acara tidak sedang aktif.' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('attendances')
    .select('id')
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Sudah melakukan absensi.' }, { status: 409 })

  const jakartaNow = getJakartaDateTime()
  if (jakartaNow.date !== event.event_date) {
    return NextResponse.json({ error: 'Waktu absensi acara sudah berakhir.' }, { status: 400 })
  }
  const startMinutes = toComparableMinutes(event.event_date, event.start_time)
  const nowMinutes = toComparableMinutes(jakartaNow.date, jakartaNow.time)
  const endMinutes = event.end_time ? toComparableMinutes(event.event_date, event.end_time) : null
  if (nowMinutes < startMinutes) {
    return NextResponse.json({ error: 'Absensi belum dibuka. Tunggu sampai waktu acara dimulai.' }, { status: 400 })
  }
  if (endMinutes !== null && nowMinutes > endMinutes) {
    return NextResponse.json({ error: 'Waktu absensi acara sudah berakhir.' }, { status: 400 })
  }
  const status = nowMinutes - startMinutes > 15 ? 'terlambat' : 'hadir'

  const { error } = await admin.from('attendances').insert({
    session_id: session.id,
    event_id: session.event_id,
    user_id: user.id,
    status,
    method: 'QR_CODE',
    check_in_at: new Date().toISOString(),
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Sudah melakukan absensi.' }, { status: 409 })
    return NextResponse.json({ error: 'Gagal mencatat kehadiran.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status, eventName: event.name })
}
