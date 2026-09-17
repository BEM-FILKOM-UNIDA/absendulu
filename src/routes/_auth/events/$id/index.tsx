import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { getEventDetailData } from '~/server/data'
import { Badge, ButtonLink } from '~/components/ui'

const statusLabels: Record<string, string> = {
  active: 'Berlangsung',
  draft: 'Draft',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const Route = createFileRoute('/_auth/events/$id/')({
  loader: ({ params }) => getEventDetailData({ data: { id: params.id } }),
  component: EventDetailPage,
})

function EventDetailPage() {
  const navigate = useNavigate()
  const { event, isAdmin, session, attendanceCount } = Route.useLoaderData()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const variant = event.status === 'active' ? 'success' : event.status === 'cancelled' ? 'danger' : 'muted'

  useEffect(() => {
    if (!confirming) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setConfirming(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [confirming])

  async function openSession() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/events/${event.id}/session/open`, { method: 'POST', headers: { Origin: window.location.origin } })
      if (!response.ok) {
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
    setConfirming(false)
    setLoading(true)
    const response = await fetch(`/api/events/${event.id}`, { method: 'DELETE', headers: { Origin: window.location.origin } })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      setError(result?.error || 'Acara gagal dihapus.')
      setLoading(false)
      return
    }
    await navigate({ to: '/events' })
  }

  async function updateStatus(newStatus: string) {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        setError(result?.error || 'Status gagal diperbarui.')
        setLoading(false)
        return
      }
      await navigate({ to: '/events/$id', params: { id: event.id }, replace: true })
    } catch {
      setError('Status gagal diperbarui. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <Link to="/events" className="eyebrow inline-flex items-center gap-1 text-(--accent-strong) hover:underline"><ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />kembali ke acara</Link>
      <section className="flex flex-col justify-between gap-6 border-b border-(--border) pb-8 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="eyebrow text-(--muted-soft)">detail acara / {event.event_date}</p>
          <h1 className="display-type mt-3 max-w-3xl wrap-break-word text-4xl leading-none tracking-[-.07em] sm:text-6xl">{event.name}</h1>
          {event.description ? <p className="mt-5 max-w-xl wrap-break-word text-sm leading-6 text-(--muted)">{event.description}</p> : null}
        </div>
        <Badge variant={variant}>{statusLabels[event.status] || event.status}</Badge>
      </section>

      <section className="grid gap-px border border-(--border) bg-(--border) sm:grid-cols-3">
        <div className="bg-(--surface) p-5"><p className="eyebrow text-(--muted-soft)">tanggal</p><p className="mt-3 font-black">{event.event_date}</p></div>
        <div className="bg-(--surface) p-5"><p className="eyebrow text-(--muted-soft)">waktu</p><p className="mt-3 font-black">{event.start_time}{event.end_time ? ` — ${event.end_time}` : ''}</p></div>
        <div className="bg-(--surface) p-5"><p className="eyebrow text-(--muted-soft)">lokasi</p><p className="mt-3 font-black">{event.location || 'Belum ditentukan'}</p></div>
      </section>

      {isAdmin && session ? (
        <section className="flex flex-col justify-between gap-5 border border-(--accent-strong) bg-(--accent-soft) p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="eyebrow text-(--accent-strong)">absensi sedang dibuka</p>
            <h2 className="mt-2 text-2xl font-black">{attendanceCount} mahasiswa sudah hadir</h2>
            <p className="mt-2 text-sm text-(--muted)">QR aktif—tampilkan kepada peserta.</p>
          </div>
          <ButtonLink href={`/events/${event.id}/qr`} variant="primary">Lihat QR <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></ButtonLink>
        </section>
      ) : isAdmin ? (
        <div className="border border-dashed border-(--border) bg-(--surface) p-8 text-center">
          <p className="eyebrow text-(--muted-soft)">absensi belum dibuka</p>
          <h2 className="mt-3 text-2xl font-black">Nyalakan sesi absensi</h2>
          <button type="button" onClick={openSession} disabled={loading} className="mt-6 min-h-11 bg-(--ink) px-5 text-sm font-bold text-[#f7f4ed] disabled:opacity-50">
            {loading ? 'Membuka…' : 'Buka sesi absensi'}
          </button>
        </div>
      ) : (
        <div className="border border-dashed border-(--border) bg-(--surface) p-8 text-center text-sm text-(--muted)">Datang ke lokasi acara dan scan QR saat sesi dibuka admin.</div>
      )}

      {error ? <p role="alert" className="border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-(--danger)">{error}</p> : null}
      {isAdmin ? (
        <section className="space-y-4 border-t border-(--border) pt-6">
          <div className="flex flex-wrap gap-3">
            {event.status === 'draft' ? (
              <button type="button" onClick={() => updateStatus('active')} disabled={loading} className="min-h-9 rounded-sm bg-(--accent) px-4 text-sm font-bold text-(--accent-foreground) disabled:opacity-50">{loading ? 'Memproses…' : 'Aktifkan acara'}</button>
            ) : event.status === 'active' ? (
              <>
                <button type="button" onClick={() => updateStatus('completed')} disabled={loading} className="min-h-9 rounded-sm bg-(--ink) px-4 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Memproses…' : 'Tandai selesai'}</button>
                <button type="button" onClick={() => updateStatus('cancelled')} disabled={loading} className="min-h-9 rounded-sm border border-(--danger) px-4 text-sm font-bold text-(--danger) disabled:opacity-50">{loading ? 'Memproses…' : 'Batalkan acara'}</button>
              </>
            ) : null}
          </div>
          <button type="button" onClick={() => setConfirming(true)} disabled={loading} className="text-sm font-bold text-(--danger) disabled:opacity-50">{loading ? 'Memproses…' : 'Hapus acara'} <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></button>
        </section>
      ) : null}
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-5" onClick={() => setConfirming(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="hapus-acara-judul" aria-describedby="hapus-acara-deskripsi" className="w-full max-w-md border border-(--ink) bg-(--surface) p-7 shadow-[8px_10px_0_var(--accent)] sm:p-8" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow text-(--danger)">hapus acara</p>
            <h2 id="hapus-acara-judul" className="display-type mt-3 wrap-break-word text-3xl leading-none tracking-[-.06em]">Hapus acara <em>“{event.name}”?</em></h2>
            <p id="hapus-acara-deskripsi" className="mt-4 text-sm leading-6 text-(--muted)">Data absensi dan sesi QR juga akan dihapus. Tindakan ini tidak bisa dibatalkan.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" autoFocus onClick={() => setConfirming(false)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-(--border) bg-white px-5 text-sm font-bold text-(--ink) hover:bg-(--surface-muted)">Batal</button>
              <button type="button" onClick={deleteEvent} disabled={loading} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-(--danger) px-5 text-sm font-bold text-white hover:bg-[#963b3b] disabled:opacity-50">{loading ? 'Menghapus…' : 'Ya, hapus'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
