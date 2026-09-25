import { Await, createFileRoute, defer } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { getHistoryData } from '~/server/data'
import { Badge, Card } from '~/components/ui'
import { defaultHistoryFilters, filterHistory } from '~/lib/attendance/history-filters'

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
  const [filters, setFilters] = useState(defaultHistoryFilters)
  const filteredAttendances = useMemo(() => filterHistory(attendances, filters, isAdmin), [attendances, filters, isAdmin])
  const hasActiveFilters = filters.query.trim() !== '' || filters.status !== defaultHistoryFilters.status
  const heading = isAdmin ? 'rekap operasional' : 'absensi pribadi'

  function updateQuery(query: string) {
    setFilters((current) => ({ ...current, query }))
  }

  function updateStatus(status: typeof filters.status) {
    setFilters((current) => ({ ...current, status }))
  }

  function resetFilters() {
    setFilters(defaultHistoryFilters)
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-(--border) px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-(--accent-strong)">{heading}</p>
          <h2 className="mt-2 text-lg font-black">Riwayat terbaru</h2>
        </div>
        <p className="font-mono text-xs text-(--muted)">{hasActiveFilters ? `${filteredAttendances.length} dari ${attendances.length} riwayat` : `${attendances.length} riwayat`}</p>
      </div>
      <div className="border-b border-(--border) bg-(--surface-muted)/40 px-5 py-4 sm:px-6">
        <p className="eyebrow text-(--muted)">filter riwayat</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center">
          <label className="relative block">
            <span className="sr-only">{isAdmin ? 'Cari acara atau peserta' : 'Cari acara'}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)" />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder={isAdmin ? 'Cari acara, peserta, atau NIM/NIP' : 'Cari acara'}
              className="h-11 w-full border border-(--border) bg-(--surface-strong) pl-10 pr-4 text-sm placeholder:text-(--muted-soft) focus:border-(--accent-strong) focus:outline-none"
              aria-label={isAdmin ? 'Cari acara atau peserta' : 'Cari acara'}
            />
          </label>
          <label>
            <span className="sr-only">Filter status kehadiran</span>
            <select
              value={filters.status}
              onChange={(event) => updateStatus(event.target.value as typeof filters.status)}
              className="h-11 w-full border border-(--border) bg-(--surface-strong) px-3 text-sm focus:border-(--accent-strong) focus:outline-none"
              aria-label="Filter status kehadiran"
            >
              <option value="all">Semua status</option>
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
            </select>
          </label>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-(--border) px-4 text-sm font-bold text-(--accent-strong) transition-colors hover:border-(--accent-strong) hover:bg-(--surface-strong) disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>
      {filteredAttendances.length > 0 ? (
        <div className="divide-y divide-(--border)">
          {filteredAttendances.map((attendance) => <HistoryRow key={attendance.id} attendance={attendance} isAdmin={isAdmin} />)}
        </div>
      ) : attendances.length > 0 ? (
        <div className="space-y-4 px-6 py-16 text-center">
          <p className="text-sm text-(--muted)">Tidak ada riwayat yang cocok dengan filter.</p>
          <button type="button" onClick={resetFilters} className="text-xs font-black uppercase tracking-widest text-(--accent-strong) hover:underline">Reset filter</button>
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
