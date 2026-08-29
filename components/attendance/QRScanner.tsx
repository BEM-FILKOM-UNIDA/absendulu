'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'

type ResponsiveQrbox = (viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number }

const responsiveQrbox: ResponsiveQrbox = (viewfinderWidth, viewfinderHeight) => {
  const size = Math.round(Math.min(viewfinderWidth, viewfinderHeight) * 0.62)
  const boundedSize = Math.max(120, Math.min(size, 320))
  return { width: boundedSize, height: boundedSize }
}

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner?.isScanning) scanner.stop().catch(() => {})
    }
  }, [])

  async function startScanning() {
    if (!containerRef.current || scanning || scannerRef.current?.isScanning) return

    setScanning(true)
    setError('')
    processingRef.current = false
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: { ideal: 'environment' } },
        {
          fps: 10,
          qrbox: responsiveQrbox,
          videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        (decodedText) => {
          if (processingRef.current) return
          processingRef.current = true
          void scanner.stop().catch(() => {}).finally(() => {
            scannerRef.current = null
            setScanning(false)
            onScan(decodedText)
          })
        },
        () => {},
      )
    } catch {
      setError('Kamera tidak tersedia. Periksa izin kamera lalu coba lagi.')
      setScanning(false)
      processingRef.current = false
      scannerRef.current = null
      try {
        scanner.clear()
      } catch {
        // The library may already have removed its temporary elements.
      }
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <div ref={containerRef} id="qr-reader" className="qr-camera-shell relative aspect-[4/3] w-full min-w-0 overflow-hidden bg-[var(--ink)] sm:aspect-[16/10] lg:aspect-video" />
      <p className="mt-3 w-full text-center text-xs leading-5 text-[var(--muted)]">Posisikan QR di dalam kotak. Kamera akan menyesuaikan ukuran layar.</p>
      {error && <p role="alert" className="mt-4 w-full border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p>}
      {!scanning && <Button type="button" variant="accent" onClick={startScanning} className="mt-5 w-full sm:w-auto">Aktifkan kamera <span aria-hidden="true">↗</span></Button>}
      {scanning && <p className="mt-4 text-center text-sm font-bold text-[var(--muted)]">Memindai… arahkan kamera ke QR code.</p>}
    </div>
  )
}
