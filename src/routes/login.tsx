import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '~/lib/supabase/client'
import { getSafeNextPath } from '~/lib/navigation'

export const Route = createFileRoute('/login')({ component: LoginPage })

type LoginSearch = { next?: string; sent?: string; pending?: string; disabled?: string; error?: string }

function LoginPage() {
  const search = useSearch({ from: '/login' }) as LoginSearch
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(search.sent === '1')
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
            ? 'Login Google bermasalah. Coba pakai email.'
            : search.error === 'unprovisioned'
              ? 'Akun belum didaftarkan panitia. Hubungi admin FILKOM terlebih dahulu.'
              : search.error === 'profile'
                ? 'Profil belum bisa dibuat. Coba lagi.'
                : ''

  function callbackUrl() {
    const callback = new URL('/auth/callback', window.location.origin)
    callback.searchParams.set('next', getSafeNextPath(search.next))
    return callback.toString()
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    const { error: loginError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } })
    if (loginError) {
      setError('Login Google belum bisa dibuka. Coba pakai email.')
      setLoading(false)
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSent(false)
    const { error: loginError } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false, emailRedirectTo: callbackUrl() } })
    if (loginError) {
      setError(loginError.message.toLowerCase().includes('rate limit') ? 'Tunggu sebentar, lalu coba lagi.' : 'Email tidak dapat diproses. Pastikan sudah didaftarkan panitia atau coba lagi nanti.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="paper-noise grid min-h-[100dvh] place-items-center overflow-hidden bg-[var(--paper)] px-5 py-10">
      <div className="pointer-events-none absolute left-0 top-0 h-1.5 w-full bg-[var(--accent)]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-[var(--lime)]/30 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mx-auto mb-9 flex w-fit flex-col items-center gap-2"><img src="/logo/Absendulu.webp" alt="Absendulu" width="68" height="40" className="h-10 w-auto" /><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">FILKOM UNIDA</span></Link>
        <div className="overflow-hidden border border-[var(--ink)] bg-[var(--surface)] shadow-[8px_10px_0_var(--accent)]">
          <header className="bg-[var(--ink)] p-7 text-[#f7f4ed] sm:p-8"><p className="eyebrow text-[var(--accent)]">FILKOM UNIDA</p><h1 className="display-type pt-3 text-4xl leading-none tracking-[-.06em]">Masuk ke<br /><em>AbsenDulu.</em></h1><p className="pt-4 text-sm text-white/55">Pilih Google atau email untuk masuk.</p></header>
          <div className="p-7 sm:p-8">
            {notice && <p role="status" className="mb-5 border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm font-semibold text-[var(--accent-strong)]">{notice}</p>}
            <button type="button" disabled={loading} onClick={handleGoogleLogin} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--border)] bg-white px-5 text-sm font-bold hover:bg-[var(--surface-muted)] disabled:opacity-50"><span className="text-base font-black">G</span>{loading ? 'Membuka Google…' : 'Masuk dengan Google'}</button>
            <div className="my-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.14em] text-[var(--muted-soft)]"><span className="h-px flex-1 bg-[var(--border)]" />atau email<span className="h-px flex-1 bg-[var(--border)]" /></div>
            <form onSubmit={handleLogin} className="space-y-5">
              {sent && <p role="status" className="border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-6 text-[var(--accent-strong)]">Link sudah dikirim ke <strong>{email.trim().toLowerCase()}</strong>.</p>}
              <div className="space-y-2"><label htmlFor="email" className="eyebrow text-[var(--muted)]">Email</label><input id="email" type="email" name="email" spellCheck={false} placeholder="nama@gmail.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]" /></div>
              {error && <p role="alert" className="border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p>}
              <button type="submit" disabled={loading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] hover:bg-[#55ded4] disabled:opacity-50">{loading ? 'Mengirim…' : 'Kirim Link'} <span aria-hidden="true">↗</span></button>
            </form>
            <p className="mt-7 border-t border-[var(--border)] pt-5 text-center text-xs leading-5 text-[var(--muted)]">Gunakan email yang sudah didaftarkan panitia.</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--muted-soft)]"><span>POWERED BY</span><img src="/logo/logo-bem-footer.webp" alt="Logo BEM FILKOM UNIDA" width="24" height="24" className="h-6 w-6 rounded-full object-contain" /><span>PSDM FILKOM UNIDA</span></div>
      </div>
    </main>
  )
}
