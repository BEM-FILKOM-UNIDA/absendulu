import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Use Supabase SSR client to properly read auth cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // No-op: we don't need to set cookies in API routes
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { qrToken } = await request.json()
  if (!qrToken) {
    return NextResponse.json(
      { error: 'QR token diperlukan' },
      { status: 400 }
    )
  }

  // Find session by QR token (use service role for read)
  const { createClient } = await import('@supabase/supabase-js')
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: session } = await adminSupabase
    .from('attendance_sessions')
    .select('*, events(*)')
    .eq('qr_token', qrToken)
    .eq('is_open', true)
    .single()

  if (!session) {
    return NextResponse.json(
      { error: 'QR Code tidak valid atau sesi sudah ditutup' },
      { status: 400 }
    )
  }

  // Check if already checked in
  const { data: existing } = await adminSupabase
    .from('attendances')
    .select('id')
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Sudah melakukan absensi' },
      { status: 400 }
    )
  }

  // Determine status: HADIR or TERLAMBAT (>15 min after start_time)
  const event = session.events
  const now = new Date()
  const [startH, startM] = event.start_time.split(':').map(Number)
  const eventStart = new Date()
  eventStart.setHours(startH, startM, 0, 0)
  const diffMinutes = (now.getTime() - eventStart.getTime()) / (1000 * 60)
  const status = diffMinutes > 15 ? 'terlambat' : 'hadir'

  const { error } = await adminSupabase.from('attendances').insert({
    session_id: session.id,
    event_id: session.event_id,
    user_id: user.id,
    status,
    method: 'QR_CODE',
    check_in_at: now.toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    status,
    eventName: event.name,
  })
}
