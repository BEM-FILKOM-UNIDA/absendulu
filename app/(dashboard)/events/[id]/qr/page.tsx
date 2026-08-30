import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import QRDisplay from '@/components/attendance/QRDisplay'
import AttendanceCounter from '@/components/attendance/AttendanceCounter'
import { Card } from '@/components/ui/card'

export default async function QRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await getCurrentUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  if (!isAdminRole(profile?.role)) redirect('/scan')

  const { data: event } = await supabase.from('events').select('id, name, event_date, start_time, end_time, location, status').eq('id', id).maybeSingle()
  if (!event) notFound()
  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('id, event_id, is_open, qr_token, opened_at, closed_at')
    .eq('event_id', id)
    .eq('is_open', true)
    .maybeSingle()

  if (!session) return <div className="mx-auto max-w-xl space-y-6 py-12 text-center"><p className="eyebrow text-[var(--muted-soft)]">belum ada QR aktif</p><h1 className="display-type text-4xl leading-none sm:text-5xl">Absensi belum<br /><em>dibuka.</em></h1><p className="text-sm text-[var(--muted)]">Buka absensi dari halaman detail acara terlebih dahulu.</p><Link href={`/events/${id}`} className="inline-flex text-xs font-black uppercase tracking-[.12em] text-[var(--accent-strong)] hover:underline">← Kembali ke acara</Link></div>

  const { count } = await supabase.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id)

  return <main className="paper-noise -mx-5 -my-7 min-h-[calc(100dvh-6rem)] max-w-[100vw] overflow-x-hidden bg-[var(--ink)] px-4 py-6 text-[#f7f4ed] sm:-mx-8 sm:-my-9 sm:px-8 sm:py-12"><div className="mx-auto w-full min-w-0 max-w-6xl"><div className="mb-6 flex min-w-0 flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:pb-6"><div className="min-w-0"><Link href={`/events/${id}`} className="eyebrow block truncate text-[var(--accent)] hover:underline">← {event.name}</Link><p className="mt-3 text-sm leading-6 text-white/45">Tampilkan QR ini agar mahasiswa dapat melakukan absensi.</p></div><span className="flex items-center gap-2 text-xs font-black uppercase tracking-[.1em] text-[var(--lime)]"><span className="signal-pulse h-2 w-2 rounded-full bg-[var(--lime)]" /> absensi dibuka</span></div><div className="grid w-full min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.42fr)] lg:gap-10"><Card className="w-full min-w-0 bg-[var(--paper)] p-4 text-[var(--ink)] shadow-[8px_10px_0_var(--accent)] sm:p-10 sm:shadow-[12px_14px_0_var(--accent)]"><QRDisplay token={session.qr_token} eventName={event.name} /></Card><div className="w-full min-w-0 space-y-5"><AttendanceCounter sessionId={session.id} eventId={event.id} initialCount={count || 0} /><form action={`/api/events/${id}/session/close`} method="POST"><button type="submit" className="w-full border border-white/20 px-5 py-3 text-sm font-bold text-white/65 hover:border-[#ffb5ad] hover:bg-[#b84c4c]/20 hover:text-[#ffb5ad]">Tutup sesi absensi</button></form></div></div></div></main>
}
