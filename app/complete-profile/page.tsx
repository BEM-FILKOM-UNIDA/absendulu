'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidStaffIdentifier, isValidStudentNim } from '@/lib/auth/identity'
import { createClient } from '@/lib/supabase/client'

type UserType = 'mahasiswa' | 'dosen' | 'tata_usaha'

const userTypeLabels: Record<UserType, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  tata_usaha: 'Tata Usaha',
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [nim, setNim] = useState('')
  const [userType, setUserType] = useState<UserType>('mahasiswa')
  const [profileLoading, setProfileLoading] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadProfileType() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (mounted) router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, full_name, nim')
        .eq('id', user.id)
        .maybeSingle()

      if (!mounted) return
      if (profile?.user_type === 'dosen' || profile?.user_type === 'tata_usaha') {
        setUserType(profile.user_type)
      }
      if (profile?.full_name && profile.full_name !== user.email) setFullName(profile.full_name)
      const profileUserType = profile?.user_type === 'dosen' || profile?.user_type === 'tata_usaha' ? profile.user_type : 'mahasiswa'
      if (profile?.nim && (profileUserType === 'mahasiswa' ? isValidStudentNim(profile.nim) : isValidStaffIdentifier(profile.nim))) {
        setNim(profile.nim)
      }
      setProfileLoading(false)
    }

    void loadProfileType()
    return () => {
      mounted = false
    }
  }, [router, supabase])

  const isStudent = userType === 'mahasiswa'
  const identifierLabel = isStudent ? 'NIM' : 'NIP/NIK'
  const identifierValid = isStudent ? isValidStudentNim(nim) : isValidStaffIdentifier(nim)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || profileLoading) return

    const normalizedNim = nim.trim().toUpperCase()
    if (!fullName.trim() || !(isStudent ? isValidStudentNim(normalizedNim) : isValidStaffIdentifier(normalizedNim))) {
      setError(isStudent
        ? 'Isi nama lengkap dan NIM dengan format I.#######, contoh I.2410036.'
        : 'Isi nama lengkap dan NIP/NIK dengan format yang valid.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, nim: normalizedNim }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error || 'Profil gagal disimpan.')
        return
      }
      router.replace('/waiting-approval')
      router.refresh()
    } catch {
      setError('Tidak dapat terhubung ke server. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <main className="paper-noise grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-5 py-10">
      <Card className="w-full max-w-md border-[var(--ink)] shadow-[8px_10px_0_var(--accent)]">
        <CardHeader className="bg-[var(--ink)] p-7 text-[#f7f4ed] sm:p-8">
          <p className="eyebrow text-[var(--accent)]">satu langkah lagi</p>
          <CardTitle className="display-type pt-3 text-4xl leading-none tracking-[-.06em]">Lengkapi<br /><em>profilmu.</em></CardTitle>
          <CardDescription className="pt-4 text-white/55">Data ini dipakai untuk mencatat kehadiranmu dengan benar.</CardDescription>
        </CardHeader>
        <CardContent className="p-7 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="complete-full-name">Nama lengkap</Label>
              <Input id="complete-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required maxLength={100} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-identifier">{identifierLabel}</Label>
              <Input id="complete-identifier" value={nim} onChange={(event) => setNim(event.target.value.toUpperCase())} placeholder={isStudent ? 'I.2410036' : 'Nomor identitas'} autoComplete="off" required maxLength={64} disabled={profileLoading} />
              <p className="text-xs text-[var(--muted)]">{isStudent ? 'Format wajib: I. diikuti 7 angka.' : 'Gunakan nomor identitas resmi.'}</p>
              {!profileLoading && nim && !identifierValid && <p className="text-xs text-[var(--danger)]">{isStudent ? 'Contoh format: I.2410036.' : 'Nomor identitas belum valid.'}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-user-type">Tipe pengguna</Label>
              <Input id="complete-user-type" value={userTypeLabels[userType]} readOnly disabled className="bg-[var(--surface-muted)]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-faculty">Fakultas</Label>
              <Input id="complete-faculty" value="Fakultas Ilmu Komputer" readOnly disabled className="bg-[var(--surface-muted)]" />
            </div>
            {error ? <p role="alert" className="border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
            <Button type="submit" variant="accent" className="w-full" disabled={loading || profileLoading}>{profileLoading ? 'Memuat profil…' : loading ? 'Menyimpan…' : 'Simpan profil'} <span aria-hidden="true">↗</span></Button>
          </form>
          <button type="button" onClick={handleSignOut} className="mt-5 w-full text-center text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)] hover:text-[var(--accent-strong)]">Keluar</button>
        </CardContent>
      </Card>
    </main>
  )
}
