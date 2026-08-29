'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRDisplay({ token, eventName }: { token: string; eventName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && token) QRCode.toCanvas(canvasRef.current, token, { width: 380, margin: 2, color: { dark: '#10252d', light: '#f3f0e9' } })
  }, [token])

  return <div className="flex flex-col items-center text-center"><p className="eyebrow text-[var(--accent-strong)]">scan station</p><h2 className="mt-3 max-w-md text-2xl font-black tracking-[-.05em]">{eventName}</h2><p className="mt-2 text-sm text-[var(--muted)]">Scan QR ini untuk mencatat kehadiran.</p><div className="mt-8 border-4 border-[var(--ink)] bg-[var(--paper)] p-4 shadow-[8px_8px_0_var(--accent)]"><canvas ref={canvasRef} className="h-auto w-full max-w-[380px]" /></div><div className="mt-7 flex items-center gap-3 text-xs font-bold text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> QR aktif · token {token.substring(0, 8)}...</div></div>
}
