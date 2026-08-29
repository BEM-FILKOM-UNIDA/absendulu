import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const steps = [
  ['01', 'Buat acara', 'Isi nama kegiatan, waktu, dan lokasi acara organisasi FILKOM.'],
  ['02', 'Buka absensi', 'Tampilkan QR di lokasi acara agar mahasiswa bisa langsung scan.'],
  ['03', 'Rekap otomatis', 'Pantau kehadiran tanpa kertas dan tanpa merapikan spreadsheet.'],
] as const

const signalCells = [0, 1, 2, 6, 8, 13, 14, 20, 22, 24, 28, 30, 34, 35, 36, 40, 41, 42, 44, 47]

function SignalGrid() {
  return (
    <div className="grid aspect-square w-full grid-cols-7 gap-2" aria-label="QR signal grid" role="img">
      {Array.from({ length: 49 }).map((_, index) => (
        <span key={index} className={`aspect-square ${signalCells.includes(index) || (index * 11 + index * index) % 9 < 2 ? 'bg-[var(--ink)]' : 'bg-transparent'}`} />
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="paper-noise overflow-hidden bg-[var(--paper)]">
      <nav className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center bg-[var(--ink)] text-sm font-black text-[var(--lime)]">A</span><span className="text-xl font-black tracking-[-.08em]">absendulu<span className="text-[var(--accent-strong)]">/</span></span></Link>
        <div className="flex items-center gap-5"><span className="hidden text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)] sm:inline">FILKOM UNIDA · absensi acara</span><Link href="/login" className="border-b-2 border-[var(--ink)] pb-1 text-sm font-black hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]">Masuk <span aria-hidden="true">↗</span></Link></div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="animate-rise-in">
          <p className="eyebrow mb-7 flex items-center gap-3 text-[var(--accent-strong)]"><span className="h-2 w-2 bg-[var(--accent)]" /> FILKOM UNIDA / ABSENSI ORGANISASI</p>
          <h1 className="display-type max-w-2xl text-6xl leading-[.88] tracking-[-.075em] text-[var(--ink)] sm:text-7xl lg:text-[7.1rem]">Hadir,<br /><em className="text-[var(--accent-strong)]">tercatat.</em></h1>
          <p className="mt-8 max-w-md text-base leading-7 text-[var(--muted)]"><strong>Absendulu</strong> membantu mahasiswa Fakultas Ilmu Komputer Universitas Djuanda melakukan absensi acara organisasi dengan cepat, rapi, dan tanpa kertas.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4"><ButtonLink href="/login" variant="accent">Mulai absensi <span aria-hidden="true">↗</span></ButtonLink><span className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted-soft)]">Akses dari panitia acara</span></div>
        </div>

        <div className="animate-rise-in-delay relative">
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[var(--lime)] blur-3xl" />
          <Card className="relative overflow-hidden border-[var(--ink)] bg-[var(--ink)] p-5 text-[#f7f4ed] shadow-[18px_22px_0_var(--accent)] sm:p-8">
            <div className="flex items-start justify-between border-b border-white/15 pb-6"><div><p className="eyebrow text-[var(--accent)]">absensi live</p><h2 className="mt-3 text-2xl font-black tracking-[-.05em]">Forum Organisasi FILKOM</h2></div><span className="flex items-center gap-2 text-xs font-bold text-[var(--lime)]"><span className="signal-pulse h-2 w-2 rounded-full bg-[var(--lime)]" /> SEDANG DIBUKA</span></div>
            <div className="grid gap-8 pt-8 sm:grid-cols-[.85fr_1.15fr] sm:items-center"><div><p className="eyebrow text-white/45">sudah hadir</p><p className="mt-2 text-7xl font-black tracking-[-.1em] text-[var(--lime)]">24</p><p className="mt-2 text-sm text-white/55">dari 32 mahasiswa terdaftar</p><div className="mt-7 h-1.5 bg-white/10"><div className="h-full w-3/4 bg-[var(--accent)]" /></div><p className="mt-3 text-xs font-bold text-[var(--accent)]">75% hadir sekarang</p></div><div className="relative bg-[var(--paper)] p-7 text-[var(--ink)]"><SignalGrid /><div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--lime)] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em]">scan untuk hadir</div></div></div>
          </Card>
          <div className="absolute -bottom-9 -left-5 hidden border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 shadow-[6px_6px_0_var(--ink)] sm:block"><p className="eyebrow text-[var(--muted-soft)]">scan terakhir</p><p className="mt-1 text-sm font-black">Nadia Putri <span className="ml-2 font-normal text-[var(--muted)]">08:42</span></p></div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow text-[var(--accent-strong)]">cara kerja</p><h2 className="display-type mt-4 max-w-xl text-4xl leading-none tracking-[-.06em] sm:text-5xl">Tidak banyak tombol.<br /><em>Lebih banyak kepastian.</em></h2></div><p className="max-w-xs text-sm leading-6 text-[var(--muted)]">Dibuat untuk panitia organisasi FILKOM yang ingin fokus menjalankan acara, bukan mengejar rekap absensi.</p></div>
          <div className="mt-14 grid border-t border-[var(--border)] md:grid-cols-3">
            {steps.map(([number, title, description]) => <div key={number} className="border-b border-[var(--border)] py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0"><span className="text-xs font-black text-[var(--accent-strong)]">{number}</span><h3 className="mt-12 text-lg font-black tracking-[-.03em]">{title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">{description}</p></div>)}
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs font-semibold text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between lg:px-8"><p>© 2025 Absendulu · FILKOM UNIDA. Hadir tanpa kertas.</p><p>Untuk mahasiswa yang menggerakkan organisasi.</p></footer>
    </main>
  )
}
