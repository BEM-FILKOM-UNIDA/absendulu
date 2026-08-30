'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function AccountDisabledPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <main className="paper-noise grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-5 py-10">
      <Card className="w-full max-w-md border-[var(--ink)] shadow-[8px_10px_0_var(--danger)]"><CardContent className="p-8 text-center sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center bg-[var(--danger)] text-2xl text-white">!</div>
        <p className="eyebrow mt-7 text-[var(--danger)]">akses dinonaktifkan</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.06em]">Hubungi admin.</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Akun ini belum dapat menggunakan Absendulu. Hubungi admin BEM FILKOM jika menurutmu ini keliru.</p>
        <Button type="button" variant="danger" className="mt-7 w-full" onClick={signOut} disabled={loading}>{loading ? 'Mengeluarkan…' : 'Keluar'} ↗</Button>
      </CardContent></Card>
    </main>
  )
}
