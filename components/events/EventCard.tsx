import Link from 'next/link'
import { Event } from '@/types/database'

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`}>
      <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{event.name}</h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}
          >
            {event.status}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-2">{event.description}</p>
        <div className="text-sm text-gray-500">
          <p>
            📅 {event.event_date} • 🕐 {event.start_time}
            {event.end_time ? ` - ${event.end_time}` : ''}
          </p>
          <p>📍 {event.location}</p>
        </div>
      </div>
    </Link>
  )
}
