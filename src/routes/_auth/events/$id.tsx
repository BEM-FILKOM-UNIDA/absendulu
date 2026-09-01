import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getEventDetailData } from '~/server/data'
import { Badge, ButtonLink } from '~/components/ui'

const statusLabels: Record<string, string> = {
  active: 'Berlangsung',
  draft: 'Draft',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const Route = createFileRoute('/_auth/events/$id')({
  loader: ({ params }) => getEventDetailData({ data: { id: params.id } }),
  component: EventDetailPage,
})

function EventDetailPage() {
  const navigate = useNavigate()
  const { event, isAdmin, session, attendanceCount } = Route.useLoaderData()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const variant = event.status === 'active' ? 'success' : event.status === 'cancelled' ? 'danger' : 'muted'

  async function openSession() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/events/${event.id}/session/open`, { method: 'POST' })
      if (!response.ok && response.status !== 303) {
        const result = await response.json().catch(() => null)
        setError(result?.error || 'Sesi gagal dibuka.')
        return
      }
      await navigate({ to: '/events/$id/qr', params: { id: event.id } })
    } catch {
      setError('Sesi gagal dibuka. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteEvent() {
    if (!window.confirm(`Hapus acara “${event.name}”? Data absensi dan sesi QR juga akan dihapus.`)) return
    setLoading(true)
    const response = await fetch(`/api/events/${event.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      setError(result?.error || 'Acara gagal dihapus.')
      setLoading(false)
      return
    }
    await navigate({ to: '/events' })
  }

  return (
    <div className="max-w-5xl space-y-8">
      <Link to="/events" className="eyebrow inline-flex text-[var(--accent-strong)] hover:underline">← kembali ke acara</Link>
      <section className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="eyebrow text-[var(--muted-soft)]">detail acara / {event.event_date}</p>
          <h1 className="display-type mt-3 max-w-3xl break-words text-4xl leading-none tracking-[-.07em] sm:text-6xl">{event.name}</h1>
          {event.description ? <p className="mt-5 max-w-xl break-words text-sm leading-6 text-[var(--muted)]">{event.description}</p> : null}
        </div>
        <Badge variant={variant}>{statusLabels[event.status] || event.status}</Badge>
      </section>

      <section className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
        <div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">tanggal</p><p className="mt-3 font-black">{event.event_date}</p></div>
        <div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">waktu</p><p className="mt-3 font-black">{event.start_time}{event.end_time ? ` — ${event.end_time}` : ''}</p></div>
        <div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">lokasi</p><p className="mt-3 font-black">{event.location || 'Belum ditentukan'}</p></div>
      </section>

      {isAdmin && session ? (
        <section className="flex flex-col justify-between gap-5 border border-[var(--accent-strong)] bg-[var(--accent-soft)] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="eyebrow text-[var(--accent-strong)]">absensi sedang dibuka</p>
            <h2 className="mt-2 text-2xl font-black">{attendanceCount} mahasiswa sudah hadir</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">QR aktif—tampilkan kepada peserta.</p>
          </div>
          <ButtonLink href={`/events/${event.id}/qr`} variant="primary">Lihat QR ↗</ButtonLink>
        </section>
      ) : isAdmin ? (
        <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="eyebrow text-[var(--muted-soft)]">absensi belum dibuka</p>
          <h2 className="mt-3 text-2xl font-black">Nyalakan sesi absensi</h2>
          <button type="button" onClick={openSession} disabled={loading} className="mt-6 min-h-11 bg-[var(--ink)] px-5 text-sm font-bold text-[#f7f4ed] disabled:opacity-50">
            {loading ? 'Membuka…' : 'Buka sesi absensi'}
          </button>
        </div>
      ) : (
        <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">Datang ke lokasi acara dan scan QR saat sesi dibuka admin.</div>
      )}

      {error ? <p role="alert" className="border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      {isAdmin ? <button type="button" onClick={deleteEvent} disabled={loading} className="border-t border-[var(--border)] pt-6 text-sm font-bold text-[var(--danger)] disabled:opacity-50">{loading ? 'Memproses…' : 'Hapus acara ↗'}</button> : null}
    </div>
  )
}
