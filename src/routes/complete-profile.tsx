import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '~/lib/supabase/client'
import { getOnboardingData } from '~/server/data'
import { GENERATED_IDENTIFIER_PATTERN, isValidStaffIdentifier, isValidStudentNim } from '~/lib/auth/identity'
import { Card } from '~/components/ui'

type UserType = 'mahasiswa' | 'dosen' | 'tata_usaha'
const userTypeLabels: Record<UserType, string> = { mahasiswa: 'Mahasiswa', dosen: 'Dosen', tata_usaha: 'Tata Usaha' }

export const Route = createFileRoute('/complete-profile')({
  loader: async () => {
    const data = await getOnboardingData()
    if (!data.auth.user) throw redirect({ to: '/login', search: { next: '/complete-profile' } })
    if (!data.profile || GENERATED_IDENTIFIER_PATTERN.test(data.profile.nim ?? '')) {
      throw redirect({ to: '/login', search: { error: 'unprovisioned' } })
    }
    return data
  },
  component: CompleteProfilePage,
})

function CompleteProfilePage() {
  const navigate = useNavigate()
  const { auth, profile } = Route.useLoaderData()
  const userType: UserType = profile?.user_type === 'dosen' || profile?.user_type === 'tata_usaha' ? profile.user_type : 'mahasiswa'
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [nim, setNim] = useState(profile?.nim || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const identifierLabel = userType === 'mahasiswa' ? 'NIM' : 'NIP/NIK'
  const identifierValid = userType === 'mahasiswa' ? isValidStudentNim(nim) : isValidStaffIdentifier(nim)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth.user || loading) return
    const normalizedNim = nim.trim().toUpperCase()
    const valid = userType === 'mahasiswa' ? isValidStudentNim(normalizedNim) : isValidStaffIdentifier(normalizedNim)
    if (!fullName.trim() || !valid) {
      setError(userType === 'mahasiswa' ? 'Isi nama lengkap dan NIM dengan format I.#######, contoh I.2410036.' : 'Isi nama lengkap dan NIP/NIK dengan format yang valid.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: fullName.trim(), nim: normalizedNim }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) { setError(result?.error || 'Profil gagal disimpan.'); return }
      await navigate({ to: '/waiting-approval' })
    } catch { setError('Tidak dapat terhubung ke server. Coba lagi.') } finally { setLoading(false) }
  }

  async function signOut() { await createClient().auth.signOut(); await navigate({ to: '/login' }) }
  if (!auth.user) return <main className="grid min-h-screen place-items-center bg-[var(--paper)] p-6"><p className="text-sm text-[var(--muted)]">Mengarahkan ke login…</p></main>

  return (
    <main className="paper-noise grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-5 py-10">
      <Card className="w-full max-w-md overflow-hidden border-[var(--ink)] shadow-[8px_10px_0_var(--accent)]">
        <div className="bg-[var(--ink)] p-7 text-[#f7f4ed] sm:p-8"><p className="eyebrow text-[var(--accent)]">satu langkah lagi</p><h1 className="display-type pt-3 text-4xl leading-none tracking-[-.06em]">Lengkapi<br /><em>profilmu.</em></h1><p className="pt-4 text-sm leading-6 text-white/55">Data ini dipakai untuk mencatat kehadiranmu dengan benar.</p></div>
        <div className="p-7 sm:p-8">
          <form onSubmit={submit} className="space-y-5">
            <label className="block space-y-2"><span className="text-sm font-bold">Nama lengkap</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" autoComplete="name" required maxLength={100} /></label>
            <label className="block space-y-2"><span className="text-sm font-bold">{identifierLabel}</span><input value={nim} onChange={(event) => setNim(event.target.value.toUpperCase())} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" placeholder={userType === 'mahasiswa' ? 'I.2410036' : 'Nomor identitas'} required maxLength={64} /><span className="block text-xs text-[var(--muted)]">{userType === 'mahasiswa' ? 'Format wajib: I. diikuti 7 angka.' : 'Gunakan nomor identitas resmi.'}</span>{nim && !identifierValid ? <span className="block text-xs text-[var(--danger)]">{userType === 'mahasiswa' ? 'Contoh format: I.2410036.' : 'Nomor identitas belum valid.'}</span> : null}</label>
            <label className="block space-y-2"><span className="text-sm font-bold">Tipe pengguna</span><input value={userTypeLabels[userType]} readOnly disabled className="h-12 w-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm" /></label>
            <label className="block space-y-2"><span className="text-sm font-bold">Fakultas</span><input value="Fakultas Ilmu Komputer" readOnly disabled className="h-12 w-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm" /></label>
            {error ? <p role="alert" className="border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
            <button type="submit" disabled={loading} className="min-h-11 w-full bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] disabled:opacity-50">{loading ? 'Menyimpan…' : 'Simpan profil'} ↗</button>
          </form>
          <button type="button" onClick={signOut} className="mt-5 w-full text-center text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)] hover:text-[var(--accent-strong)]">Keluar</button>
        </div>
      </Card>
    </main>
  )
}
