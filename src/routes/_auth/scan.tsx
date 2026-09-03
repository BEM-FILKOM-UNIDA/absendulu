import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import QRScanner from '~/components/attendance/QRScanner'
import { extractQrToken } from '~/lib/navigation'
import { ButtonLink, Card } from '~/components/ui'

type ScanResult = { status?: string; error?: string; httpStatus?: number; eventName?: string; success?: boolean }

export const Route = createFileRoute('/_auth/scan')({ component: ScanPage })

function ScanPage() {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const handleScan = useCallback(async (rawToken: string) => {
    const qrToken = extractQrToken(rawToken)
    if (!qrToken) { setResult({ error: 'QR Code kosong atau tidak valid. Coba scan ulang.' }); return }
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/attendance/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ qrToken }) })
      const data = await response.json().catch(() => ({ error: 'Respons server tidak valid.' }))
      setResult({ ...data, httpStatus: response.status })
    } catch { setResult({ error: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.' }) } finally { setLoading(false) }
  }, [])
  useEffect(() => { const token = new URLSearchParams(window.location.search).get('token'); if (token) void handleScan(token) }, [handleScan])
  return <div className="mx-auto max-w-xl space-y-8"><section className="text-center"><p className="eyebrow text-(--accent-strong)">absendulu / scan kehadiran</p><h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Scan QR,<br /><em>tandai hadir.</em></h1><p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-(--muted)">Arahkan kamera ke QR acara organisasi FILKOM yang sedang aktif.</p></section>{result?.success ? <SuccessState result={result} /> : <ScannerCard result={result} loading={loading} onScan={handleScan} />}</div>
}

function SuccessState({ result }: { result: ScanResult }) { return <Card className="border-(--accent-strong) bg-(--accent-soft) p-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center bg-(--ink) text-3xl text-(--lime)">✓</div><p className="eyebrow mt-6 text-(--accent-strong)">absensi berhasil</p><h2 className="mt-2 text-2xl font-black">Kehadiran tercatat.</h2><p className="mt-2 text-sm text-(--muted)">{result.eventName} · {result.status}</p><ButtonLink href="/scan" variant="primary" className="mt-7">Scan lagi</ButtonLink></Card> }

function ScannerCard({ result, loading, onScan }: { result: ScanResult | null; loading: boolean; onScan: (token: string) => void }) { return <Card className="overflow-hidden p-5 sm:p-8"><div className="mb-6 flex items-center justify-between border-b border-(--border) pb-4"><p className="eyebrow text-(--muted-soft)">kamera siap digunakan</p><span className="text-[10px] font-black uppercase tracking-widest text-(--accent-strong)">● siap scan</span></div>{result?.error ? <div role="alert" className="mb-5 border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-(--danger)">{result.error}</div> : null}{loading ? <div className="grid min-h-64 place-items-center text-center"><div><span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-(--border) border-t-(--accent-strong)" /><p className="text-sm font-bold">Mencatat kehadiran…</p></div></div> : <QRScanner onScan={onScan} />}</Card> }
