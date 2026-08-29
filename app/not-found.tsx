import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-6 text-center text-[var(--ink)]">
      <div>
        <p className="eyebrow text-[var(--accent-strong)]">Absendulu / 404</p>
        <h1 className="display-type mt-4 text-6xl tracking-[-.07em]">Halaman tidak<br /><em>ditemukan.</em></h1>
        <Link href="/" className="mt-8 inline-flex bg-[var(--ink)] px-5 py-3 text-sm font-bold text-[#f7f4ed]">Kembali ke beranda</Link>
      </div>
    </main>
  )
}
