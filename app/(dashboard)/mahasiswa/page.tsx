import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'

type EventRow = {
  id: string
  name: string
  event_date: string
  start_time: string
  location: string | null
}

type AttendanceRow = {
  id: string
  status: string
  method: string
  check_in_at: string
  events: { name?: string } | { name?: string }[] | null
}

const statusLabels: Record<string, string> = {
  hadir: 'Hadir',
  terlambat: 'Terlambat',
  izin: 'Izin',
  alpha: 'Alpha',
}

export default async function StudentHomePage() {
  const { supabase, user } = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, nim, role, account_status, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (isAdminRole(profile?.role)) redirect('/dashboard')
  if (!profile || profile.account_status !== 'active' || !profile.is_active) redirect('/complete-profile')

  const admin = createAdminClient()
  const [{ data: eventData }, { data: attendanceData }] = await Promise.all([
    admin
      .from('events')
      .select('id, name, event_date, start_time, location')
      .eq('status', 'active')
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(8),
    admin
      .from('attendances')
      .select('id, status, method, check_in_at, events(name)')
      .eq('user_id', user.id)
      .order('check_in_at', { ascending: false })
      .limit(5),
  ])

  const events = (eventData ?? []) as EventRow[]
  const attendance = (attendanceData ?? []) as AttendanceRow[]
  const eventIds = events.map((event) => event.id)
  const { data: openSessions } = eventIds.length > 0
    ? await admin.from('attendance_sessions').select('event_id').in('event_id', eventIds).eq('is_open', true)
    : { data: [] }
  const openEventIds = new Set((openSessions ?? []).map((session) => session.event_id))
  const firstName = profile.full_name.split(' ')[0] || profile.full_name

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-[var(--accent-strong)]">workspace mahasiswa / FILKOM</p>
          <h1 className="display-type mt-3 text-5xl leading-none tracking-[-.07em] sm:text-6xl">
            Halo,<br /><em>{firstName}.</em>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--muted)]">Lihat acara yang tersedia, scan QR saat hadir, dan pantau riwayat kehadiranmu sendiri.</p>
        </div>
        <ButtonLink href="/scan" variant="accent">Scan sekarang <span aria-hidden="true">↗</span></ButtonLink>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="overflow-hidden">
          <div className="flex items-end justify-between border-b border-[var(--border)] px-6 py-6">
            <div>
              <p className="eyebrow text-[var(--accent-strong)]">agenda publik</p>
              <h2 className="mt-2 text-xl font-black">Acara FILKOM</h2>
            </div>
            <Link href="/events" className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent-strong)] hover:underline">Lihat semua ↗</Link>
          </div>
          {events.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {events.slice(0, 5).map((event) => {
                const actionLabel = openEventIds.has(event.id) ? 'Scan ↗' : 'Lihat'
                return (
                  <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[var(--surface-muted)]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{event.name}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">{event.event_date} · {event.start_time}{event.location ? ` · ${event.location}` : ''}</p>
                    </div>
                    <span className="shrink-0 text-xs font-black text-[var(--accent-strong)]">{actionLabel}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="font-black">Belum ada acara mendatang</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Acara yang sudah dipublikasikan akan muncul di sini.</p>
            </div>
          )}
        </Card>

        <Card className="bg-[var(--ink)] p-7 text-[#f7f4ed]">
          <p className="eyebrow text-[var(--accent)]">profil akun</p>
          <h2 className="mt-4 text-2xl font-black tracking-[-.05em]">{profile.nim}</h2>
          <p className="mt-2 break-all text-sm text-white/55">{user.email}</p>
          <p className="mt-6 text-sm leading-6 text-white/55">Fakultas Ilmu Komputer</p>
          <ButtonLink href="/profile" variant="accent" className="mt-7">Lihat profil <span aria-hidden="true">↗</span></ButtonLink>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex items-end justify-between border-b border-[var(--border)] px-6 py-6">
          <div>
            <p className="eyebrow text-[var(--accent-strong)]">catatan pribadi</p>
            <h2 className="mt-2 text-xl font-black">Riwayat terbaru</h2>
          </div>
          <Link href="/attendance/history" className="text-xs font-black uppercase tracking-[.1em] text-[var(--accent-strong)] hover:underline">Lihat semua ↗</Link>
        </div>
        {attendance.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {attendance.map((item) => {
              const event = Array.isArray(item.events) ? item.events[0] : item.events
              const eventName = event?.name || 'Acara'
              const checkedInAt = new Date(item.check_in_at).toLocaleString('id-ID')
              return (
                <div key={item.id} className="flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-black">{eventName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{checkedInAt} · {item.method}</p>
                  </div>
                  <Badge variant={item.status === 'hadir' ? 'success' : item.status === 'alpha' ? 'danger' : 'muted'}>{statusLabels[item.status] || item.status}</Badge>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-sm text-[var(--muted)]">Belum ada riwayat absensi.</div>
        )}
      </Card>
    </div>
  )
}
