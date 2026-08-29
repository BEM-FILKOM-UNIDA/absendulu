import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import DeleteEventButton from '@/components/events/DeleteEventButton'

const statusLabels: Record<string, string> = { active: 'Berlangsung', draft: 'Draft', completed: 'Selesai', cancelled: 'Dibatalkan' }

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await getCurrentUser()
  const admin = createAdminClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, name, description, event_date, start_time, end_time, location, status')
    .eq('id', id)
    .maybeSingle()
  if (!event) notFound()
  const { data: session } = await admin
    .from('attendance_sessions')
    .select('id, event_id, is_open')
    .eq('event_id', id)
    .eq('is_open', true)
    .maybeSingle()
  const { count: attendanceCount } = session
    ? await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id)
    : { count: 0 }
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).single() : { data: null }
  const canManage = profile?.role === 'admin_bem' || profile?.role === 'admin'

  return <div className="max-w-5xl space-y-8"><Link href="/events" className="eyebrow inline-flex text-[var(--accent-strong)] hover:underline">← kembali ke acara</Link><section className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-start"><div className="min-w-0"><p className="eyebrow text-[var(--muted-soft)]">detail acara / {event.event_date}</p><h1 className="display-type mt-3 max-w-3xl break-words text-4xl leading-none tracking-[-.07em] sm:text-6xl">{event.name}</h1>{event.description && <p className="mt-5 max-w-xl break-words text-sm leading-6 text-[var(--muted)]">{event.description}</p>}</div><Badge variant={event.status === 'active' ? 'success' : event.status === 'cancelled' ? 'danger' : 'muted'}>{statusLabels[event.status] || event.status}</Badge></section><section className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3"><div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">tanggal</p><p className="mt-3 font-black">{event.event_date}</p></div><div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">waktu</p><p className="mt-3 font-black">{event.start_time}{event.end_time ? ` — ${event.end_time}` : ''}</p></div><div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">lokasi</p><p className="mt-3 font-black">{event.location || 'Belum ditentukan'}</p></div></section>{session ? <section className="border border-[var(--accent-strong)] bg-[var(--accent-soft)] p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="eyebrow text-[var(--accent-strong)]">absensi sedang dibuka</p><h2 className="mt-2 text-2xl font-black tracking-[-.05em]">{attendanceCount ?? 0} mahasiswa sudah hadir</h2><p className="mt-2 text-sm text-[var(--muted)]">QR aktif—tampilkan kepada mahasiswa yang datang.</p></div><ButtonLink href={`/events/${id}/qr`} variant="primary">Lihat QR <span aria-hidden="true">↗</span></ButtonLink></div></section> : canManage ? <form action={`/api/events/${id}/session/open`} method="POST" className="border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center"><p className="eyebrow text-[var(--muted-soft)]">absensi belum dibuka</p><h2 className="mt-3 text-2xl font-black">Nyalakan sesi absensi</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">QR code akan menjadi titik masuk peserta untuk acara ini.</p><button type="submit" className="mt-6 inline-flex min-h-11 items-center justify-center bg-[var(--ink)] px-5 text-sm font-bold text-[#f7f4ed] hover:bg-[var(--accent-strong)]">Buka sesi absensi</button></form> : <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center"><p className="text-sm text-[var(--muted)]">Sesi absensi belum dibuka oleh admin.</p></div>}{canManage && <DeleteEventButton eventId={event.id} eventName={event.name} />}</div>
}
