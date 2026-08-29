'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body className="grid min-h-screen place-items-center bg-[#f3f0e9] px-6 text-[#10252d]">
        <main className="max-w-md border border-[#d3ddd7] bg-[#fffdf8] p-8 text-center shadow-[8px_10px_0_#26d0cf]">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#087f82]">Absendulu / error</p>
          <h1 className="mt-4 text-3xl font-black">Terjadi gangguan.</h1>
          <p className="mt-3 text-sm leading-6 text-[#64736f]">Halaman tidak dapat dimuat. Coba ulangi atau kembali ke dashboard.</p>
          <button type="button" onClick={() => reset()} className="mt-7 bg-[#10252d] px-5 py-3 text-sm font-bold text-[#f7f4ed]">Coba lagi</button>
        </main>
      </body>
    </html>
  )
}
