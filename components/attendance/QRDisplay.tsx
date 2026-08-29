'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRDisplay({ token, eventName }: { token: string; eventName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !token) return

    QRCode.toCanvas(canvasRef.current, token, {
      width: 380,
      margin: 2,
      color: { dark: '#10252d', light: '#f3f0e9' },
    })
  }, [token])

  return (
    <div className="flex min-w-0 w-full flex-col items-center text-center">
      <p className="eyebrow text-[var(--accent-strong)]">QR absensi</p>
      <h2 className="mt-3 max-w-md break-words text-xl font-black tracking-[-.05em] sm:text-2xl">{eventName}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Scan QR ini untuk mencatat kehadiran acara FILKOM.</p>
      <div className="mt-6 w-full max-w-[min(380px,calc(100vw-4rem))] border-4 border-[var(--ink)] bg-[var(--paper)] p-2 shadow-[6px_6px_0_var(--accent)] sm:mt-8 sm:max-w-[380px] sm:p-4 sm:shadow-[8px_8px_0_var(--accent)]">
        <canvas ref={canvasRef} className="block h-auto aspect-square w-full" />
      </div>
      <div className="mt-6 flex max-w-full items-center gap-3 break-all text-left text-xs font-bold text-[var(--muted)] sm:mt-7">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
        <span>QR aktif · token {token.substring(0, 8)}…</span>
      </div>
    </div>
  )
}
