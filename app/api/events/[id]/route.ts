import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/request'
import { isAdminRole } from '@/lib/auth/roles'
import { isSameOrigin } from '@/lib/http/request-security'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('events')
    .select('id, name, description, event_date, start_time, end_time, location, status')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Gagal memuat acara.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Acara tidak ditemukan.' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
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
  const supabase = createAdminClient()
  const { data: event } = await supabase.from('events').select('id').eq('id', id).maybeSingle()
  if (!event) return NextResponse.json({ error: 'Acara tidak ditemukan.' }, { status: 404 })

  const { error: attendanceError } = await supabase.from('attendances').delete().eq('event_id', id)
  if (attendanceError) return NextResponse.json({ error: 'Data absensi acara gagal dihapus.' }, { status: 500 })

  const { error: sessionError } = await supabase.from('attendance_sessions').delete().eq('event_id', id)
  if (sessionError) return NextResponse.json({ error: 'Sesi QR acara gagal dihapus.' }, { status: 500 })

  const { error: eventError } = await supabase.from('events').delete().eq('id', id)
  if (eventError) return NextResponse.json({ error: 'Acara gagal dihapus.' }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
