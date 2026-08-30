'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const initialManualForm = {
  full_name: '',
  nim: '',
  email: '',
  user_type: 'mahasiswa',
  division: '',
  phone: '',
}

export default function MemberImportForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [manualMessage, setManualMessage] = useState('')
  const [manualForm, setManualForm] = useState(initialManualForm)

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setMessage('Pilih file CSV terlebih dahulu.')
      return
    }

    setLoading(true)
    setMessage('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/members/import', { method: 'POST', body: formData })
      const result = await response.json()
      setMessage(
        response.ok
          ? `${result.imported.length} akun dibuat, ${result.existing.length} akun diperbarui, ${result.failed.length} gagal. User bisa login dengan Google atau Magic Link.`
          : result.error || 'Import gagal.',
      )
      if (response.ok) {
        setFile(null)
        event.currentTarget.reset()
        router.refresh()
      }
    } catch {
      setMessage('Import gagal. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function updateManualField(field: keyof typeof initialManualForm, value: string) {
    setManualForm((current) => ({ ...current, [field]: value }))
  }

  async function handleManualCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setManualLoading(true)
    setManualMessage('')

    try {
      const response = await fetch('/api/members/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      })
      const result = await response.json()

      if (!response.ok) {
        setManualMessage(result.error || 'Pendaftaran gagal.')
        return
      }

      setManualMessage(
        result.status === 'updated'
          ? `Akun ${result.email} sudah diperbarui dan diaktifkan.`
          : `Akun ${result.email} berhasil didaftarkan dan diaktifkan.`,
      )
      setManualForm(initialManualForm)
      router.refresh()
    } catch {
      setManualMessage('Pendaftaran gagal. Periksa koneksi lalu coba lagi.')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--foreground)] shadow-[7px_8px_0_var(--ink)]">
        <CardHeader className="p-6 pb-4">
          <p className="eyebrow !font-black !text-[var(--accent-strong)]">DAFTARKAN BANYAK ORANG</p>
          <CardTitle className="mt-2 !text-2xl !font-black !text-[var(--ink)]">Import data FILKOM</CardTitle>
          <CardDescription className="!font-medium !text-[var(--foreground)]">
            Unggah data mahasiswa tanpa mengirim email massal. Setelah import, bagikan URL login kepada mahasiswa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <div className="mb-5 border-l-4 border-[var(--accent-strong)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
            <p className="mb-1 font-bold text-[var(--ink)]">Format kolom CSV</p>
            <code className="break-all font-bold text-[var(--accent-strong)]">full_name,nim,email,user_type,division,phone</code>
            <p className="mt-1 text-[var(--foreground)]">Untuk mahasiswa, NIM harus berformat I. diikuti 7 angka. Tipe pengguna: mahasiswa, dosen, atau tata_usaha.</p>
          </div>
          <form onSubmit={handleImport} className="space-y-3">
            <label htmlFor="member-csv" className="block text-sm font-bold text-[var(--ink)]">
              Pilih file CSV
            </label>
            <input
              id="member-csv"
              name="file"
              aria-label="File CSV mahasiswa"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block min-h-12 w-full rounded-[4px] border-2 border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] file:mr-3 file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[var(--ink)]"
            />
            <Button type="submit" variant="accent" disabled={loading || !file}>
              {loading ? 'Mengimpor…' : 'Import data mahasiswa'}
              <span aria-hidden="true">↗</span>
            </Button>
          </form>
          {message ? (
            <p role="status" className="mt-4 border-2 border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm font-medium leading-6 text-[var(--foreground)]">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-[var(--accent-strong)] bg-[var(--surface)] shadow-[7px_8px_0_var(--accent)]">
        <CardHeader className="p-6 pb-4">
          <p className="eyebrow text-[var(--accent-strong)]">daftarkan satu orang</p>
          <CardTitle className="mt-2 text-xl">Aktivasi manual</CardTitle>
          <CardDescription>
            Pakai form ini untuk testing atau mendaftarkan mahasiswa tanpa membuat file CSV. Akun langsung aktif untuk login Google atau Magic Link.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <form onSubmit={handleManualCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="manual-full-name" className="text-sm font-bold">Nama lengkap</label>
              <Input id="manual-full-name" value={manualForm.full_name} onChange={(event) => updateManualField('full_name', event.target.value)} placeholder="Nama mahasiswa" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="manual-nim" className="text-sm font-bold">NIM / NIP</label>
              <Input id="manual-nim" value={manualForm.nim} onChange={(event) => updateManualField('nim', event.target.value.toUpperCase())} placeholder="Contoh: I.2410036" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="manual-type" className="text-sm font-bold">Tipe pengguna</label>
              <select id="manual-type" value={manualForm.user_type} onChange={(event) => updateManualField('user_type', event.target.value)} className="h-12 w-full rounded-[4px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]">
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen</option>
                <option value="tata_usaha">Tata Usaha</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="manual-email" className="text-sm font-bold">Email Google</label>
              <Input id="manual-email" type="email" value={manualForm.email} onChange={(event) => updateManualField('email', event.target.value)} placeholder="nama@gmail.com" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="manual-division" className="text-sm font-bold">Divisi <span className="font-normal text-[var(--muted)]">(opsional)</span></label>
              <Input id="manual-division" value={manualForm.division} onChange={(event) => updateManualField('division', event.target.value)} placeholder="Contoh: PSDM" />
            </div>
            <div className="space-y-2">
              <label htmlFor="manual-phone" className="text-sm font-bold">Nomor telepon <span className="font-normal text-[var(--muted)]">(opsional)</span></label>
              <Input id="manual-phone" type="tel" value={manualForm.phone} onChange={(event) => updateManualField('phone', event.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" disabled={manualLoading}>
                {manualLoading ? 'Mendaftarkan…' : 'Daftarkan dan aktifkan'}
                <span aria-hidden="true">↗</span>
              </Button>
            </div>
          </form>
          {manualMessage ? (
            <p role="status" className="mt-4 border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-6 text-[var(--accent-strong)]">
              {manualMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
