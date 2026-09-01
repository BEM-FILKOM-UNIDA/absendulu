import { createFileRoute, Link } from '@tanstack/react-router'
import { getStudentHomeData } from '~/server/auth'
import { Badge, ButtonLink, Card } from '~/components/ui'

type StudentEvent = { id: string; name: string; event_date: string; start_time: string; location: string | null }
type AttendanceItem = { id: string; status: string; method: string; check_in_at: string; events: { name?: string } | { name?: string }[] | null }

export const Route = createFileRoute('/_auth/mahasiswa')({ loader: () => getStudentHomeData(), component: StudentHomePage })

function StudentHomePage() {
  const data = Route.useLoaderData()
  const firstName = data.profile?.full_name?.split(' ')[0] || 'Pengguna'
  return <div className="space-y-8"><section className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow text-[var(--accent-strong)]">workspace mahasiswa / FILKOM</p><h1 className="display-type mt-3 text-5xl leading-none tracking-[-.07em] sm:text-6xl">Halo,<br /><em>{firstName}.</em></h1><p className="mt-5 max-w-lg text-sm leading-6 text-[var(--muted)]">Lihat acara yang tersedia, scan QR saat hadir, dan pantau riwayat kehadiranmu sendiri.</p></div><ButtonLink href="/scan" variant="accent">Scan sekarang <span aria-hidden="true">↗</span></ButtonLink></section><StudentEvents events={data.events} openEventIds={data.openEventIds} /><StudentProfile email={data.auth.user?.email} nim={data.profile?.nim} /><StudentHistory attendance={data.attendance} /></div>
}

function StudentEvents({ events, openEventIds }: { events: StudentEvent[]; openEventIds: string[] }) {
  const open = new Set(openEventIds)
  return <Card className="overflow-hidden"><div className="flex items-end justify-between border-b border-[var(--border)] px-6 py-6"><div><p className="eyebrow text-[var(--accent-strong)]">agenda publik</p><h2 className="mt-2 text-xl font-black">Acara FILKOM</h2></div><Link to="/events" className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent-strong)]">Lihat semua ↗</Link></div>{events.length > 0 ? <div className="divide-y divide-[var(--border)]">{events.slice(0, 5).map((event) => <StudentEventRow key={event.id} event={event} isOpen={open.has(event.id)} />)}</div> : <div className="px-6 py-14 text-center text-sm text-[var(--muted)]">Belum ada acara mendatang.</div>}</Card>
}

function StudentEventRow({ event, isOpen }: { event: StudentEvent; isOpen: boolean }) {
  const details = `${event.event_date} · ${event.start_time}${event.location ? ` · ${event.location}` : ''}`
  return <Link to="/events" className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-[var(--surface-muted)]"><div className="min-w-0"><p className="truncate text-sm font-black">{event.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{details}</p></div><span className="shrink-0 text-xs font-black text-[var(--accent-strong)]">{isOpen ? 'Scan ↗' : 'Lihat'}</span></Link>
}

function StudentProfile({ email, nim }: { email: string | null | undefined; nim: string | null | undefined }) {
  const displayNim = nim || 'Belum diisi'
  return <Card className="bg-[var(--ink)] p-7 text-[#f7f4ed]"><p className="eyebrow text-[var(--accent)]">profil akun</p><h2 className="mt-4 text-2xl font-black">{displayNim}</h2><p className="mt-2 break-all text-sm text-white/55">{email}</p><p className="mt-6 text-sm text-white/55">Fakultas Ilmu Komputer</p><ButtonLink href="/profile" variant="accent" className="mt-7">Lihat profil ↗</ButtonLink></Card>
}

function StudentHistory({ attendance }: { attendance: AttendanceItem[] }) {
  return <Card className="overflow-hidden"><div className="flex items-end justify-between border-b border-[var(--border)] px-6 py-6"><div><p className="eyebrow text-[var(--accent-strong)]">catatan pribadi</p><h2 className="mt-2 text-xl font-black">Riwayat terbaru</h2></div><Link to="/attendance/history" className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent-strong)]">Lihat semua ↗</Link></div>{attendance.length > 0 ? <div className="divide-y divide-[var(--border)]">{attendance.map((item) => <AttendanceRow key={item.id} item={item} />)}</div> : <div className="px-6 py-12 text-sm text-[var(--muted)]">Belum ada riwayat absensi.</div>}</Card>
}

function AttendanceRow({ item }: { item: AttendanceItem }) {
  const event = Array.isArray(item.events) ? item.events[0] : item.events
  const eventName = event?.name || 'Acara'
  const checkIn = new Date(item.check_in_at).toLocaleString('id-ID')
  return <div className="flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center"><div><p className="text-sm font-black">{eventName}</p><p className="mt-1 text-xs text-[var(--muted)]">{checkIn} · {item.method}</p></div><Badge variant={item.status === 'hadir' ? 'success' : item.status === 'alpha' ? 'danger' : 'muted'}>{item.status}</Badge></div>
}
