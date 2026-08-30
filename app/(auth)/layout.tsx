import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="paper-noise grid min-h-[100dvh] place-items-center overflow-hidden bg-[var(--paper)] px-5 py-10">

      <div className="pointer-events-none absolute left-0 top-0 h-1.5 w-full bg-[var(--accent)]" />

      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-[var(--lime)]/30 blur-3xl" />

      <div className="relative w-full max-w-md">

        <Link href="/" className="mx-auto mb-9 flex w-fit flex-col items-center gap-2">
          <Image
            src="/logo/Absendulu.webp"
            alt="Absendulu"
            width={68}
            height={40}
            className="h-10 w-auto"
            style={{ width: 'auto' }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">
            FILKOM UNIDA
          </span>
        </Link>

        {children}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-[11px] font-bold uppercase tracking-[.14em] text-[var(--muted-soft)]">
          <span>POWERED BY</span>
          <Image
            src="/logo/logo-bem-footer.webp"
            alt="Logo BEM FILKOM UNIDA"
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-contain"
          />
          <span>PSDM FILKOM UNIDA</span>
        </div>

      </div>
    </main>
  );
}