import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QRDisplay from '@/components/attendance/QRDisplay'
import AttendanceCounter from '@/components/attendance/AttendanceCounter'

export default async function QRPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('event_id', params.id)
    .eq('is_open', true)
    .single()

  if (!session) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">
          Tidak ada sesi absensi aktif
        </h1>
        <a
          href={`/events/${params.id}`}
          className="text-blue-600 hover:underline"
        >
          Kembali ke detail acara
        </a>
      </div>
    )
  }

  const { count } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .then((r) => ({ count: r.count || 0 }))

  return (
    <div className="max-w-2xl mx-auto">
      <QRDisplay token={session.qr_token} eventName={event.name} />
      <div className="mt-6">
        <AttendanceCounter
          sessionId={session.id}
          eventId={event.id}
          initialCount={count}
        />
      </div>
      <div className="mt-4 text-center">
        <form
          action={`/api/events/${params.id}/session/close`}
          method="POST"
        >
          <button
            type="submit"
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Tutup Sesi Absensi
          </button>
        </form>
      </div>
    </div>
  )
}
