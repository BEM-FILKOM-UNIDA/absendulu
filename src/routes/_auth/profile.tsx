import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getProfileData } from '~/server/data'
import { Badge, Card } from '~/components/ui'

const typeLabels: Record<string, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  tata_usaha: 'Tata Usaha',
}

type ProfileForm = { full_name: string; nim: string; division: string }

export const Route = createFileRoute('/_auth/profile')({
  loader: () => getProfileData(),
  component: ProfilePage,
})

function ProfilePage() {
  const { auth, profile, isAdmin } = Route.useLoaderData()
  const displayName = profile.full_name || 'Pengguna'
  const identifierLabel = profile.user_type === 'mahasiswa' ? 'NIM' : 'NIP/NIK'
  const [form, setForm] = useState<ProfileForm>({
    full_name: profile.full_name || '',
    nim: profile.nim || '',
    division: profile.division || '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const body = isAdmin ? form : { full_name: form.full_name, nim: form.nim }
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error || 'Profil gagal disimpan.')
        return
      }
      setForm((current) => ({
        ...current,
        full_name: result.full_name,
        nim: result.nim,
        division: result.division || '',
      }))
      setMessage('Profil berhasil diperbarui.')
    } catch {
      setError('Tidak dapat terhubung ke server. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section className="border-b border-(--border) pb-8">
        <p className="eyebrow text-(--accent-strong)">profil akun / FILKOM</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">
          Profil<br /><em>Absendulu.</em>
        </h1>
      </section>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-5 border-b border-(--border) bg-(--ink) p-6 text-[#f7f4ed] sm:p-8">
          <div className="grid h-16 w-16 shrink-0 place-items-center bg-(--accent) text-2xl font-black text-(--ink)">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="eyebrow text-(--accent)">akun aktif</p>
            <h2 className="mt-2 wrap-break-word text-2xl font-black">{displayName}</h2>
            <p className="mt-1 break-all text-sm text-white/55">{auth.user?.email || 'Email belum tersedia'}</p>
          </div>
        </div>
        <dl className="grid gap-px bg-(--border) sm:grid-cols-2">
          <div className="bg-(--surface) p-5">
            <dt className="eyebrow text-(--muted-soft)">{identifierLabel}</dt>
            <dd className="mt-3 font-black">{profile.nim || 'Belum diisi'}</dd>
          </div>
          <div className="bg-(--surface) p-5">
            <dt className="eyebrow text-(--muted-soft)">Tipe pengguna</dt>
            <dd className="mt-3 font-black">{typeLabels[profile.user_type] || profile.user_type}</dd>
          </div>
          <div className="bg-(--surface) p-5">
            <dt className="eyebrow text-(--muted-soft)">Fakultas</dt>
            <dd className="mt-3 font-black">Fakultas Ilmu Komputer</dd>
          </div>
          {isAdmin ? (
            <div className="bg-(--surface) p-5">
              <dt className="eyebrow text-(--muted-soft)">Status akun</dt>
              <dd className="mt-3"><Badge variant="success">Aktif</Badge></dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card>
        <div className="p-6 sm:p-8">
          <p className="eyebrow text-(--accent-strong)">data diri</p>
          <h2 className="mt-2 text-xl font-black">Perbarui profil</h2>
          <p className="mt-2 text-sm text-(--muted)">Email Google dan fakultas ditetapkan oleh sistem.</p>
          <form onSubmit={saveProfile} className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-bold">Nama lengkap</span>
              <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className="h-12 w-full border border-(--border) bg-(--surface-strong) px-4 text-sm" required maxLength={100} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">{identifierLabel}</span>
              <input value={form.nim} onChange={(event) => setForm({ ...form, nim: event.target.value.toUpperCase() })} className="h-12 w-full border border-(--border) bg-(--surface-strong) px-4 text-sm" required maxLength={64} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">Email Google</span>
              <input value={auth.user?.email || ''} readOnly disabled className="h-12 w-full border border-(--border) bg-(--surface-muted) px-4 text-sm" />
            </label>
            {isAdmin ? (
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-bold">Divisi</span>
                <input value={form.division} onChange={(event) => setForm({ ...form, division: event.target.value })} className="h-12 w-full border border-(--border) bg-(--surface-strong) px-4 text-sm" maxLength={100} />
              </label>
            ) : null}
            {message ? <p role="status" className="sm:col-span-2 border border-(--accent-strong) bg-(--accent-soft) px-4 py-3 text-sm font-semibold text-(--accent-strong)">{message}</p> : null}
            {error ? <p role="alert" className="sm:col-span-2 border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-(--danger)">{error}</p> : null}
            <button type="submit" disabled={saving} className="min-h-11 w-fit rounded-sm bg-(--ink) px-5 text-sm font-bold text-[#f7f4ed] disabled:opacity-50">
              {saving ? 'Menyimpan…' : 'Simpan perubahan'} ↗
            </button>
          </form>
        </div>
      </Card>
    </div>
  )
}
