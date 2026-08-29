import Link from 'next/link'
import { Event } from '@/types/database'
import { Badge } from '@/components/ui/badge'

const statusLabels: Record<string, string> = {
  active: 'Berlangsung',
  draft: 'Draft',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default function EventCard({ event }: { event: Event }) {
  const badgeVariant = event.status === 'active' ? 'success' : event.status === 'cancelled' ? 'danger' : 'muted'

  return (
    <Link href={`/events/${event.id}`} className="group block border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_14px_35px_rgba(16,37,45,.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-strong)] hover:shadow-[8px_10px_0_var(--accent)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center bg-[var(--ink)] text-sm font-black text-[var(--lime)]">
            {event.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="eyebrow text-[var(--muted-soft)]">{event.event_date}</span>
        </div>
        <Badge variant={badgeVariant}>{statusLabels[event.status] || event.status}</Badge>
      </div>
      <h3 className="mt-8 truncate text-xl font-black tracking-[-.04em] group-hover:text-[var(--accent-strong)]">{event.name}</h3>
      {event.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{event.description}</p>}
      <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs font-semibold text-[var(--muted)]">
        <span>{event.start_time}{event.end_time ? ` — ${event.end_time}` : ''}</span>
        <span>{event.location || 'Lokasi belum diisi'} <span className="ml-1 text-[var(--accent-strong)]">↗</span></span>
      </div>
    </Link>
  )
}
