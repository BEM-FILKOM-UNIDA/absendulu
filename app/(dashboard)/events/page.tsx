import { createClient } from '@/lib/supabase/server'
import EventCard from '@/components/events/EventCard'
import Link from 'next/link'

export default async function EventsPage() {
  const supabase = createClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Acara</h1>
        <Link
          href="/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Buat Acara
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events?.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {(!events || events.length === 0) && (
        <p className="text-gray-500 text-center py-8">Belum ada acara</p>
      )}
    </div>
  )
}
