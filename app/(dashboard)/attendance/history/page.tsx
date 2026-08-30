import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type AttendanceRecord = {
  id: string
  user_id: string
  status: string
  method: string
  check_in_at: string
  notes: string | null
  profiles: { full_name?: string; nim?: string } | null
  events: { name?: string } | { name?: string }[] | null
}

const statusLabels: Record<string, string> = {
  hadir: 'Hadir',
  terlambat: 'Terlambat',
  izin: 'Izin',
  alpha: 'Alpha',
}

function getEventName(events: AttendanceRecord['events']): string {
  const event = Array.isArray(events) ? events[0] : events
  return event?.name || 'Acara'
}

function formatCheckIn(value: string): string {
  return new Date(value).toLocaleString('id-ID')
}

function statusVariant(status: string): 'success' | 'danger' | 'muted' {
  if (status === 'hadir') return 'success'
  if (status === 'alpha') return 'danger'
  return 'muted'
}

export default async function AttendanceHistoryPage() {
  const { supabase, user } = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status, is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.account_status !== 'active' || !profile.is_active) redirect('/complete-profile')

  const isAdmin = isAdminRole(profile.role)
  const database = isAdmin ? createAdminClient() : supabase
  let attendanceQuery = database
    .from('attendances')
    .select('id, user_id, status, method, check_in_at, notes, events(name)')
    .order('check_in_at', { ascending: false })
    .limit(isAdmin ? 100 : 50)
  if (!isAdmin) attendanceQuery = attendanceQuery.eq('user_id', user.id)

  const { data } = await attendanceQuery
  const rows = (data ?? []) as unknown as AttendanceRecord[]
  const userIds = isAdmin ? [...new Set(rows.map((attendance) => attendance.user_id))] : []
  const { data: profiles } = isAdmin && userIds.length > 0
    ? await createAdminClient().from('profiles').select('id, full_name, nim').in('id', userIds)
    : { data: [] }
  const profilesById = new Map((profiles ?? []).map((item) => [item.id, item]))
  const attendances = rows.map((attendance) => ({
    ...attendance,
    profiles: isAdmin ? profilesById.get(attendance.user_id) ?? null : null,
  }))

  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <section className="border-b border-[var(--border)] pb-8">
          <p className="eyebrow text-[var(--accent-strong)]">riwayat saya / FILKOM</p>
          <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Jejak<br /><em>kehadiranmu.</em></h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Hanya kamu yang dapat melihat riwayat absensimu.</p>
        </section>
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-5">
            <p className="eyebrow text-[var(--accent-strong)]">absensi pribadi</p>
            <h2 className="mt-2 text-lg font-black">Riwayat terbaru</h2>
          </div>
          {attendances.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {attendances.map((attendance) => {
                const eventName = getEventName(attendance.events)
                const checkedInAt = formatCheckIn(attendance.check_in_at)
                return (
                  <div key={attendance.id} className="flex flex-col justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-black">{eventName}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">{checkedInAt} · {attendance.method}</p>
                      {attendance.notes && <p className="mt-2 text-xs text-[var(--muted)]">Catatan: {attendance.notes}</p>}
                    </div>
                    <Badge variant={statusVariant(attendance.status)}>{statusLabels[attendance.status] || attendance.status}</Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">Belum ada riwayat absensi.</div>
          )}
        </Card>
      </div>
    )
  }

  const byEvent: Record<string, typeof attendances> = {}
  attendances.forEach((attendance) => {
    const name = getEventName(attendance.events)
    if (!byEvent[name]) byEvent[name] = []
    byEvent[name].push(attendance)
  })
  const eventEntries = Object.entries(byEvent)

  return (
    <div className="space-y-8">
      <section className="border-b border-[var(--border)] pb-8">
        <p className="eyebrow text-[var(--accent-strong)]">rekap absensi / arsip FILKOM</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Jejak<br /><em>kehadiranmu.</em></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Rekap operasional seluruh peserta berdasarkan acara.</p>
      </section>
      {eventEntries.length > 0 ? (
        eventEntries.map(([name, records]) => (
          <Card key={name} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5 sm:px-6">
              <div>
                <p className="eyebrow text-[var(--accent-strong)]">rekap per acara</p>
                <h2 className="mt-2 text-lg font-black">{name}</h2>
              </div>
              <span className="font-mono text-xs text-[var(--muted)]">{records.length} check-in</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-[var(--surface-muted)] text-left text-[10px] font-black uppercase tracking-[.1em] text-[var(--muted)]">
                  <tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">NIM/NIP</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Metode</th><th className="px-5 py-3">Waktu</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {records.map((attendance) => {
                    const fullName = attendance.profiles?.full_name || '-'
                    const nim = attendance.profiles?.nim || '-'
                    const checkedInAt = formatCheckIn(attendance.check_in_at)
                    return (
                      <tr key={attendance.id} className="hover:bg-[var(--surface-muted)]">
                        <td className="px-5 py-4 font-semibold">{fullName}</td>
                        <td className="px-5 py-4 text-[var(--muted)]">{nim}</td>
                        <td className="px-5 py-4"><Badge variant={statusVariant(attendance.status)}>{statusLabels[attendance.status] || attendance.status}</Badge></td>
                        <td className="px-5 py-4 text-xs font-bold text-[var(--muted)]">{attendance.method}</td>
                        <td className="px-5 py-4 text-xs text-[var(--muted)]">{checkedInAt}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      ) : (
        <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-20 text-center">
          <p className="eyebrow text-[var(--accent-strong)]">belum ada riwayat</p>
          <h2 className="display-type mt-4 text-3xl">Belum ada jejak.</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">Riwayat akan muncul setelah mahasiswa melakukan scan QR.</p>
        </div>
      )}
    </div>
  )
}
