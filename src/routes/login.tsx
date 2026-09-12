import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '~/lib/supabase/client'
import { getSafeNextPath } from '~/lib/http/navigation'

export const Route = createFileRoute('/login')({ component: LoginPage })

type LoginSearch = { next?: string; sent?: string; pending?: string; disabled?: string; error?: string }

function LoginPage() {
  const search = useSearch({ from: '/login' }) as LoginSearch
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const notice = search.pending === '1'
    ? 'Akunmu belum aktif. Hubungi panitia.'
    : search.disabled === '1'
      ? 'Akun ini belum aktif. Hubungi panitia.'
      : search.error === 'expired'
        ? 'Link sudah kedaluwarsa. Minta link baru.'
        : search.error === 'invalid'
          ? 'Link tidak valid. Coba lagi.'
          : search.error === 'google'
            ? 'Login Google bermasalah. Coba lagi.'
            : search.error === 'unprovisioned'
              ? 'Akun belum didaftarkan. Silakan masuk dengan Google untuk mendaftar.'
              : search.error === 'profile'
                ? 'Profil belum bisa dibuat. Coba lagi.'
                : ''

  function callbackUrl() {
    // callbackUrl is only ever called from click/submit handlers, so
    // window is guaranteed to be available. The guard here makes this
    // explicit and prevents an accidental SSR crash if the call site moves.
    if (typeof window === 'undefined') return '/auth/callback'
    const callback = new URL('/auth/callback', window.location.origin)
    callback.searchParams.set('next', getSafeNextPath(search.next))
    return callback.toString()
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    const { error: loginError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } })
    if (loginError) {
      setError('Login Google belum bisa dibuka. Coba lagi.')
      setLoading(false)
    }
  }

  return (
    <main className="paper-noise grid min-h-dvh place-items-center overflow-hidden bg-(--paper) px-5 py-10">
      <div className="pointer-events-none absolute left-0 top-0 h-1.5 w-full bg-(--accent)" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-(--lime)/30 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mx-auto mb-9 flex w-fit flex-col items-center gap-2"><img src="/logo/Absendulu.webp" alt="Absendulu" width="68" height="40" className="h-10 w-auto" /><span className="text-[10px] font-bold uppercase tracking-[.18em] text-(--muted)">FILKOM UNIDA</span></Link>
        <div className="overflow-hidden border border-(--ink) bg-(--surface) shadow-[8px_10px_0_var(--accent)]">
          <header className="bg-(--ink) p-7 text-[#f7f4ed] sm:p-8"><p className="eyebrow text-(--accent)">FILKOM UNIDA</p><h1 className="display-type pt-3 text-4xl leading-none tracking-[-.06em]">Masuk ke<br /><em>AbsenDulu.</em></h1><p className="pt-4 text-sm text-white/55">Pakai Google biar cepat — untuk 70+ orang serentak, Google tidak kena limit.</p></header>
          <div className="p-7 sm:p-8">
            {notice && <p role="status" className="mb-5 border border-(--accent-strong) bg-(--accent-soft) px-3 py-3 text-sm font-semibold text-(--accent-strong)">{notice}</p>}
            <button type="button" disabled={loading} onClick={handleGoogleLogin} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-(--border) bg-white px-5 text-sm font-bold hover:bg-(--surface-muted) disabled:opacity-50"><span className="text-base font-black">G</span>{loading ? 'Membuka Google…' : 'Masuk dengan Google'}</button>
            {error && <p role="alert" className="mt-4 border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-(--danger)">{error}</p>}
            <p className="mt-3 text-center text-xs leading-5 text-(--muted)">Akun baru otomatis dibuat, lalu lengkapi NIM di halaman berikutnya.</p>
            <p className="mt-7 border-t border-(--border) pt-5 text-center text-xs leading-5 text-(--muted)">Baru pertama kali? Masuk dengan Google, lalu isi NIM.</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-(--muted-soft)"><span>POWERED BY</span><img src="/logo/logo-bem-footer.webp" alt="Logo BEM FILKOM UNIDA" width="24" height="24" className="h-6 w-6 rounded-full object-contain" /><span>PSDM FILKOM UNIDA</span></div>
      </div>
    </main>
  )
}
