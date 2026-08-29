'use client'

import { useState } from 'react'
import QRScanner from '@/components/attendance/QRScanner'

export default function ScanPage() {
  const [result, setResult] = useState<{
    status?: string
    error?: string
    eventName?: string
    success?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleScan = async (token: string) => {
    setLoading(true)
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrToken: token }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)

    if (data.success) {
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Scan QR Absensi</h1>

      {result?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-green-800 font-bold text-lg">Berhasil Absen!</p>
          <p className="text-green-600">
            {result.eventName} — {result.status}
          </p>
        </div>
      )}

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ {result.error}</p>
        </div>
      )}

      {!result?.success && !loading && <QRScanner onScan={handleScan} />}

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Memproses absensi...</p>
        </div>
      )}
    </div>
  )
}
