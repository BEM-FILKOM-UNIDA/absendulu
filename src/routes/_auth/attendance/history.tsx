import { createFileRoute } from '@tanstack/react-router'
import { getHistoryData } from '~/server/data'
import { Badge, Card } from '~/components/ui'

type HistoryItem = { id: string; user_id: string; status: string; method: string; check_in_at: string; notes: string | null; events: { name?: string } | { name?: string }[] | null; profiles: { full_name?: string; nim?: string } | null }

export const Route = createFileRoute('/_auth/attendance/history')({ loader: () => getHistoryData(), component: HistoryPage })

function HistoryPage() {
  const { attendances, isAdmin } = Route.useLoaderData()
  const eyebrow = isAdmin ? 'rekap absensi / arsip FILKOM' : 'riwayat saya / FILKOM'
  const description = isAdmin ? 'Rekap operasional seluruh peserta berdasarkan acara.' : 'Hanya kamu yang dapat melihat riwayat absensimu.'
  const heading = isAdmin ? 'rekap operasional' : 'absensi pribadi'
  return (
    <div className="space-y-8">
      <section className="border-b border-[var(--border)] pb-8"><p className="eyebrow text-[var(--accent-strong)]">{eyebrow}</p><h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Jejak<br /><em>kehadiranmu.</em></h1><p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p></section>
      <Card className="overflow-hidden"><div className="border-b border-[var(--border)] px-5 py-5"><p className="eyebrow text-[var(--accent-strong)]">{heading}</p><h2 className="mt-2 text-lg font-black">Riwayat terbaru</h2></div>{attendances.length > 0 ? <div className="divide-y divide-[var(--border)]">{attendances.map((attendance) => <HistoryRow key={attendance.id} attendance={attendance} isAdmin={isAdmin} />)}</div> : <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">Belum ada riwayat absensi.</div>}</Card>
    </div>
  )
}

function HistoryRow({ attendance, isAdmin }: { attendance: HistoryItem; isAdmin: boolean }) {
  const event = Array.isArray(attendance.events) ? attendance.events[0] : attendance.events
  const eventName = event?.name || 'Acara'
  const participant = attendance.profiles?.full_name || 'Peserta'
  const nim = attendance.profiles?.nim || '-'
  const checkIn = new Date(attendance.check_in_at).toLocaleString('id-ID')
  const variant = attendance.status === 'hadir' ? 'success' : attendance.status === 'alpha' ? 'danger' : 'muted'
  return <div className="flex flex-col justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center"><div><p className="font-black">{eventName}</p>{isAdmin ? <p className="mt-1 text-xs font-bold text-[var(--muted)]">{participant} · {nim}</p> : null}<p className="mt-2 text-xs text-[var(--muted)]">{checkIn} · {attendance.method}</p>{attendance.notes ? <p className="mt-2 text-xs text-[var(--muted)]">Catatan: {attendance.notes}</p> : null}</div><Badge variant={variant}>{attendance.status}</Badge></div>
}
