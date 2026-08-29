import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: events } = await supabase.from('events').select('id, name, event_date, start_time, status, location').order('event_date', { ascending: false }).limit(4)
  const { data: profiles } = await supabase.from('profiles').select('id')
  const { data: sessions } = await supabase.from('attendance_sessions').select('id, attendances(id)').eq('is_open', true)
  const checkIns = sessions?.reduce((total, session) => total + (session.attendances?.length ?? 0), 0) ?? 0
  const stats = [{ label: 'Acara terbaru', value: events?.length ?? 0, note: 'dalam ruang kerja' }, { label: 'Pengguna', value: profiles?.length ?? 0, note: 'terdaftar resmi' }, { label: 'Sesi aktif', value: sessions?.length ?? 0, note: 'sedang berjalan' }, { label: 'Check-in', value: checkIns, note: 'di sesi aktif' }]

  return (
    <div className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow text-[var(--accent-strong)]">operational overview / today</p><h2 className="display-type mt-3 text-5xl leading-none tracking-[-.07em] sm:text-6xl">Selamat datang<br /><em>kembali.</em></h2><p className="mt-5 max-w-lg text-sm leading-6 text-[var(--muted)]">Satu pandangan untuk tahu apa yang sedang hadir, berjalan, dan perlu kamu tindak.</p></div><ButtonLink href="/scan" variant="accent">Scan QR <span aria-hidden="true">↗</span></ButtonLink></section>
      <section className="grid border-y border-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => <div key={stat.label} className={`border-b border-[var(--border)] px-5 py-6 sm:border-r xl:border-b-0 ${index === 0 ? 'bg-[var(--accent-soft)]' : ''}`}><div className="flex items-center justify-between"><p className="eyebrow text-[var(--muted)]">{stat.label}</p><span className="font-mono text-xs font-bold text-[var(--accent-strong)]">{String(index + 1).padStart(2, '0')}</span></div><p className="mt-7 text-5xl font-black tracking-[-.1em] tabular-nums">{stat.value}</p><p className="mt-2 text-xs text-[var(--muted)]">{stat.note}</p></div>)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="overflow-hidden"><div className="flex items-end justify-between border-b border-[var(--border)] px-6 py-6"><div><p className="eyebrow text-[var(--accent-strong)]">live inventory</p><h3 className="mt-2 text-xl font-black tracking-[-.04em]">Acara terbaru</h3></div><Link href="/events" className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent-strong)] hover:underline">Lihat semua ↗</Link></div>
          {events && events.length > 0 ? <div className="divide-y divide-[var(--border)]">{events.map((event) => <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[var(--surface-muted)]"><div className="min-w-0"><p className="truncate text-sm font-black">{event.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{event.event_date} · {event.start_time}{event.location ? ` · ${event.location}` : ''}</p></div><span className="shrink-0 border border-[var(--border)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] text-[var(--accent-strong)]">{event.status}</span></Link>)}</div> : <div className="px-6 py-14 text-center"><p className="font-black">Belum ada acara</p><p className="mt-2 text-sm text-[var(--muted)]">Buat acara pertama untuk mulai mencatat kehadiran.</p></div>}
        </Card>
        <Card className="paper-grid bg-[var(--ink)] p-7 text-[#f7f4ed]"><p className="eyebrow text-[var(--accent)]">quick action</p><h3 className="display-type mt-5 text-3xl leading-none tracking-[-.05em]">Tangkap<br /><em>sinyalnya.</em></h3><p className="mt-5 text-sm leading-6 text-white/55">Buka scanner dan arahkan kamera ke QR code sesi yang sedang aktif.</p><ButtonLink href="/scan" variant="accent" className="mt-8">Buka scanner <span aria-hidden="true">→</span></ButtonLink></Card>
      </section>
    </div>
  )
}
