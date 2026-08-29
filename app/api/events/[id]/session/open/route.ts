import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if session already open
  const { data: existing } = await supabase
    .from('attendance_sessions')
    .select('id')
    .eq('event_id', id)
    .eq('is_open', true)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Sesi sudah terbuka' },
      { status: 400 }
    )
  }

  // Generate secure QR token (64 char hex)
  const qrToken = crypto.randomBytes(32).toString('hex')

  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({
      event_id: id,
      qr_token: qrToken,
      opened_by: '00000000-0000-0000-0000-000000000000',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
