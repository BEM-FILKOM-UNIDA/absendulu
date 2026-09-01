import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

const initialForm = { name: '', description: '', event_date: '', start_time: '', end_time: '', location: '' }

export const Route = createFileRoute('/_auth/events/new')({ component: NewEventPage })

function NewEventPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })) }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const response = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: 'active' }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) { setError(result?.error || 'Gagal membuat acara.'); return }
      await navigate({ to: '/events/$id', params: { id: result.id } })
    } catch { setError('Gagal membuat acara. Periksa koneksi lalu coba lagi.') } finally { setLoading(false) }
  }
  return (
    <div className="max-w-4xl space-y-8">
      <section className="border-b border-[var(--border)] pb-8"><p className="eyebrow text-[var(--accent-strong)]">buat kegiatan / panitia FILKOM</p><h1 className="display-type mt-3 text-4xl leading-none sm:text-5xl">Siapkan<br /><em>acara baru.</em></h1><p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Isi detail kegiatan organisasi. Setelah dibuat, panitia dapat membuka QR absensi.</p></section>
      <form onSubmit={submit} className="space-y-6 border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <label className="block space-y-2"><span className="eyebrow text-[var(--muted)]">Nama acara</span><input value={form.name} onChange={(event) => update('name', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" required maxLength={160} /></label>
        <label className="block space-y-2"><span className="eyebrow text-[var(--muted)]">Deskripsi singkat</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} className="min-h-28 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm" maxLength={5000} /></label>
        <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2"><span className="eyebrow text-[var(--muted)]">Tanggal</span><input type="date" value={form.event_date} onChange={(event) => update('event_date', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm" required /></label><label className="space-y-2"><span className="eyebrow text-[var(--muted)]">Mulai</span><input type="time" value={form.start_time} onChange={(event) => update('start_time', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm" required /></label><label className="space-y-2"><span className="eyebrow text-[var(--muted)]">Selesai</span><input type="time" value={form.end_time} onChange={(event) => update('end_time', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm" /></label></div>
        <label className="block space-y-2"><span className="eyebrow text-[var(--muted)]">Lokasi</span><input value={form.location} onChange={(event) => update('location', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm" maxLength={200} /></label>
        {error ? <p role="alert" className="border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
        <button type="submit" disabled={loading} className="min-h-11 bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] disabled:opacity-50">{loading ? 'Menyimpan acara…' : 'Buat acara'} ↗</button>
      </form>
    </div>
  )
}
