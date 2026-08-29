import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/request'
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
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('attendance_sessions')
    .update({ is_open: false, closed_at: new Date().toISOString() })
    .eq('event_id', id)
    .eq('is_open', true)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Gagal menutup sesi absensi.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Tidak ada sesi aktif.' }, { status: 404 })

  const target = request.nextUrl.clone()
  target.pathname = `/events/${id}`
  return NextResponse.redirect(target, 303)
}
