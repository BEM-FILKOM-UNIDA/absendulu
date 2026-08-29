import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUser, getUserRole } from '@/lib/supabase/request'
import { isAdminRole } from '@/lib/auth/roles'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { user } = await getUser(request)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const target = request.nextUrl.clone()
  target.pathname = `/events/${id}/qr`

  // If a session is already open, just show it
  const { data: existing } = await supabase
    .from('attendance_sessions')
    .select('id')
    .eq('event_id', id)
    .eq('is_open', true)
    .single()

  if (existing) {
    return NextResponse.redirect(target)
  }

  // Generate secure QR token (64 char hex)
  const qrToken = crypto.randomBytes(32).toString('hex')

  const { error } = await supabase
    .from('attendance_sessions')
    .insert({
      event_id: id,
      qr_token: qrToken,
      opened_by: user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(target)
}
