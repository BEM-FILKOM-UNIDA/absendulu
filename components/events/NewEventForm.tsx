'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const initialForm = { name: '', description: '', event_date: '', start_time: '', end_time: '', location: '' }

export default function NewEventForm() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active' }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setError(result.error || `Gagal membuat acara: ${response.statusText}`)
        return
      }
      router.push('/events')
      router.refresh()
    } catch {
      setError('Gagal membuat acara. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <section className="border-b border-[var(--border)] pb-8">
        <p className="eyebrow text-[var(--accent-strong)]">buat kegiatan / panitia FILKOM</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Siapkan<br /><em>acara baru.</em></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Isi detail kegiatan organisasi. Setelah acara dibuat, panitia bisa membuka QR absensi.</p>
      </section>
      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[.35fr_.65fr]">
          <div className="paper-grid bg-[var(--ink)] p-7 text-[#f7f4ed] sm:p-8">
            <p className="eyebrow text-[var(--accent)]">detail kegiatan</p>
            <h2 className="display-type mt-6 text-4xl leading-none">Mulai dari<br /><em>hal yang jelas.</em></h2>
            <p className="mt-6 text-sm leading-6 text-white/55">Nama, waktu, dan lokasi adalah sinyal pertama agar semua orang tahu harus hadir di mana.</p>
            <div className="mt-12 border-t border-white/10 pt-4 text-xs text-white/35">Status awal: <span className="font-bold text-[var(--lime)]">aktif</span></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 p-7 sm:p-8">
            <div className="space-y-2"><label htmlFor="name" className="eyebrow text-[var(--muted)]">Nama acara</label><input id="name" type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Contoh: Rapat Kerja HIMA Informatika…" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]" required /></div>
            <div className="space-y-2"><label htmlFor="description" className="eyebrow text-[var(--muted)]">Deskripsi singkat</label><textarea id="description" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Apa yang perlu diketahui mahasiswa?…" className="min-h-28 w-full resize-y border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]" rows={3} /></div>
            <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><label htmlFor="event_date" className="eyebrow text-[var(--muted)]">Tanggal</label><input id="event_date" type="date" value={form.event_date} onChange={(event) => updateField('event_date', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]" required /></div><div className="space-y-2"><label htmlFor="start_time" className="eyebrow text-[var(--muted)]">Mulai</label><input id="start_time" type="time" value={form.start_time} onChange={(event) => updateField('start_time', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]" required /></div><div className="space-y-2"><label htmlFor="end_time" className="eyebrow text-[var(--muted)]">Selesai</label><input id="end_time" type="time" value={form.end_time} onChange={(event) => updateField('end_time', event.target.value)} className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]" /></div></div>
            <div className="space-y-2"><label htmlFor="location" className="eyebrow text-[var(--muted)]">Lokasi</label><input id="location" type="text" value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="Contoh: Ruang Sidang Lt. 2…" className="h-12 w-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm outline-none focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]" /></div>
            <div className="border-t border-[var(--border)] pt-5">
              {error ? <p role="alert" className="mb-4 border border-[#e7b6b6] bg-[#f8dddd] px-3 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
              <Button type="submit" variant="accent" disabled={loading} className="w-full">{loading ? 'Menyimpan acara…' : 'Buat acara'} <span aria-hidden="true">↗</span></Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
