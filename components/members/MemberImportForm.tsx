'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MemberImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) { setMessage('Pilih file CSV terlebih dahulu.'); return }
    setLoading(true)
    setMessage('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('/api/members/import', { method: 'POST', body: formData })
      const result = await response.json()
      setMessage(response.ok ? `${result.imported.length} akun dibuat, ${result.existing.length} akun diperbarui, ${result.failed.length} gagal. Mahasiswa login dengan Magic Link dari halaman Absendulu.` : result.error || 'Import gagal.')
    } catch {
      setMessage('Import gagal. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-[var(--ink)] bg-[var(--ink)] text-[#f7f4ed] shadow-[7px_8px_0_var(--lime)]">
      <CardHeader className="p-6 pb-4"><p className="eyebrow text-[var(--accent)]">daftarkan mahasiswa / csv</p><CardTitle className="mt-2 text-xl">Import data FILKOM</CardTitle><CardDescription className="text-white/55">Unggah data mahasiswa tanpa mengirim email massal. Mereka masuk ke Absendulu dengan Magic Link dari halaman login.</CardDescription></CardHeader>
      <CardContent className="p-6 pt-2"><div className="mb-5 border-l-2 border-[var(--accent)] pl-4 text-xs leading-5 text-white/55"><code className="text-[var(--lime)]">full_name,nim,email,user_type,division,phone</code><br />Tipe: mahasiswa, dosen, atau tata_usaha. Setelah import, bagikan URL login kepada mahasiswa.</div><form onSubmit={handleImport} className="flex flex-col gap-3 sm:flex-row sm:items-center"><input id="member-csv" name="file" aria-label="File CSV mahasiswa" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block min-h-11 w-full rounded-[4px] border border-white/15 bg-white/10 px-3 py-2 text-sm text-white file:mr-3 file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[var(--ink)]" /><Button type="submit" variant="accent" disabled={loading || !file}>{loading ? 'Mendaftarkan…' : 'Import data mahasiswa'} <span aria-hidden="true">↗</span></Button></form>{message && <p role="status" className="mt-4 border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/75">{message}</p>}</CardContent>
    </Card>
  )
}
