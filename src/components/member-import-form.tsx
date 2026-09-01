import { useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Card } from '~/components/ui'

const initialManualForm = {
  full_name: '',
  nim: '',
  email: '',
  user_type: 'mahasiswa',
  division: '',
  phone: '',
}

type ManualForm = typeof initialManualForm

export function MemberImportForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [manualMessage, setManualMessage] = useState('')
  const [manualForm, setManualForm] = useState<ManualForm>(initialManualForm)

  async function refreshMembers() {
    await router.invalidate({ sync: true })
  }

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
      const result = await response.json().catch(() => null)
      setMessage(response.ok
        ? `${result.imported.length} akun dibuat, ${result.existing.length} akun diperbarui, ${result.failed.length} gagal.`
        : result?.error || 'Import gagal.')
      if (response.ok) {
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        await refreshMembers()
      }
    } catch {
      setMessage('Import gagal. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function updateManualField(field: keyof ManualForm, value: string) {
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
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setManualMessage(result?.error || 'Pendaftaran gagal.')
        return
      }
      setManualMessage(result.status === 'updated'
        ? `Akun ${result.email} sudah diperbarui dan diaktifkan.`
        : `Akun ${result.email} berhasil didaftarkan dan diaktifkan.`)
      setManualForm(initialManualForm)
      await refreshMembers()
    } catch {
      setManualMessage('Pendaftaran gagal. Periksa koneksi lalu coba lagi.')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-2 border-[var(--ink)] shadow-[7px_8px_0_var(--ink)]">
        <div className="p-6 pb-4">
          <p className="eyebrow text-[var(--accent-strong)]">daftarkan banyak orang</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">Import data FILKOM</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Unggah data mahasiswa tanpa mengirim email massal.</p>
        </div>
        <div className="p-6 pt-2">
          <div className="mb-5 border-l-4 border-[var(--accent-strong)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6">
            <p className="mb-1 font-bold text-[var(--ink)]">Format kolom CSV</p>
            <code className="break-all font-bold text-[var(--accent-strong)]">full_name,nim,email,user_type,division,phone</code>
            <p className="mt-1 text-[var(--muted)]">Tipe pengguna: mahasiswa, dosen, atau tata_usaha.</p>
          </div>
          <form onSubmit={handleImport} className="space-y-3">
            <label htmlFor="member-csv" className="block text-sm font-bold text-[var(--ink)]">Pilih file CSV</label>
            <input ref={fileInputRef} id="member-csv" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block min-h-12 w-full rounded-[4px] border-2 border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] file:mr-3 file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-bold" />
            <button type="submit" disabled={loading || !file} className="min-h-11 bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] disabled:opacity-50">{loading ? 'Mengimpor…' : 'Import data mahasiswa'} ↗</button>
          </form>
          {message ? <p role="status" className="mt-4 border-2 border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-6">{message}</p> : null}
        </div>
      </Card>

      <Card className="border-[var(--accent-strong)] shadow-[7px_8px_0_var(--accent)]">
        <div className="p-6 pb-4">
          <p className="eyebrow text-[var(--accent-strong)]">daftarkan satu orang</p>
          <h2 className="mt-2 text-xl font-black">Aktivasi manual</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Akun langsung aktif untuk login Google atau Magic Link.</p>
        </div>
        <div className="p-6 pt-2">
          <form onSubmit={handleManualCreate} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Nama lengkap</span><input value={manualForm.full_name} onChange={(event) => updateManualField('full_name', event.target.value)} placeholder="Nama mahasiswa" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" required /></label>
            <label className="space-y-2"><span className="text-sm font-bold">NIM / NIP</span><input value={manualForm.nim} onChange={(event) => updateManualField('nim', event.target.value.toUpperCase())} placeholder="Contoh: I.2410036" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" required /></label>
            <label className="space-y-2"><span className="text-sm font-bold">Tipe pengguna</span><select value={manualForm.user_type} onChange={(event) => updateManualField('user_type', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm"><option value="mahasiswa">Mahasiswa</option><option value="dosen">Dosen</option><option value="tata_usaha">Tata Usaha</option></select></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Email Google</span><input type="email" value={manualForm.email} onChange={(event) => updateManualField('email', event.target.value)} placeholder="nama@gmail.com" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" autoComplete="email" required /></label>
            <label className="space-y-2"><span className="text-sm font-bold">Divisi <span className="font-normal text-[var(--muted)]">(opsional)</span></span><input value={manualForm.division} onChange={(event) => updateManualField('division', event.target.value)} placeholder="Contoh: PSDM" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" /></label>
            <label className="space-y-2"><span className="text-sm font-bold">Nomor telepon <span className="font-normal text-[var(--muted)]">(opsional)</span></span><input type="tel" value={manualForm.phone} onChange={(event) => updateManualField('phone', event.target.value)} placeholder="08xxxxxxxxxx" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" autoComplete="tel" /></label>
            <button type="submit" disabled={manualLoading} className="min-h-11 w-fit bg-[var(--ink)] px-5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{manualLoading ? 'Mendaftarkan…' : 'Daftarkan dan aktifkan'} ↗</button>
          </form>
          {manualMessage ? <p role="status" className="mt-4 border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-6 text-[var(--accent-strong)]">{manualMessage}</p> : null}
        </div>
      </Card>
    </div>
  )
}
