import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser, getUserRole } from '@/lib/supabase/request'
import { isSameOrigin } from '@/lib/http/request-security'
import { isAdminRole } from '@/lib/auth/roles'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 })
  }
  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { id } = await params
  const target = request.nextUrl.clone()
  target.pathname = `/events/${id}/qr`
  const admin = createAdminClient()
  const { user } = await getUser(request)

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (eventError) return NextResponse.json({ error: 'Gagal memeriksa acara.' }, { status: 500 })
  if (!event) return NextResponse.json({ error: 'Acara tidak ditemukan.' }, { status: 404 })
  if (event.status !== 'active') {
    return NextResponse.json({ error: 'Hanya acara aktif yang dapat membuka absensi.' }, { status: 400 })
  }

  const { data: existing, error: existingError } = await admin
    .from('attendance_sessions')
    .select('id')
    .eq('event_id', id)
    .eq('is_open', true)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: 'Gagal memeriksa sesi absensi.' }, { status: 500 })
  if (existing) return NextResponse.redirect(target, 303)

  const { error } = await admin.from('attendance_sessions').insert({
    event_id: id,
    // Keep the QR payload compact enough for reliable camera scanning while
    // retaining 192 bits of cryptographic randomness.
    qr_token: crypto.randomBytes(24).toString('base64url'),
    opened_by: user?.id ?? null,
    is_open: true,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.redirect(target, 303)
    return NextResponse.json({ error: 'Gagal membuka sesi absensi.' }, { status: 500 })
  }

  return NextResponse.redirect(target, 303)
}
