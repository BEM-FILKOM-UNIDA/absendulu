'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => { if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {}) }, [])

  async function startScanning() {
    if (!containerRef.current) return
    setScanning(true)
    setError('')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => { scanner.stop().catch(() => {}); setScanning(false); onScan(decodedText) }, () => {})
    } catch {
      setError('Kamera tidak tersedia. Periksa izin kamera lalu coba lagi.')
      setScanning(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div ref={containerRef} id="qr-reader" className="min-h-64 w-full overflow-hidden bg-[var(--ink)]" />
      {error && <p role="alert" className="mt-4 w-full border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p>}
      {!scanning && <Button type="button" variant="accent" onClick={startScanning} className="mt-6">Aktifkan kamera <span aria-hidden="true">↗</span></Button>}
      {scanning && <p className="mt-5 text-sm font-bold text-[var(--muted)]">Memindai... arahkan kamera ke QR code.</p>}
    </div>
  )
}
