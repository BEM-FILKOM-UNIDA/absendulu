import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/supabase/request'
import { isAdminRole } from '@/lib/auth/roles'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('attendance_sessions')
    .update({ is_open: false, closed_at: new Date().toISOString() })
    .eq('event_id', id)
    .eq('is_open', true)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const target = request.nextUrl.clone()
  target.pathname = `/events/${id}`
  return NextResponse.redirect(target)
}
