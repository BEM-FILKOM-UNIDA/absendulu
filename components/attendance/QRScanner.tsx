'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({
  onScan,
}: {
  onScan: (token: string) => void
}) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanning = async () => {
    if (!containerRef.current) return
    setScanning(true)
    setError('')

    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {})
          onScan(decodedText)
        },
        () => {} // ignore errors during scanning
      )
    } catch {
      setError(
        'Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.'
      )
      setScanning(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div id="qr-reader" ref={containerRef} className="w-full max-w-sm mb-4" />
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {!scanning && (
        <button
          onClick={startScanning}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          📷 Mulai Scan QR
        </button>
      )}
      {scanning && (
        <p className="text-gray-600">
          Memindai... Arahkan kamera ke QR Code
        </p>
      )}
    </div>
  )
}
