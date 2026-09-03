import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { getQrData } from '~/server/data'
import { Card } from '~/components/ui'
import { QrRouteError } from '~/components/route-fallbacks'

export const Route = createFileRoute('/_auth/events/$id/qr')({
  loader: ({ params }) => getQrData({ data: { id: params.id } }),
  errorComponent: QrRouteError,
  component: QrPage,
})

function QrPage() {
  const navigate = useNavigate()
  const { event, session, attendanceCount } = Route.useLoaderData()
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.qr_token) return
    QRCode.toDataURL(session.qr_token, {
      width: 1200,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => setError('QR gagal dibuat.'))
  }, [session?.qr_token])

  async function closeSession() {
    setClosing(true)
    setError('')
    try {
      const response = await fetch(`/api/events/${event.id}/session/close`, { method: 'POST' })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        setError(result?.error || 'Sesi gagal ditutup.')
        return
      }
      await navigate({ to: '/events/$id', params: { id: event.id } })
    } catch {
      setError('Sesi gagal ditutup. Periksa koneksi lalu coba lagi.')
    } finally {
      setClosing(false)
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `qr-absensi-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'acara'}.png`
    link.click()
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-12 text-center">
        <p className="eyebrow text-(--muted-soft)">belum ada QR aktif</p>
        <h1 className="display-type text-4xl leading-none sm:text-5xl">Absensi belum<br /><em>dibuka.</em></h1>
        <p className="text-sm text-(--muted)">Buka absensi dari halaman detail acara terlebih dahulu.</p>
        <Link to="/events/$id" params={{ id: event.id }} className="eyebrow text-(--accent-strong) hover:underline">← Kembali ke acara</Link>
      </div>
    )
  }

  return (
    <main className="paper-noise -mx-5 -my-7 min-h-[calc(100dvh-6rem)] bg-(--ink) px-4 py-6 text-[#f7f4ed] sm:-mx-8 sm:-my-9 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
          <div>
            <Link to="/events/$id" params={{ id: event.id }} className="eyebrow text-(--accent) hover:underline">← {event.name}</Link>
            <p className="mt-3 text-sm leading-6 text-white/45">Tampilkan QR ini agar mahasiswa dapat melakukan absensi.</p>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-(--lime)">● absensi dibuka</span>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.42fr)] lg:gap-10">
          <Card className="bg-(--paper) p-4 text-(--ink) shadow-[8px_10px_0_var(--accent)] sm:p-10">
            <div className="text-center">
              <p className="eyebrow text-(--accent-strong)">QR absensi</p>
              <h1 className="mt-3 wrap-break-word text-xl font-black sm:text-2xl">{event.name}</h1>
              <div className="mx-auto mt-6 flex aspect-square w-full max-w-110 items-center justify-center border-4 border-black bg-white p-3 sm:p-5">
                {qrDataUrl ? <img src={qrDataUrl} alt={`QR absensi ${event.name}`} className="h-full w-full" /> : <span className="text-xs font-bold uppercase tracking-[.12em] text-(--muted)">Menyiapkan QR…</span>}
              </div>
              <div className="mx-auto mt-5 flex w-full max-w-110 flex-col gap-3 sm:flex-row">
                <button type="button" onClick={downloadQr} disabled={!qrDataUrl} className="min-h-11 flex-1 bg-(--ink) px-4 text-sm font-bold text-white disabled:opacity-50">Download QR ↓</button>
                <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="min-h-11 flex-1 border-2 border-(--ink) px-4 text-sm font-bold text-(--ink)">Fullscreen ↗</button>
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <div className="border border-white/10 bg-white/5 p-6">
              <p className="eyebrow text-(--accent)">total hadir</p>
              <p className="mt-2 text-6xl font-black -tracking-widest text-(--lime)">{attendanceCount}</p>
              <p className="mt-1 text-sm text-white/45">mahasiswa hadir saat ini</p>
            </div>
            <button type="button" onClick={closeSession} disabled={closing} className="w-full border border-white/20 px-5 py-3 text-sm font-bold text-white/65 hover:border-[#ffb5ad] disabled:opacity-50">{closing ? 'Menutup…' : 'Tutup sesi absensi'}</button>
          </div>
        </div>

        {error ? <p role="alert" className="mt-6 border border-[#ffb5ad] bg-(--danger)/20 px-4 py-3 text-sm font-semibold text-[#ffb5ad]">{error}</p> : null}
      </div>
    </main>
  )
}
