import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const steps = [
  ['01', 'Scan QR', 'Buka kamera, arahkan ke kode QR yang ditampilkan di lokasi acara.'],
  ['02', 'Konfirmasi kehadiran', 'Nama dan waktu kehadiranmu otomatis tercatat, tanpa isi form manual.'],
  ['03', 'Selesai', 'Kehadiranmu langsung tersimpan rapi, bisa dicek kapan saja.'],
] as const

const signalCells = [0, 1, 2, 6, 8, 13, 14, 20, 22, 24, 28, 30, 34, 35, 36, 40, 41, 42, 44, 47]

function SignalGrid() {
  return (
    <div className="grid aspect-square w-full grid-cols-7 gap-1.5 sm:gap-2" aria-label="QR signal grid" role="img">
      {Array.from({ length: 49 }).map((_, index) => (
        <span key={index} className={`aspect-square ${signalCells.includes(index) || (index * 11 + index * index) % 9 < 2 ? 'bg-[var(--ink)]' : 'bg-transparent'}`} />
      ))}
    </div>
  )
}

export default function LandingPage() {
  const year = new Date().getFullYear()

  return (
    <main className="paper-noise overflow-hidden bg-[var(--paper)]">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:h-24 sm:px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo/Absendulu.webp" alt="Absendulu" width={61} height={36} className="h-9 w-auto sm:h-10" />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)] sm:text-xs">FILKOM UNIDA</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)] sm:inline">HADIR DALAM SATU SCAN</span>
          <Link href="/login" className="border-b-2 border-[var(--ink)] pb-1 text-sm font-black hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]">Masuk <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-6 sm:gap-12 sm:px-5 sm:pb-20 sm:pt-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="animate-rise-in">
          <p className="eyebrow mb-5 flex max-w-full items-center gap-3 whitespace-nowrap text-[.58rem] tracking-[.11em] text-[var(--accent-strong)] sm:mb-7 sm:text-[.68rem] sm:tracking-[.18em]"><span className="h-2 w-2 shrink-0 bg-[var(--accent)]" />HADIR DALAM SATU SCAN</p>
          <h1 className="display-type max-w-2xl whitespace-nowrap text-5xl leading-[.95] tracking-[-.06em] text-[var(--ink)] sm:text-7xl sm:leading-[.88] sm:tracking-[-.075em] lg:text-[7.1rem]">
  Absen <br className="hidden sm:block" /><em className="text-[var(--accent-strong)]">Dulu.</em>
</h1>
          <p className="mt-6 max-w-[32ch] text-[.95rem] leading-6 text-[var(--muted)] sm:mt-8 sm:max-w-md sm:text-base sm:leading-7">Cukup scan QR di lokasi acara, dan kehadiranmu langsung tercatat. Nggak perlu isi form, nggak perlu antre tanda tangan.</p>
          <div className="mt-7 flex flex-wrap items-center gap-4 sm:mt-9">
            <ButtonLink href="/login" variant="accent" className="w-full sm:w-auto">Absen sekarang<span aria-hidden="true">↗</span></ButtonLink>
            <span className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted-soft)]">KHUSUS FILKOM UNIDA </span>
          </div>
        </div>

        <div className="animate-rise-in-delay relative mt-2 sm:mt-0">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[var(--lime)] blur-3xl sm:h-36 sm:w-36" />
          <Card className="live-demo-card relative overflow-hidden border-[var(--ink)] p-4 shadow-[10px_12px_0_var(--accent)] sm:p-8 sm:shadow-[18px_22px_0_var(--accent)]" style={{ backgroundColor: 'var(--ink)', color: '#f7f4ed' }}>
            <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-5 sm:pb-6">
              <div><p className="eyebrow text-[var(--accent)]">ACARA SEDANG BERLANGSUNG</p><h2 className="mt-2 text-xl font-black tracking-[-.05em] sm:mt-3 sm:text-2xl">Seminar Karier Digital</h2></div>
              <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-[var(--lime)]"><span className="signal-pulse h-2 w-2 rounded-full bg-[var(--lime)]" /> SEDANG DIBUKA</span>
            </div>
            <div className="grid gap-6 pt-6 sm:grid-cols-[.85fr_1.15fr] sm:items-center sm:gap-8 sm:pt-8">
              <div>
                <p className="eyebrow text-white/45">sudah hadir</p>
                <p className="mt-2 text-6xl font-black tracking-[-.1em] text-[var(--lime)] sm:text-7xl">24</p>
                <p className="mt-2 text-sm text-white/55">dari 32 peserta terdaftar</p>
                <div className="mt-6 h-1.5 bg-white/10 sm:mt-7"><div className="h-full w-3/4 bg-[var(--accent)]" /></div>
                <p className="mt-3 text-xs font-bold text-[var(--accent)]">75% peserta sudah hadir</p>
              </div>
              <div className="relative mx-auto w-full max-w-[220px] bg-[var(--paper)] p-5 text-[var(--ink)] sm:mx-0 sm:max-w-none sm:p-7">
                <SignalGrid />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--lime)] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em]">scan untuk hadir</div>
              </div>
            </div>
          </Card>
          <div className="absolute -bottom-9 -left-5 hidden border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 shadow-[6px_6px_0_var(--ink)] sm:block"><p className="eyebrow text-[var(--muted-soft)]">scan terakhir</p><p className="mt-1 text-sm font-black">Nadia Putri <span className="ml-2 font-normal text-[var(--muted)]">08:42</span></p></div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)] px-4 py-14 sm:px-5 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="eyebrow text-[var(--accent-strong)]">cara kerja</p>
              <h2 className="display-type mt-4 max-w-xl text-3xl leading-none tracking-[-.05em] sm:text-4xl sm:tracking-[-.06em] lg:text-5xl">Absen nggak perlu ribet.<br /><em>Cukup satu scan.</em></h2>
            </div>
            <p className="max-w-xs text-base leading-7 text-[var(--muted)] sm:text-lg">Absensi selesai dalam hitungan detik. Cukup scan QR yang tersedia di lokasi acara.</p>
          </div>
          <div className="mt-10 grid border-t border-[var(--border)] sm:mt-14 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <div key={number} className="border-b border-[var(--border)] py-6 sm:py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0">
                <span className="text-sm font-black text-[var(--accent-strong)]">{number}</span>
                <h3 className="mt-8 text-xl font-black tracking-[-.03em] sm:mt-12 sm:text-2xl">{title}</h3>
                <p className="mt-3 max-w-xs text-base leading-7 text-[var(--muted)]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-5 lg:px-8">
        <div className="flex flex-col gap-3 text-xs font-semibold text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Absendulu. Hadir tanpa kertas.</p>
          <p>Absensi yang nggak bikin antre.</p>
        </div>
        <div className="flex flex-col items-center gap-2 border-t border-[var(--border)] pt-5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
          <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted-soft)]">Powered by</span>
          <div className="flex items-center gap-2">
            <Image
              src="/logo/logo-bem-footer.webp"
              alt="Logo PSDM BEM FILKOM UNIDA"
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-contain"
            />
            <span className="text-xs font-black tracking-[-.02em] text-[var(--ink)]">PSDM BEM FILKOM UNIDA</span>
          </div>
        </div>
      </footer>
    </main>
  )
}