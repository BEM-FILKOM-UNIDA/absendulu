import { Await, createFileRoute, defer } from '@tanstack/react-router'
import { Suspense } from 'react'
import { getHistoryData } from '~/server/data'
import { Badge, Card } from '~/components/ui'

type HistoryData = Awaited<ReturnType<typeof getHistoryData>>
type HistoryItem = HistoryData['attendances'][number]

export const Route = createFileRoute('/_auth/attendance/history')({
  loader: () => ({ data: defer(getHistoryData()) }),
  component: HistoryPage,
})

function HistoryPage() {
  const { data } = Route.useLoaderData()
  return (
    <div className="space-y-8">
      <section className="border-b border-(--border) pb-8">
        <p className="eyebrow text-(--accent-strong)">riwayat kehadiran / FILKOM</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Jejak<br /><em>kehadiranmu.</em></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-(--muted)">Pantau catatan absensi yang sudah tercatat di Absendulu.</p>
      </section>
      <Suspense fallback={<HistoryPending />}>
        <Await promise={data} fallback={<HistoryPending />}>
          {(resolved: HistoryData) => <HistoryContent attendances={resolved.attendances} isAdmin={resolved.isAdmin} />}
        </Await>
      </Suspense>
    </div>
  )
}

function HistoryContent({ attendances, isAdmin }: { attendances: HistoryItem[]; isAdmin: boolean }) {
  const heading = isAdmin ? 'rekap operasional' : 'absensi pribadi'
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-(--border) px-5 py-5">
        <p className="eyebrow text-(--accent-strong)">{heading}</p>
        <h2 className="mt-2 text-lg font-black">Riwayat terbaru</h2>
      </div>
      {attendances.length > 0 ? (
        <div className="divide-y divide-(--border)">
          {attendances.map((attendance) => <HistoryRow key={attendance.id} attendance={attendance} isAdmin={isAdmin} />)}
        </div>
      ) : (
        <div className="px-6 py-16 text-center text-sm text-(--muted)">Belum ada riwayat absensi.</div>
      )}
    </Card>
  )
}

function HistoryRow({ attendance, isAdmin }: { attendance: HistoryItem; isAdmin: boolean }) {
  const event = Array.isArray(attendance.events) ? attendance.events[0] : attendance.events
  const eventName = event?.name || 'Acara'
  const participant = attendance.profiles?.full_name || 'Peserta'
  const nim = attendance.profiles?.nim || '-'
  const checkIn = new Date(attendance.check_in_at).toLocaleString('id-ID')
  const variant = attendance.status === 'hadir' ? 'success' : attendance.status === 'alpha' ? 'danger' : 'muted'
  return (
    <div className="flex flex-col justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center">
      <div>
        <p className="font-black">{eventName}</p>
        {isAdmin ? <p className="mt-1 text-xs font-bold text-(--muted)">{participant} · {nim}</p> : null}
        <p className="mt-2 text-xs text-(--muted)">{checkIn} · {attendance.method}</p>
        {attendance.notes ? <p className="mt-2 text-xs text-(--muted)">Catatan: {attendance.notes}</p> : null}
      </div>
      <Badge variant={variant}>{attendance.status}</Badge>
    </div>
  )
}

function HistoryPending() {
  return (
    <div className="space-y-3" aria-label="Memuat riwayat" role="status">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse bg-(--surface-muted)" />
      ))}
    </div>
  )
}
