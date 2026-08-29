'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QRDisplay({ token, eventName }: { token: string; eventName: string }) {
  const [qrSvg, setQrSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!token) return

    QRCode.toString(token, {
      type: 'svg',
      width: 380,
      margin: 2,
      color: { dark: '#10252d', light: '#f3f0e9' },
    })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg)
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="flex w-full min-w-0 flex-col items-center text-center">
      <p className="eyebrow text-[var(--accent-strong)]">QR absensi</p>
      <h2 className="mt-3 max-w-md break-words text-xl font-black tracking-[-.05em] sm:text-2xl">{eventName}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Scan QR ini untuk mencatat kehadiran acara FILKOM.</p>
      <div className="mx-auto mt-6 flex aspect-square w-[74vw] max-w-[280px] items-center justify-center border-4 border-[var(--ink)] bg-[var(--paper)] p-2 sm:mt-8 sm:w-full sm:max-w-[380px] sm:p-4">
        {qrSvg ? (
          <div
            aria-label={`QR absensi ${eventName}`}
            className="flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            role="img"
          />
        ) : (
          <span className="text-center text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">Menyiapkan QR…</span>
        )}
      </div>
      <div className="mt-6 flex w-full max-w-[380px] items-center gap-3 break-all text-left text-xs font-bold text-[var(--muted)] sm:mt-7">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
        <span>QR aktif · token {token.substring(0, 8)}…</span>
      </div>
    </div>
  )
}
