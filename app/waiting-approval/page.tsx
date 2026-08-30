'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function WaitingApprovalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function refreshStatus() {
    setLoading(true)
    router.refresh()
    window.setTimeout(() => window.location.reload(), 350)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <main className="paper-noise grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-5 py-10">
      <Card className="w-full max-w-md border-[var(--ink)] shadow-[8px_10px_0_var(--accent)]"><CardContent className="p-8 text-center sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center bg-[var(--ink)] text-2xl text-[var(--lime)]">…</div>
        <p className="eyebrow mt-7 text-[var(--accent-strong)]">menunggu aktivasi</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.06em]">Profil sudah dikirim.</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Admin sedang memeriksa data kamu. Setelah diaktifkan, kamu bisa membuka acara dan melakukan absensi.</p>
        <Button type="button" variant="primary" className="mt-7 w-full" onClick={refreshStatus} disabled={loading}>{loading ? 'Memeriksa…' : 'Refresh status'} ↻</Button>
        <button type="button" onClick={signOut} className="mt-5 text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)] hover:text-[var(--accent-strong)]">Keluar</button>
      </CardContent></Card>
    </main>
  )
}
