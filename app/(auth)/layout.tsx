import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="paper-noise grid min-h-[100dvh] place-items-center overflow-hidden bg-[var(--paper)] px-5 py-10"><div className="pointer-events-none absolute left-0 top-0 h-1.5 w-full bg-[var(--accent)]" /><div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-[var(--lime)]/30 blur-3xl" /><div className="relative w-full max-w-md"><Link href="/" className="mx-auto mb-9 flex w-fit items-center gap-3"><span className="grid h-10 w-10 place-items-center bg-[var(--ink)] text-sm font-black text-[var(--lime)]">A</span><span className="text-xl font-black tracking-[-.08em]">absendulu<span className="text-[var(--accent-strong)]">/</span></span></Link>{children}<p className="mt-6 text-center text-[11px] font-bold uppercase tracking-[.14em] text-[var(--muted-soft)]">Absensi acara organisasi · FILKOM UNIDA</p></div></main>
}
