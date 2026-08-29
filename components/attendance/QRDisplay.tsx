'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRDisplay({
  token,
  eventName,
}: {
  token: string
  eventName: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && token) {
      QRCode.toCanvas(canvasRef.current, token, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }
  }, [token])

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold mb-2">{eventName}</h2>
      <p className="text-gray-600 mb-4">Scan QR Code ini untuk absen</p>
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Token: {token.substring(0, 8)}...
      </p>
    </div>
  )
}
