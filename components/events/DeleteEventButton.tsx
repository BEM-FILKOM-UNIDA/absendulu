'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (deleting) return
    const confirmed = window.confirm(`Hapus acara “${eventName}”? Data absensi dan sesi QR acara ini juga akan dihapus permanen.`)
    if (!confirmed) return

    setDeleting(true)
    setError('')
    const response = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      setError(result.error || 'Acara gagal dihapus. Coba lagi.')
      setDeleting(false)
      return
    }

    router.replace('/events')
    router.refresh()
  }

  return (
    <div className="border-t border-[var(--border)] pt-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow text-[var(--danger)]">zona berbahaya</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Hapus acara yang sudah tidak diperlukan beserta data absensinya.</p>
        </div>
        <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Menghapus…' : 'Hapus acara'}
          <span aria-hidden="true">↗</span>
        </Button>
      </div>
      {error ? <p role="alert" className="mt-4 border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
    </div>
  )
}
