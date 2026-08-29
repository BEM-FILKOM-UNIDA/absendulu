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
    .from('events')
    .select('id, name, description, event_date, start_time, end_time, location, status')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Gagal memuat acara.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Acara tidak ditemukan.' }, { status: 404 })
  return NextResponse.json(data)
}
