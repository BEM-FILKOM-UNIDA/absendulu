'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

export default function QRDisplay({ token, eventName }: { token: string; eventName: string }) {
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [fullscreenFallback, setFullscreenFallback] = useState(false)
  const [nativeFullscreen, setNativeFullscreen] = useState(false)
  const qrFrameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    if (!token) return

    const scanUrl = new URL('/scan', window.location.origin)
    scanUrl.searchParams.set('token', token)
    const options = {
      margin: 4,
      errorCorrectionLevel: 'L' as const,
      color: { dark: '#000000', light: '#ffffff' },
    }

    Promise.all([
      QRCode.toString(scanUrl.toString(), { ...options, type: 'svg', width: 512 }),
      QRCode.toDataURL(scanUrl.toString(), { ...options, width: 1200 }),
    ])
      .then(([svg, dataUrl]) => {
        if (cancelled) return
        setQrSvg(svg)
        setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (cancelled) return
        setQrSvg(null)
        setQrDataUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    function handleFullscreenChange() {
      setNativeFullscreen(document.fullscreenElement === qrFrameRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!fullscreenFallback) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [fullscreenFallback])

  async function handleFullscreen() {
    const frame = qrFrameRef.current
    if (!frame) return

    if (fullscreenFallback) {
      setFullscreenFallback(false)
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    if (frame.requestFullscreen) {
      try {
        await frame.requestFullscreen()
        return
      } catch {
        // iPhone Safari and restricted browsers use the fallback below.
      }
    }

    setFullscreenFallback(true)
  }

  function handleDownload() {
    if (!qrDataUrl) return

    const safeEventName = eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'acara'
    const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    if (isAppleMobile) {
      window.open(qrDataUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `qr-absensi-${safeEventName}.png`
    link.click()
  }

  const isFullscreen = fullscreenFallback || nativeFullscreen
  const frameClassName = isFullscreen
    ? 'fixed inset-0 z-[100] flex min-h-[100dvh] w-full max-w-none flex-col items-center justify-center overflow-auto bg-white p-5 text-black sm:p-10'
    : 'relative mx-auto mt-6 flex aspect-square w-[86vw] max-w-[440px] items-center justify-center border-4 border-black bg-white p-2 sm:mt-8 sm:w-full sm:max-w-[440px] sm:p-4'
  const qrClassName = isFullscreen
    ? 'flex aspect-square w-[min(88vw,720px)] items-center justify-center [&>svg]:block [&>svg]:h-auto [&>svg]:w-full'
    : 'flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-auto [&>svg]:w-full'

  return (
    <div className="flex w-full min-w-0 flex-col items-center text-center">
      {!isFullscreen && (
        <>
          <p className="eyebrow text-[var(--accent-strong)]">QR absensi</p>
          <h2 className="mt-3 max-w-md break-words text-xl font-black tracking-[-.05em] sm:text-2xl">{eventName}</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Scan QR ini untuk mencatat kehadiran acara FILKOM.</p>
        </>
      )}

      <div ref={qrFrameRef} className={frameClassName}>
        {isFullscreen && <p className="mb-5 max-w-[90vw] break-words text-center text-xl font-black sm:text-3xl">{eventName}</p>}
        {qrSvg ? (
          <div
            aria-label={`QR absensi ${eventName}`}
            className={qrClassName}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            role="img"
          />
        ) : (
          <span className="text-center text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">Menyiapkan QR…</span>
        )}
        {isFullscreen && (
          <button
            type="button"
            onClick={handleFullscreen}
            className="mt-6 inline-flex min-h-11 items-center justify-center border-2 border-black px-5 text-sm font-black text-black"
          >
            Tutup fullscreen
          </button>
        )}
      </div>

      {!isFullscreen && (
        <>
          <div className="mt-5 flex w-full max-w-[440px] flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-[var(--ink)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download QR <span aria-hidden="true">↓</span>
            </button>
            <button
              type="button"
              onClick={handleFullscreen}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border-2 border-[var(--ink)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)]"
            >
              Fullscreen <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="mt-6 flex w-full max-w-[440px] items-center gap-3 break-all text-left text-xs font-bold text-[var(--muted)] sm:mt-7">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
            <span>QR aktif · token {token.substring(0, 8)}…</span>
          </div>
        </>
      )}
    </div>
  )
}
