import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
    .from('attendance_sessions')
    .select('*, attendances(*, profiles(*))')
    .eq('event_id', id)
    .eq('is_open', true)
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Tidak ada sesi aktif' },
      { status: 404 }
    )
  }

  return NextResponse.json(data)
}
