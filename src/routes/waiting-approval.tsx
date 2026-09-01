import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '~/lib/supabase/client'
import { GENERATED_IDENTIFIER_PATTERN } from '~/lib/auth/identity'
import { getOnboardingData } from '~/server/data'
import { Card } from '~/components/ui'

export const Route = createFileRoute('/waiting-approval')({
  loader: async () => {
    const data = await getOnboardingData()
    if (!data.auth.user) throw redirect({ to: '/login', search: { next: '/waiting-approval' } })
    if (!data.profile || GENERATED_IDENTIFIER_PATTERN.test(data.profile.nim ?? '')) {
      throw redirect({ to: '/login', search: { error: 'unprovisioned' } })
    }
    return data
  },
  component: WaitingApprovalPage,
})

function WaitingApprovalPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const { auth } = Route.useLoaderData()
  const [loading, setLoading] = useState(false)

  async function refreshStatus() {
    setLoading(true)
    await router.invalidate({ sync: true })
    setLoading(false)
  }

  async function signOut() {
    await createClient().auth.signOut()
    await navigate({ to: '/login' })
  }

  if (!auth.user) {
    return <main className="grid min-h-screen place-items-center bg-[var(--paper)] p-6"><p className="text-sm text-[var(--muted)]">Mengarahkan ke login…</p></main>
  }

  return <main className="paper-noise grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-5 py-10"><Card className="w-full max-w-md border-[var(--ink)] shadow-[8px_10px_0_var(--accent)]"><div className="p-8 text-center sm:p-10"><div className="mx-auto grid h-16 w-16 place-items-center bg-[var(--ink)] text-2xl text-[var(--lime)]">…</div><p className="eyebrow mt-7 text-[var(--accent-strong)]">menunggu aktivasi</p><h1 className="display-type mt-3 text-4xl leading-none tracking-[-.06em]">Profil sudah dikirim.</h1><p className="mt-4 text-sm leading-6 text-[var(--muted)]">Admin sedang memeriksa data kamu. Setelah diaktifkan, kamu bisa membuka acara dan melakukan absensi.</p><button type="button" onClick={refreshStatus} disabled={loading} className="mt-7 min-h-11 w-full bg-[var(--ink)] px-5 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Memeriksa…' : 'Refresh status'} ↻</button><button type="button" onClick={signOut} className="mt-5 text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)] hover:text-[var(--accent-strong)]">Keluar</button></div></Card></main>
}
