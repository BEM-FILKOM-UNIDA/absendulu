import { Link } from '@tanstack/react-router'

export function RouteNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-(--paper) px-6 text-center text-(--ink)">
      <div>
        <p className="eyebrow text-(--accent-strong)">Absendulu / 404</p>
        <h1 className="display-type mt-4 text-6xl tracking-[-.07em]">Halaman tidak<br /><em>ditemukan.</em></h1>
        <Link to="/" className="mt-8 inline-flex bg-(--ink) px-5 py-3 text-sm font-bold text-[#f7f4ed]">Kembali ke beranda</Link>
      </div>
    </main>
  )
}

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-(--paper) px-6 text-(--ink)">
      <div className="max-w-md border border-(--border) bg-(--surface) p-8 text-center shadow-[8px_10px_0_var(--accent)]">
        <p className="eyebrow text-(--danger)">Absendulu / error</p>
        <h1 className="mt-4 text-3xl font-black">Terjadi gangguan.</h1>
        <p className="mt-3 text-sm leading-6 text-(--muted)">Halaman tidak dapat dimuat. Coba ulangi atau kembali ke dashboard.</p>
        <button type="button" onClick={reset} className="mt-7 bg-(--ink) px-5 py-3 text-sm font-bold text-[#f7f4ed]">Coba lagi</button>
        {import.meta.env.DEV && error.message ? <p className="mt-4 wrap-break-word text-left text-xs text-(--danger)">{error.message}</p> : null}
      </div>
    </main>
  )
}

export function RoutePending() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-5 py-7 sm:px-8 sm:py-9" aria-label="Memuat halaman" role="status">
      <div className="space-y-4 border-b border-(--border) pb-8">
        <div className="h-3 w-40 animate-pulse bg-(--surface-muted)" />
        <div className="h-20 w-72 animate-pulse bg-(--surface-muted)" />
        <div className="h-4 w-full max-w-lg animate-pulse bg-(--surface-muted)" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse bg-(--surface-muted)" />)}
      </div>
    </main>
  )
}

export function QrRouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-12 text-center">
      <p className="eyebrow text-(--danger)">QR belum bisa ditampilkan</p>
      <h1 className="display-type text-4xl leading-none sm:text-5xl">Ada gangguan<br /><em>di halaman absensi.</em></h1>
      <p className="text-sm leading-6 text-(--muted)">Coba muat ulang halaman. Jika tetap gagal, tutup sesi QR lalu buka kembali dari detail acara.</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center bg-(--ink) px-5 text-sm font-bold text-[#f7f4ed] hover:bg-(--accent-strong)">Coba lagi</button>
        <Link to="/events" className="inline-flex min-h-11 items-center justify-center border border-(--border) px-5 text-sm font-bold text-(--ink) hover:border-(--accent-strong) hover:text-(--accent-strong)">Kembali ke acara</Link>
      </div>
    </div>
  )
}
