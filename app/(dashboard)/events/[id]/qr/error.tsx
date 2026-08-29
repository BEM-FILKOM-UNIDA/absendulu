'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function QRError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('QR page failed to render')
  }, [])

  return (
    <div className="mx-auto max-w-xl space-y-6 py-12 text-center">
      <p className="eyebrow text-[var(--danger)]">QR belum bisa ditampilkan</p>
      <h1 className="display-type text-4xl leading-none sm:text-5xl">Ada gangguan<br /><em>di halaman absensi.</em></h1>
      <p className="text-sm leading-6 text-[var(--muted)]">Coba muat ulang halaman. Jika tetap gagal, tutup sesi QR lalu buka kembali dari detail acara.</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center bg-[var(--ink)] px-5 text-sm font-bold text-[#f7f4ed] hover:bg-[var(--accent-strong)]">Coba lagi</button>
        <Link href="/events" className="inline-flex min-h-11 items-center justify-center border border-[var(--border)] px-5 text-sm font-bold text-[var(--foreground)] hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]">Kembali ke acara</Link>
      </div>
    </div>
  )
}
