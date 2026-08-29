'use client'

import { useState, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function subscribeToUrl(onChange: () => void) {
  window.addEventListener('popstate', onChange)

  return () => window.removeEventListener('popstate', onChange)
}

function getLoginNotice() {
  const params = new URLSearchParams(window.location.search)

  if (params.get('sent') === '1') {
    return 'Link login sudah dikirim. Cek inbox emailmu.'
  }

  if (params.get('pending') === '1') {
    return 'Akunmu belum aktif. Hubungi panitia.'
  }

  if (params.get('disabled') === '1') {
    return 'Akun ini belum aktif. Hubungi panitia.'
  }

  if (params.get('error') === 'expired') {
    return 'Link sudah kedaluwarsa. Minta link baru.'
  }

  if (params.get('error') === 'invalid') {
    return 'Link tidak valid. Coba lagi.'
  }

  if (params.get('error') === 'google') {
    return 'Login Google bermasalah. Coba pakai email.'
  }

  if (params.get('error') === 'profile') {
    return 'Profil belum bisa dibuat. Coba lagi.'
  }

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

  const notice = useSyncExternalStore(
    subscribeToUrl,
    getLoginNotice,
    getServerLoginNotice,
  )

  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    setSent(false)

    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

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

    const normalizedEmail = email.trim().toLowerCase()

    const { error: loginError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (loginError) {
      setError(
        loginError.message.toLowerCase().includes('rate limit')
          ? 'Tunggu sebentar, lalu coba lagi.'
          : 'Email belum terdaftar. Hubungi panitia.',
      )

      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <Card className="overflow-hidden border-[var(--ink)] shadow-[8px_10px_0_var(--accent)]">
      <CardHeader className="bg-[var(--ink)] p-7 text-[#f7f4ed] sm:p-8">
        <p className="eyebrow text-[var(--accent)]">
          FILKOM UNIDA
        </p>

        <CardTitle className="display-type pt-3 text-4xl leading-none tracking-[-.06em]">
          Masuk ke
          <br />
          <em>AbsenDulu.</em>
        </CardTitle>

        <CardDescription className="pt-4 text-white/55">
          Pilih Google atau email untuk masuk.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-7 sm:p-8">
        {notice ? (
          <p
            role="status"
            className="mb-5 border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm font-semibold text-[var(--accent-strong)]"
          >
            {notice}
          </p>
        ) : null}

        <Button
          type="button"
          disabled={loading}
          variant="primary"
          className="w-full border border-[var(--border)] bg-white text-[var(--ink)] shadow-none hover:bg-[var(--surface-muted)]"
          onClick={handleGoogleLogin}
        >
          <span
            className="text-base font-black"
            aria-hidden="true"
          >
            G
          </span>

          {loading ? 'Membuka Google…' : 'Masuk dengan Google'}
        </Button>

        <div className="my-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.14em] text-[var(--muted-soft)]">
          <span className="h-px flex-1 bg-[var(--border)]" />

          atau email

          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          {sent ? (
            <p
              role="status"
              className="border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-6 text-[var(--accent-strong)]"
            >
              Link sudah dikirim ke{' '}
              <strong>
                {email.trim().toLowerCase()}
              </strong>
              .
            </p>
          ) : null}

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="eyebrow text-[var(--muted)]"
            >
              Email
            </Label>

            <Input
              id="email"
              type="email"
              name="email"
              spellCheck={false}
              placeholder="nama@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-[var(--danger)]"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            variant="accent"
            className="w-full"
          >
            {loading ? 'Mengirim…' : 'Kirim Link'}

            <span aria-hidden="true">
              ↗
            </span>
          </Button>
        </form>

        <div className="mt-7 border-t border-[var(--border)] pt-5">
          <p className="text-center text-xs leading-5 text-[var(--muted)]">
            Gunakan email yang sudah didaftarkan panitia.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}