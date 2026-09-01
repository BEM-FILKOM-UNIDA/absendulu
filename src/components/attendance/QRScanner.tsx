import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const scannerConfig = {
  verbose: false,
  useBarCodeDetectorIfSupported: true,
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
}

const scanConfig = { fps: 10, disableFlip: false }

function getCameraScanConfig(facingMode: 'environment' | 'user') {
  return {
    ...scanConfig,
    videoConstraints: {
      facingMode: { exact: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1440 },
      aspectRatio: { ideal: 4 / 3 },
    },
  }
}

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [readingFile, setReadingFile] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const stopAndCleanupScanner = useCallback(async (scanner: Html5Qrcode) => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
    if (scanner.isScanning) {
      try { await scanner.stop() } catch { /* stream may already be stopped */ }
    }
    try { scanner.clear() } catch { /* temporary elements may already be gone */ }
    if (scannerRef.current === scanner) scannerRef.current = null
  }, [])

  useEffect(() => () => {
    const scanner = scannerRef.current
    if (scanner) void stopAndCleanupScanner(scanner)
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
      if (processingRef.current) return
      if (token.length < 16) {
        setError('QR terbaca, tetapi isinya bukan QR absensi. Gunakan QR yang tampil di halaman admin.')
        return
      }
      processingRef.current = true
      void stopAndCleanupScanner(scanner).finally(() => {
        setScanning(false)
        setHint('QR berhasil dibaca. Memeriksa kehadiran…')
        onScan(token)
      })
    }

    try {
      let started = false
      let lastCameraError: unknown
      const cameraSources: Array<{ source: MediaTrackConstraints; facingMode: 'environment' | 'user' }> = [
        { source: { facingMode: { exact: 'environment' } }, facingMode: 'environment' },
        { source: { facingMode: 'user' }, facingMode: 'user' },
      ]
      for (const { source, facingMode } of cameraSources) {
        try {
          await scanner.start(source, getCameraScanConfig(facingMode), handleDecoded, () => {})
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
      hintTimerRef.current = setTimeout(() => setHint('QR belum terbaca. Dekatkan atau jauhkan kamera, lalu pastikan layar QR cukup terang.'), 9000)
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
      <div className="relative w-full"><div ref={containerRef} id="qr-reader" className="qr-camera-shell relative aspect-[4/3] w-full min-w-0 overflow-hidden bg-[var(--ink)]" /><div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><div className="qr-scan-guide aspect-square w-[72%] max-w-[360px]" /></div></div>
      <p className="mt-3 w-full text-center text-xs leading-5 text-[var(--muted)]">{hint || 'Pastikan seluruh QR terlihat di dalam kotak, lalu dekatkan HP sampai pola QR tampak tajam.'}</p>
      {error ? <p role="alert" className="mt-4 w-full border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      {!scanning && !readingFile ? <div className="mt-5 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><button type="button" onClick={startScanning} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] hover:bg-[#55ded4]">Aktifkan kamera <span aria-hidden="true">↗</span></button><label htmlFor="qr-image" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-bold hover:border-[var(--accent-strong)]">Pilih gambar QR</label><input id="qr-image" type="file" accept="image/*" className="sr-only" onChange={handleImageSelected} /></div> : null}
      {scanning || readingFile ? <p className="mt-4 text-center text-sm font-bold text-[var(--muted)]">{readingFile ? 'Membaca gambar QR…' : 'Memindai… arahkan kamera ke QR code.'}</p> : null}
    </div>
  )
}
