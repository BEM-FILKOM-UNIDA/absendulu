'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QRScanner from '@/components/attendance/QRScanner'
import { Card } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'

type ScanResult = {
  status?: string
  error?: string
  eventName?: string
  success?: boolean
}

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleScan(rawToken: string) {
    const qrToken = rawToken.trim()
    if (!qrToken) {
      setResult({ error: 'QR Code kosong. Coba scan ulang.' })
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ qrToken }),
      })
      const data = await response.json().catch(() => ({ error: 'Respons server tidak valid.' }))
      setResult(data)
      if (data.success) setTimeout(() => router.push('/scan'), 2200)
    } catch {
      setResult({ error: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="text-center">
        <p className="eyebrow text-[var(--accent-strong)]">absendulu / scan kehadiran</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">
          Scan QR,
          <br />
          <em>tandai hadir.</em>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
          Arahkan kamera ke QR acara organisasi FILKOM yang sedang aktif. Satu scan, kehadiran langsung tercatat.
        </p>
      </section>

      {result?.success ? (
        <Card className="border-[var(--accent-strong)] bg-[var(--accent-soft)] p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center bg-[var(--ink)] text-3xl text-[var(--lime)]">✓</div>
          <p className="eyebrow mt-6 text-[var(--accent-strong)]">absensi berhasil</p>
          <h2 className="mt-2 text-2xl font-black">Kehadiran tercatat.</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {result.eventName} · {result.status}
          </p>
          <ButtonLink href="/scan" variant="primary" className="mt-7">Scan lagi</ButtonLink>
        </Card>
      ) : (
        <Card className="overflow-hidden p-5 sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
            <p className="eyebrow text-[var(--muted-soft)]">kamera siap digunakan</p>
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-[var(--accent-strong)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> siap scan
            </span>
          </div>
          {result?.error ? (
            <div role="alert" className="mb-5 border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
              {result.error}
            </div>
          ) : null}
          {loading ? (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-strong)]" />
                <p className="text-sm font-bold">Mencatat kehadiran…</p>
              </div>
            </div>
          ) : (
            <QRScanner onScan={handleScan} />
          )}
        </Card>
      )}
    </div>
  )
}
