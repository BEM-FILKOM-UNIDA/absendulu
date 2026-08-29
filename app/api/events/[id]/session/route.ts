import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/request'
import { isAdminRole } from '@/lib/auth/roles'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('id, event_id, is_open, qr_token, opened_by, opened_at, closed_at, attendances(id, user_id, status, method, check_in_at, profiles(full_name, nim))')
    .eq('event_id', id)
    .eq('is_open', true)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Gagal memuat sesi absensi.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Tidak ada sesi aktif.' }, { status: 404 })
  return NextResponse.json(data)
}
