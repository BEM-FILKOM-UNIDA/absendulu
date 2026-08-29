import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function EventDetailPage({
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
    .select('*, attendances(*, profiles(*))')
    .eq('event_id', params.id)
    .eq('is_open', true)
    .single()

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-gray-600">{event.description}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            event.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {event.status}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            📅 <strong>Tanggal:</strong> {event.event_date}
          </div>
          <div>
            🕐 <strong>Waktu:</strong> {event.start_time}
            {event.end_time ? ` - ${event.end_time}` : ''}
          </div>
          <div>
            📍 <strong>Lokasi:</strong> {event.location}
          </div>
        </div>
      </div>

      {session ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="font-medium text-green-800 mb-2">
            ✅ Sesi absensi aktif — {session.attendances?.length || 0} peserta
            hadir
          </p>
          <Link
            href={`/events/${event.id}/qr`}
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Lihat QR Code
          </Link>
        </div>
      ) : (
        <form
          action={`/api/events/${event.id}/session/open`}
          method="POST"
          className="mb-6"
        >
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Buka Sesi Absensi
          </button>
        </form>
      )}
    </div>
  )
}
