import { Await, createFileRoute, defer, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { getEventsData } from '~/server/data'
import { Badge, Card } from '~/components/ui'

type EventItem = { id: string; name: string; description: string | null; event_date: string; start_time: string; end_time: string | null; location: string | null; status: string }
type EventsData = Awaited<ReturnType<typeof getEventsData>>

export const Route = createFileRoute('/_auth/events')({
  loader: () => ({ data: defer(getEventsData()) }),
  component: EventsPage,
})

function EventsPage() {
  const { data } = Route.useLoaderData()
  return (
    <Suspense fallback={<EventsShellPending />}>
      <Await promise={data} fallback={<EventsShellPending />}>
        {({ events, isAdmin }: EventsData) => <EventsContent events={events} isAdmin={isAdmin} />}
      </Await>
    </Suspense>
  )
}

function EventsContent({ events, isAdmin }: { events: EventsData['events']; isAdmin: boolean }) {
  const eyebrow = isAdmin ? 'agenda organisasi / FILKOM UNIDA' : 'agenda publik / FILKOM UNIDA'
  const description = isAdmin ? 'Lihat kegiatan organisasi dan kelola status absensinya.' : 'Lihat acara aktif yang dapat kamu ikuti.'
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 border-b border-(--border) pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-(--accent-strong)">{eyebrow}</p>
          <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Temukan<br /><em>acaramu.</em></h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-(--muted)">{description}</p>
        </div>
        {isAdmin ? <Link to="/events/new" className="inline-flex min-h-11 items-center justify-center gap-2 bg-(--accent) px-5 text-sm font-bold text-(--accent-foreground) hover:bg-[#55ded4]">Buat acara ↗</Link> : null}
      </section>
      {events.length > 0 ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="border border-dashed border-(--border) bg-(--surface) px-6 py-20 text-center"><p className="eyebrow text-(--accent-strong)">belum ada agenda</p><h2 className="display-type mt-4 text-3xl">Belum ada acara.</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-(--muted)">Acara yang sudah dipublikasikan akan muncul di sini.</p></div>}
    </div>
  )
}

function EventCard({ event }: { event: EventItem }) {
  const eventDescription = event.description || 'Acara organisasi FILKOM UNIDA.'
  const time = `${event.start_time}${event.end_time ? ` — ${event.end_time}` : ''}`
  const location = event.location || 'Belum ditentukan'
  const variant = event.status === 'active' ? 'success' : event.status === 'cancelled' ? 'danger' : 'muted'
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-(--border) p-6"><div><p className="eyebrow text-(--accent-strong)">{event.event_date}</p><h2 className="mt-3 text-xl font-black tracking-[-.04em]">{event.name}</h2></div><Badge variant={variant}>{event.status}</Badge></div>
      <div className="flex flex-1 flex-col p-6"><p className="text-sm leading-6 text-(--muted)">{eventDescription}</p><div className="mt-6 space-y-2 text-xs font-bold text-(--muted)"><p>Waktu: {time}</p><p>Lokasi: {location}</p></div><Link to="/events/$id" params={{ id: event.id }} className="mt-7 text-xs font-black uppercase tracking-widest text-(--accent-strong) hover:underline">Lihat detail ↗</Link></div>
    </Card>
  )
}

function EventsPending() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Memuat acara" role="status">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-48 animate-pulse border border-(--border) bg-(--surface-muted)" />
      ))}
    </div>
  )
}

function EventsShellPending() {
  return (
    <div className="space-y-8" aria-label="Memuat acara" role="status">
      <div className="space-y-4 border-b border-(--border) pb-8">
        <div className="h-3 w-40 animate-pulse bg-(--surface-muted)" />
        <div className="h-12 w-56 animate-pulse bg-(--surface-muted)" />
        <div className="h-4 w-full max-w-md animate-pulse bg-(--surface-muted)" />
      </div>
      <EventsPending />
    </div>
  )
}
