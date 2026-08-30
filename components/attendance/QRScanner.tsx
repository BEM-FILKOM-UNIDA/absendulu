'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'

type ResponsiveQrbox = (viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number }

type CameraSource = string | MediaTrackConstraints

const responsiveQrbox: ResponsiveQrbox = (viewfinderWidth, viewfinderHeight) => {
  const size = Math.round(Math.min(viewfinderWidth, viewfinderHeight) * 0.76)
  const boundedSize = Math.max(160, Math.min(size, 360))
  return { width: boundedSize, height: boundedSize }
}

const scannerConfig = {
  verbose: false,
  useBarCodeDetectorIfSupported: false,
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
}

const scanConfig = {
  fps: 10,
  qrbox: responsiveQrbox,
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
}

function getCameraSources(cameras: Array<{ id: string; label: string }>): CameraSource[] {
  if (cameras.length === 0) return [{ facingMode: 'environment' }, { facingMode: 'user' }]

  const rearCameraIds = cameras
    .filter((camera) => /back|rear|environment|belakang/i.test(camera.label))
    .map((camera) => camera.id)
  const otherCameraIds = cameras
    .filter((camera) => !rearCameraIds.includes(camera.id))
    .map((camera) => camera.id)

  return [...rearCameraIds, { facingMode: 'environment' }, ...otherCameraIds, { facingMode: 'user' }]
}

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [readingFile, setReadingFile] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const stopAndCleanupScanner = useCallback(async (scanner: Html5Qrcode) => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
    if (scanner.isScanning) {
      try {
        await scanner.stop()
      } catch {
        // Continue clearing the scanner even if the camera stream already stopped.
      }
    }
    try {
      scanner.clear()
    } catch {
      // The library may already have removed its temporary elements.
    }
    if (scannerRef.current === scanner) scannerRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner) void stopAndCleanupScanner(scanner)
    }
  }, [stopAndCleanupScanner])

  async function startScanning() {
    if (!containerRef.current || scanning || readingFile || scannerRef.current?.isScanning) return

    setScanning(true)
    setError('')
    setHint('Meminta akses kamera…')
    processingRef.current = false

    let scanner = new Html5Qrcode('qr-reader', scannerConfig)
    scannerRef.current = scanner

    const handleDecoded = (decodedText: string) => {
      const token = decodedText.trim()
      if (processingRef.current || token.length < 16) return

      processingRef.current = true
      void stopAndCleanupScanner(scanner).finally(() => {
        setScanning(false)
        onScan(token)
      })
    }

    const startWith = async (camera: CameraSource) => {
      await scanner.start(camera, scanConfig, handleDecoded, () => {})
    }

    try {
      let cameras: Array<{ id: string; label: string }> = []
      try {
        cameras = await Html5Qrcode.getCameras()
      } catch {
        // start() below can still request a camera directly on browsers that hide camera enumeration.
      }

      const cameraSources = getCameraSources(cameras)
      let started = false
      let lastCameraError: unknown

      for (const camera of cameraSources) {
        try {
          await startWith(camera)
          started = true
          break
        } catch (cameraError) {
          lastCameraError = cameraError
          await stopAndCleanupScanner(scanner)
          scanner = new Html5Qrcode('qr-reader', scannerConfig)
          scannerRef.current = scanner
        }
      }

      if (!started) throw lastCameraError ?? new Error('Tidak ada kamera yang dapat digunakan.')

      setHint('Arahkan QR ke kotak sampai seluruh pola terlihat.')
      hintTimerRef.current = setTimeout(() => {
        setHint('QR belum terbaca. Dekatkan atau jauhkan kamera, lalu pastikan layar QR cukup terang.')
      }, 9000)
    } catch {
      await stopAndCleanupScanner(scanner)
      setError('Kamera gagal dibuka. Izinkan kamera untuk situs ini, lalu coba lagi atau pilih gambar QR.')
      setScanning(false)
      setHint('')
      processingRef.current = false
    }
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || scanning || readingFile) return

    setReadingFile(true)
    setError('')
    setHint('Membaca QR dari gambar…')
    const scanner = new Html5Qrcode('qr-reader', scannerConfig)

    try {
      const decodedText = (await scanner.scanFile(file, false)).trim()
      if (decodedText.length < 16) throw new Error('QR token tidak valid')
      await stopAndCleanupScanner(scanner)
      setHint('')
      onScan(decodedText)
    } catch {
      await stopAndCleanupScanner(scanner)
      setError('QR tidak terbaca dari gambar. Gunakan screenshot yang tajam dan tampilkan seluruh QR.')
      setHint('')
    } finally {
      setReadingFile(false)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <div ref={containerRef} id="qr-reader" className="qr-camera-shell relative aspect-[4/3] w-full min-w-0 overflow-hidden bg-[var(--ink)] sm:aspect-[16/10] lg:aspect-video" />
      <p className="mt-3 w-full text-center text-xs leading-5 text-[var(--muted)]">
        {hint || 'Posisikan QR di dalam kotak. Kamera akan menyesuaikan ukuran layar.'}
      </p>
      {error && <p role="alert" className="mt-4 w-full border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p>}
      {!scanning && !readingFile && (
        <div className="mt-5 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button type="button" variant="accent" onClick={startScanning} className="w-full sm:w-auto">
            Aktifkan kamera <span aria-hidden="true">↗</span>
          </Button>
          <label htmlFor="qr-image" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-bold text-[var(--foreground)] transition-colors hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]">
            Pilih gambar QR
          </label>
          <input ref={fileInputRef} id="qr-image" type="file" accept="image/*" className="sr-only" onChange={handleImageSelected} />
        </div>
      )}
      {(scanning || readingFile) && (
        <p className="mt-4 text-center text-sm font-bold text-[var(--muted)]">
          {readingFile ? 'Membaca gambar QR…' : 'Memindai… arahkan kamera ke QR code.'}
        </p>
      )}
    </div>
  )
}
