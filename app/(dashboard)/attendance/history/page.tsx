import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type AttendanceRecord = {
  id: string
  status: string
  method: string
  check_in_at: string
  profiles: { full_name?: string; nim?: string } | null
  events: { name?: string } | null
}

const statusLabels: Record<string, string> = { hadir: 'Hadir', terlambat: 'Terlambat', izin: 'Izin', alpha: 'Alpha' }

export default async function AttendanceHistoryPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('attendances')
    .select('id, user_id, status, method, check_in_at, events(name)')
    .order('check_in_at', { ascending: false })
    .limit(100)
  const attendanceRows = data ?? []
  const userIds = [...new Set(attendanceRows.map((attendance) => attendance.user_id))]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, nim').in('id', userIds)
    : { data: [] }
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const attendances = attendanceRows.map((attendance) => ({
    ...attendance,
    profiles: profilesById.get(attendance.user_id) ?? null,
  })) as unknown as AttendanceRecord[]
  const byEvent: Record<string, AttendanceRecord[]> = {}

  attendances.forEach((attendance) => {
    const name = attendance.events?.name || 'Acara tanpa nama'
    if (!byEvent[name]) byEvent[name] = []
    byEvent[name].push(attendance)
  })

  const eventEntries = Object.entries(byEvent)

  return (
    <div className="space-y-8">
      <section className="border-b border-[var(--border)] pb-8">
        <p className="eyebrow text-[var(--accent-strong)]">rekap absensi / arsip FILKOM</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Jejak<br /><em>kehadiranmu.</em></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Semua scan QR tersusun berdasarkan acara organisasi. Rekap rapi, tanpa kertas dan tanpa spreadsheet berantakan.</p>
      </section>

      {eventEntries.length > 0 ? eventEntries.map(([name, records]) => (
        <Card key={name} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5 sm:px-6">
            <div><p className="eyebrow text-[var(--accent-strong)]">rekap per acara</p><h2 className="mt-2 text-lg font-black">{name}</h2></div>
            <span className="font-mono text-xs text-[var(--muted)]">{records.length} check-in</span>
          </div>
          <div className="overflow-x-auto overscroll-x-contain"><p className="mb-2 px-5 text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted-soft)] sm:hidden">Geser tabel ke samping untuk melihat semua kolom.</p>
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[10px] font-black uppercase tracking-[.1em] text-[var(--muted)]"><tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">NIM/NIP</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Metode</th><th className="px-5 py-3">Waktu</th></tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {records.map((attendance) => {
                  const variant = attendance.status === 'hadir' ? 'success' : attendance.status === 'alpha' ? 'danger' : 'muted'
                  return <tr key={attendance.id} className="hover:bg-[var(--surface-muted)]"><td className="px-5 py-4 font-semibold">{attendance.profiles?.full_name || '-'}</td><td className="px-5 py-4 text-[var(--muted)]">{attendance.profiles?.nim || '-'}</td><td className="px-5 py-4"><Badge variant={variant}>{statusLabels[attendance.status] || attendance.status}</Badge></td><td className="px-5 py-4 text-xs font-bold text-[var(--muted)]">{attendance.method}</td><td className="px-5 py-4 text-xs text-[var(--muted)]">{new Date(attendance.check_in_at).toLocaleString('id-ID')}</td></tr>
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )) : <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-20 text-center"><p className="eyebrow text-[var(--accent-strong)]">belum ada riwayat</p><h2 className="display-type mt-4 text-3xl">Belum ada jejak.</h2><p className="mt-3 text-sm text-[var(--muted)]">Riwayat akan muncul setelah mahasiswa melakukan scan QR.</p></div>}
    </div>
  )
}
