'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ProfileEditorProps = {
  email: string
  fullName: string
  nim: string
  division: string
}

type FormMessage = { type: 'success' | 'error'; text: string } | null

export default function ProfileEditor({ email, fullName, nim, division }: ProfileEditorProps) {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: fullName, nim, division })
  const [message, setMessage] = useState<FormMessage>(null)
  const [loading, setLoading] = useState(false)

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setMessage(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage({ type: 'error', text: result?.error || 'Profil gagal disimpan.' })
        return
      }

      setForm((current) => ({
        ...current,
        full_name: result.full_name,
        nim: result.nim,
        division: result.division || '',
      }))
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui.' })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Tidak dapat terhubung ke server. Coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="eyebrow text-[var(--accent-strong)]">lengkapi data diri</p>
        <CardTitle className="mt-2 text-xl">Profil mahasiswa</CardTitle>
        <CardDescription>Nama dan NIM ini akan tampil pada riwayat absensi. Email Google digunakan untuk login dan tidak dapat diubah dari sini.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-full-name">Nama lengkap</Label>
              <Input id="profile-full-name" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} autoComplete="name" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-nim">NIM</Label>
              <Input id="profile-nim" value={form.nim} onChange={(event) => updateField('nim', event.target.value)} autoComplete="off" placeholder="Contoh: 225150400111001" required maxLength={64} />
              <p className="text-xs leading-5 text-[var(--muted)]">NIM awal dari Google bisa berupa kode acak. Ganti dengan NIM asli kamu.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email Google</Label>
              <Input id="profile-email" value={email} readOnly disabled className="bg-[var(--surface-muted)]" />
              <p className="text-xs leading-5 text-[var(--muted)]">Email mengikuti akun Google yang digunakan saat login.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-division">Divisi <span className="font-normal text-[var(--muted)]">(opsional)</span></Label>
              <Input id="profile-division" value={form.division} onChange={(event) => updateField('division', event.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-faculty">Fakultas</Label>
              <Input id="profile-faculty" value="Fakultas Ilmu Komputer" readOnly disabled className="bg-[var(--surface-muted)]" />
              <p className="text-xs leading-5 text-[var(--muted)]">Fakultas ditetapkan oleh sistem dan tidak dapat diubah.</p>
            </div>
          </div>
          {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`border px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'border-[#e7b6b6] bg-[#f8dddd] text-[var(--danger)]' : 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'}`}>{message.text}</p>}
          <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan perubahan'} <span aria-hidden="true">↗</span></Button>
        </form>
      </CardContent>
    </Card>
  )
}
