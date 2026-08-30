import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/supabase/server'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default async function DashboardPage() {
  const { supabase, user } = await getCurrentUser()
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
  if (!isAdminRole(profile?.role)) redirect('/scan')

  const admin = createAdminClient()
  const [eventsResult, profilesResult, sessionsResult] = await Promise.all([
    admin
      .from('events')
      .select('id, name, event_date, start_time, status, location')
      .order('event_date', { ascending: false })
      .limit(4),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('attendance_sessions').select('id').eq('is_open', true),
  ])
  const events = eventsResult.data
  const sessionIds = sessionsResult.data?.map((session) => session.id) ?? []
  const { count: checkIns } = sessionIds.length > 0
    ? await admin.from('attendances').select('id', { count: 'exact', head: true }).in('session_id', sessionIds)
    : { count: 0 }
  const stats = [{ label: 'Acara terdekat', value: events?.length ?? 0, note: 'tercatat di Absendulu' }, { label: 'Mahasiswa', value: profilesResult.count ?? 0, note: 'terdaftar di FILKOM' }, { label: 'Absensi aktif', value: sessionIds.length, note: 'sedang dibuka' }, { label: 'Sudah hadir', value: checkIns ?? 0, note: 'di acara berjalan' }]

  return (
    <div className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow text-[var(--accent-strong)]">Absendulu / FILKOM UNIDA</p><h2 className="display-type mt-3 text-5xl leading-none tracking-[-.07em] sm:text-6xl">Siap hadir<br /><em>di acara.</em></h2><p className="mt-5 max-w-lg text-sm leading-6 text-[var(--muted)]">Pantau acara organisasi FILKOM, buka absensi, dan lihat siapa saja yang sudah hadir—semua dalam satu tempat.</p></div><ButtonLink href="/scan" variant="accent">Scan untuk hadir <span aria-hidden="true">↗</span></ButtonLink></section>
      <section className="grid border-y border-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => <div key={stat.label} className={`border-b border-[var(--border)] px-5 py-6 sm:border-r xl:border-b-0 ${index === 0 ? 'bg-[var(--accent-soft)]' : ''}`}><div className="flex items-center justify-between"><p className="eyebrow text-[var(--muted)]">{stat.label}</p><span className="font-mono text-xs font-bold text-[var(--accent-strong)]">{String(index + 1).padStart(2, '0')}</span></div><p className="mt-7 text-5xl font-black tracking-[-.1em] tabular-nums">{stat.value}</p><p className="mt-2 text-xs text-[var(--muted)]">{stat.note}</p></div>)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="overflow-hidden"><div className="flex items-end justify-between border-b border-[var(--border)] px-6 py-6"><div><p className="eyebrow text-[var(--accent-strong)]">agenda organisasi</p><h3 className="mt-2 text-xl font-black tracking-[-.04em]">Acara FILKOM</h3></div><Link href="/events" className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent-strong)] hover:underline">Lihat semua ↗</Link></div>
          {events && events.length > 0 ? <div className="divide-y divide-[var(--border)]">{events.map((event) => <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[var(--surface-muted)]"><div className="min-w-0"><p className="truncate text-sm font-black">{event.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{event.event_date} · {event.start_time}{event.location ? ` · ${event.location}` : ''}</p></div><span className="shrink-0 border border-[var(--border)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] text-[var(--accent-strong)]">{event.status}</span></Link>)}</div> : <div className="px-6 py-14 text-center"><p className="font-black">Belum ada acara</p><p className="mt-2 text-sm text-[var(--muted)]">Buat acara pertama untuk mulai mencatat kehadiran mahasiswa.</p></div>}
        </Card>
        <Card className="paper-grid bg-[var(--ink)] p-7 text-[#f7f4ed]"><p className="eyebrow text-[var(--accent)]">aksi cepat</p><h3 className="display-type mt-5 text-3xl leading-none tracking-[-.05em]">Scan QR,<br /><em>langsung hadir.</em></h3><p className="mt-5 text-sm leading-6 text-white/55">Arahkan kamera ke QR acara organisasi yang sedang dibuka panitia.</p><ButtonLink href="/scan" variant="accent" className="mt-8">Buka scanner <span aria-hidden="true">→</span></ButtonLink></Card>
      </section>
    </div>
  )
}
