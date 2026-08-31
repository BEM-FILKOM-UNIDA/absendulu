'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountStatus } from '@/lib/auth/profile-access'
import { Button } from '@/components/ui/button'

type MemberStatusActionsProps = {
  memberId: string
  accountStatus: AccountStatus
  isActive: boolean
  profileComplete: boolean
}

export default function MemberStatusActions({ memberId, accountStatus, isActive, profileComplete }: MemberStatusActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const active = accountStatus === 'active' && isActive
  const canActivate = active || profileComplete
  const nextStatus: 'active' | 'disabled' = active ? 'disabled' : 'active'

  async function updateStatus() {
    if (loading) return
    if (active && !window.confirm('Nonaktifkan akun ini? Pengguna tidak dapat login atau melakukan absensi sampai diaktifkan kembali.')) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_status: nextStatus }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        setError(result?.error || 'Status akun gagal diperbarui.')
        return
      }
      router.refresh()
    } catch {
      setError('Status akun gagal diperbarui. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-w-32 flex-col items-start gap-2">
      <Button
        type="button"
        variant={active ? 'danger' : 'accent'}
        className="min-h-9 px-3 text-xs"
        onClick={updateStatus}
        disabled={loading || !canActivate}
      >
        {loading ? 'Menyimpan…' : active ? 'Nonaktifkan' : canActivate ? 'Aktifkan' : 'Profil belum lengkap'}
      </Button>
      {!canActivate && <p className="max-w-56 text-xs leading-4 text-[var(--muted)]">Minta pengguna melengkapi nama dan NIM/NIP.</p>}
      {error ? <p role="alert" className="max-w-56 text-xs leading-4 text-[var(--danger)]">{error}</p> : null}
    </div>
  )
}
