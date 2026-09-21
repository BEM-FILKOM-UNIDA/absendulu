import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { ArrowUpRight, X } from 'lucide-react'

const scannerConfig = {
  verbose: false,
  useBarCodeDetectorIfSupported: false,
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
}

const scanConfig = { fps: 10, disableFlip: false }

function getCameraScanConfig(facingMode: 'environment' | 'user') {
  return {
    ...scanConfig,
    videoConstraints: {
      // iOS-compatible: use ideal instead of exact to avoid OverconstrainedError
      facingMode: { ideal: facingMode },
      // Don't set strict width/height constraints that iOS may reject
    },
  }
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const name = error.name
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Akses kamera belum diberikan. Izinkan kamera untuk menggunakan fitur Scan QR.'
    }
    if (name === 'NotFoundError') {
      return 'Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.'
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain lalu coba lagi.'
    }
    if (name === 'OverconstrainedError') {
      return 'Kamera tidak mendukung pengaturan yang diminta. Coba kamera lain.'
    }
    if (name === 'SecurityError') {
      return 'Akses kamera diblokir oleh browser. Pastikan menggunakan HTTPS.'
    }
  }
  return 'Kamera tidak dapat digunakan. Pastikan izin kamera sudah diberikan, lalu coba lagi.'
}

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [readingFile, setReadingFile] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoReadyCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAndCleanupScanner = useCallback(async (scanner: Html5Qrcode | null) => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
    if (videoReadyCheckIntervalRef.current) {
      clearInterval(videoReadyCheckIntervalRef.current)
      videoReadyCheckIntervalRef.current = null
    }
    if (scanner?.isScanning) {
      try {
        await scanner.stop()
      } catch {
        // Stream may already be stopped
      }
    }
    if (scanner) {
      try {
        await scanner.clear()
      } catch {
        // Temporary elements may already be gone
      }
    }
    if (scannerRef.current === scanner) {
      scannerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner) void stopAndCleanupScanner(scanner)
    }
  }, [stopAndCleanupScanner])

  const verifyVideoReady = useCallback((container: HTMLElement): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = container.querySelector('video') as HTMLVideoElement | null
      if (!video) {
        resolve(false)
        return
      }

      // Ensure iOS-compatible attributes
      video.setAttribute('playsinline', '')
      video.setAttribute('autoplay', '')
      video.setAttribute('muted', '')

      let attempts = 0
      const maxAttempts = 50 // 5 seconds max wait

      const checkReady = () => {
        attempts++
        const hasValidDimensions = video.videoWidth > 0 && video.videoHeight > 0
        const hasCurrentData = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        const isPlaying = !video.paused

        if (hasValidDimensions && hasCurrentData && isPlaying) {
          console.log('[QR Scanner] Video ready:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused,
            playsinline: video.hasAttribute('playsinline'),
          })
          resolve(true)
          return
        }

        if (attempts >= maxAttempts) {
          console.warn('[QR Scanner] Video not ready after timeout:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused,
            attempts,
          })
          resolve(false)
          return
        }

        // Continue checking
        videoReadyCheckIntervalRef.current = setTimeout(checkReady, 100)
      }

      checkReady()
    })
  }, [])

  async function startScanning() {
    if (!containerRef.current || scanning || readingFile || scannerRef.current?.isScanning) {
      return
    }

    // Cleanup any existing scanner first
    await stopAndCleanupScanner(scannerRef.current)

    setScanning(true)
    setError('')
    setHint('Meminta akses kamera…')
    processingRef.current = false

    const scanner = new Html5Qrcode('qr-reader', scannerConfig)
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
        setIsFullScreen(false)
        setHint('QR berhasil dibaca. Memeriksa kehadiran…')
        try {
          onScan(token)
        } catch {
          setError('Gagal memproses QR. Coba lagi.')
          processingRef.current = false
        }
      })
    }

    try {
      // Use single iOS-compatible constraint
      const cameraConfig = getCameraScanConfig('environment')
      await scanner.start(
        { facingMode: { ideal: 'environment' } },
        cameraConfig,
        handleDecoded,
        () => {},
      )

      // Verify video is actually ready before considering scan started
      if (containerRef.current) {
        const videoReady = await verifyVideoReady(containerRef.current)
        if (!videoReady) {
          throw new Error('Video stream tidak siap. Kamera mungkin tidak kompatibel.')
        }
      }

      setHint('Arahkan QR ke kotak sampai seluruh pola terlihat.')
      hintTimerRef.current = setTimeout(
        () => setHint('QR belum terbaca. Dekatkan atau jauhkan kamera, lalu pastikan layar QR cukup terang.'),
        9000,
      )
    } catch (err) {
      await stopAndCleanupScanner(scanner)
      setError(getCameraErrorMessage(err))
      setScanning(false)
      setIsFullScreen(false)
      setHint('')
      processingRef.current = false
    }
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || scanning || readingFile) return

    // Cleanup any existing scanner first
    await stopAndCleanupScanner(scannerRef.current)

    setReadingFile(true)
    setError('')
    setHint('Membaca QR dari gambar…')
    const scanner = new Html5Qrcode('qr-reader', scannerConfig)
    scannerRef.current = scanner

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

  const closeFullScreenScanner = useCallback(async () => {
    await stopAndCleanupScanner(scannerRef.current)
    setScanning(false)
    setIsFullScreen(false)
    setError('')
    setHint('')
    processingRef.current = false
  }, [stopAndCleanupScanner])

  const openFullScreenScanner = useCallback(() => {
    setIsFullScreen(true)
    // Auto-start camera when entering full-screen mode
    setTimeout(() => {
      void startScanning()
    }, 100)
  }, [])

  // Desktop view
  if (!isFullScreen) {
    return (
      <div className="flex w-full min-w-0 flex-col items-center">
        <div className="relative w-full">
          <div
            ref={containerRef}
            id="qr-reader"
            className="qr-camera-shell relative aspect-4/3 w-full min-w-0 overflow-hidden bg-(--ink)"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
          >
            <div className="qr-scan-guide aspect-square w-[72%] max-w-90" />
          </div>
        </div>
        <p className="mt-3 w-full text-center text-xs leading-5 text-(--muted)">
          {hint || 'Pastikan seluruh QR terlihat di dalam kotak, lalu dekatkan HP sampai pola QR tampak tajam.'}
        </p>
        {error ? (
          <p
            role="alert"
            className="mt-4 w-full border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-(--danger)"
          >
            {error}
          </p>
        ) : null}
        {!scanning && !readingFile ? (
          <div className="mt-5 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={openFullScreenScanner}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-(--accent) px-5 text-sm font-bold text-(--accent-foreground) hover:bg-[#55ded4]"
            >
              Aktifkan kamera <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
            <label
              htmlFor="qr-image"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm border border-(--border) bg-(--surface) px-5 text-sm font-bold hover:border-(--accent-strong)"
            >
              Pilih gambar QR
            </label>
            <input
              id="qr-image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageSelected}
            />
          </div>
        ) : null}
        {scanning || readingFile ? (
          <p className="mt-4 text-center text-sm font-bold text-(--muted)">
            {readingFile ? 'Membaca gambar QR…' : 'Memindai… arahkan kamera ke QR code.'}
          </p>
        ) : null}
      </div>
    )
  }

  // Full-screen mobile view
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-(--ink)">
      {/* Header with close button */}
      <div
        className="flex items-center justify-between border-b border-white/10 px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <span className="text-sm font-bold text-white">Scan QR</span>
        <button
          type="button"
          onClick={closeFullScreenScanner}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Tutup scanner"
        >
          <X aria-hidden="true" className="h-6 w-6" />
        </button>
      </div>

      {/* Camera container - full viewport */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          id="qr-reader"
          className="qr-camera-shell-fullscreen absolute inset-0 h-full w-full"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
        >
          <div className="qr-scan-guide-fullscreen aspect-square w-[70%] max-w-xs" />
        </div>
      </div>

      {/* Footer with hint and error */}
      <div
        className="border-t border-white/10 px-4 py-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {error ? (
          <p
            role="alert"
            className="mb-3 border border-[#ffb5ad] bg-(--danger)/20 px-4 py-3 text-sm font-semibold text-[#ffb5ad]"
          >
            {error}
          </p>
        ) : null}
        <p className="text-center text-sm text-white/80">
          {hint || 'Arahkan QR ke dalam kotak untuk memindai'}
        </p>
        {scanning ? (
          <p className="mt-2 text-center text-xs font-bold text-white/60">
            Memindai…
          </p>
        ) : null}
      </div>
    </div>
  )
}
