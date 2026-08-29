'use client'

import { useState, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function subscribeToUrl(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function getLoginNotice() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('sent') === '1') return 'Link login sudah dikirim. Periksa inbox email kampus kamu.'
  if (params.get('pending') === '1') return 'Akun belum diaktifkan admin BEM. Hubungi admin untuk mendapat akses.'
  if (params.get('disabled') === '1') return 'Akun tidak aktif. Hubungi admin BEM untuk bantuan.'
  if (params.get('error') === 'expired') return 'Link login sudah kedaluwarsa. Minta link baru.'
  if (params.get('error') === 'invalid') return 'Link login tidak valid. Minta link baru.'
  return ''
}

function getServerLoginNotice() {
  return ''
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const notice = useSyncExternalStore(subscribeToUrl, getLoginNotice, getServerLoginNotice)
  const supabase = createClient()

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSent(false)

    const normalizedEmail = email.trim().toLowerCase()
    const { error: loginError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (loginError) {
      setError('Email belum terdaftar atau link belum dapat dikirim. Hubungi admin BEM.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <Card className="overflow-hidden border-[var(--ink)] shadow-[8px_10px_0_var(--accent)]">
      <CardHeader className="bg-[var(--ink)] p-7 text-[#f7f4ed] sm:p-8">
        <p className="eyebrow text-[var(--accent)]">secure entry / 01</p>
        <CardTitle className="display-type pt-3 text-4xl leading-none tracking-[-.06em]">Masuk ke<br /><em>ruang kerja.</em></CardTitle>
        <CardDescription className="pt-4 text-white/55">Masukkan email yang sudah didaftarkan admin BEM. Kami akan mengirim link login sekali pakai.</CardDescription>
      </CardHeader>
      <CardContent className="p-7 sm:p-8">
        <form onSubmit={handleLogin} className="space-y-5">
          {notice ? <p role="status" className="border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm font-semibold text-[var(--accent-strong)]">{notice}</p> : null}
          {sent ? <p role="status" className="border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-6 text-[var(--accent-strong)]">Link login sudah dikirim ke <strong>{email.trim().toLowerCase()}</strong>. Buka email tersebut untuk masuk otomatis ke dashboard.</p> : null}
          <div className="space-y-2"><Label htmlFor="email" className="eyebrow text-[var(--muted)]">Email terdaftar</Label><Input id="email" type="email" placeholder="nama@kampus.ac.id" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div>
          {error ? <p role="alert" className="border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
          <Button type="submit" disabled={loading} variant="accent" className="w-full">{loading ? 'Mengirim link...' : 'Kirim link login'} <span aria-hidden="true">↗</span></Button>
        </form>
        <div className="mt-7 border-t border-[var(--border)] pt-5"><p className="text-center text-xs leading-5 text-[var(--muted)]">Tidak punya akses? Hubungi admin BEM agar email kamu didaftarkan.</p></div>
      </CardContent>
    </Card>
  )
}
