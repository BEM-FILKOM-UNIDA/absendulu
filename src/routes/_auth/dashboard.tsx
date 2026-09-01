import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getDashboardData } from '~/server/auth'
import { ButtonLink, Card } from '~/components/ui'

type DashboardEvent = { id: string; name: string; event_date: string; start_time: string; status: string; location: string | null }
type DashboardStat = { label: string; value: number; note: string }

export const Route = createFileRoute('/_auth/dashboard')({
  beforeLoad: ({ context }) => {
    const role = context.auth.profile?.role
    if (role !== 'admin' && role !== 'admin_bem') throw redirect({ to: '/mahasiswa' })
  },
  loader: () => getDashboardData(),
  component: DashboardPage,
})

function DashboardPage() {
  const data = Route.useLoaderData()
  return (
    <div className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-[var(--accent-strong)]">Absendulu / FILKOM UNIDA</p>
          <h2 className="display-type mt-3 text-5xl leading-none tracking-[-.07em] sm:text-6xl">Siap hadir<br /><em>di acara.</em></h2>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--muted)]">Pantau acara organisasi FILKOM, buka absensi, dan lihat siapa saja yang sudah hadir—semua dalam satu tempat.</p>
        </div>
        <ButtonLink href="/scan" variant="accent">Scan untuk hadir <span aria-hidden="true">↗</span></ButtonLink>
      </section>
      <Stats stats={data.stats} />
      <EventSummary events={data.events} />
    </div>
  )
}

function Stats({ stats }: { stats: DashboardStat[] }) {
  return (
    <section className="grid border-y border-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => {
        const number = String(index + 1).padStart(2, '0')
        return <div key={stat.label} className={`border-b border-[var(--border)] px-5 py-6 sm:border-r xl:border-b-0 ${index === 0 ? 'bg-[var(--accent-soft)]' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="eyebrow text-[var(--muted)]">{stat.label}</p>
            <span className="font-mono text-xs font-bold text-[var(--accent-strong)]">{number}</span>
          </div>
          <p className="mt-7 text-5xl font-black tracking-[-.1em] tabular-nums">{stat.value}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">{stat.note}</p>
        </div>
      })}
    </section>
  )
}

function EventSummary({ events }: { events: DashboardEvent[] }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <Card className="overflow-hidden">
        <div className="flex items-end justify-between border-b border-[var(--border)] px-6 py-6">
          <div><p className="eyebrow text-[var(--accent-strong)]">agenda organisasi</p><h3 className="mt-2 text-xl font-black">Acara FILKOM</h3></div>
          <Link to="/events" className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent-strong)]">Lihat semua ↗</Link>
        </div>
        {events.length > 0 ? <div className="divide-y divide-[var(--border)]">
          {events.map((event) => <EventRow key={event.id} event={event} />)}
        </div> : <div className="px-6 py-14 text-center"><p className="font-black">Belum ada acara</p><p className="mt-2 text-sm text-[var(--muted)]">Buat acara pertama untuk mulai mencatat kehadiran mahasiswa.</p></div>}
      </Card>
      <Card className="paper-grid bg-[var(--ink)] p-7 text-[#f7f4ed]"><p className="eyebrow text-[var(--accent)]">aksi cepat</p><h3 className="display-type mt-5 text-3xl leading-none">Scan QR,<br /><em>langsung hadir.</em></h3><p className="mt-5 text-sm leading-6 text-white/55">Arahkan kamera ke QR acara organisasi yang sedang dibuka panitia.</p><ButtonLink href="/scan" variant="accent" className="mt-8">Buka scanner <span aria-hidden="true">→</span></ButtonLink></Card>
    </section>
  )
}

function EventRow({ event }: { event: DashboardEvent }) {
  const details = `${event.event_date} · ${event.start_time}${event.location ? ` · ${event.location}` : ''}`
  return <Link to="/events" className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-[var(--surface-muted)]"><div className="min-w-0"><p className="truncate text-sm font-black">{event.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{details}</p></div><span className="shrink-0 border border-[var(--border)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--accent-strong)]">{event.status}</span></Link>
}
