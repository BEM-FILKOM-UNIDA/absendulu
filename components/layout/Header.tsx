'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const labels: Record<string, string> = { '/dashboard': 'Ringkasan', '/events': 'Acara FILKOM', '/scan': 'Scan QR', '/attendance/history': 'Riwayat Absensi', '/members': 'Data Mahasiswa', '/profile': 'Profil' }
const mobileNav = [
  { href: '/dashboard', label: 'Ringkasan', code: '00' },
  { href: '/', label: 'Beranda', code: '↖' },
  { href: '/events', label: 'Acara', code: '01' },
  { href: '/scan', label: 'Scan', code: '02' },
  { href: '/attendance/history', label: 'Riwayat', code: '03' },
]

export default function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const title = labels[pathname] || 'Absendulu'
  const navItems = isAdmin ? [...mobileNav, { href: '/members', label: 'Data', code: '04' }] : mobileNav

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="flex min-h-24 items-center justify-between border-b border-[var(--border)] bg-[var(--paper)] px-5 sm:px-8">
        <div><p className="eyebrow text-[var(--accent-strong)] lg:hidden">absendulu/</p><h1 className="mt-1 text-2xl font-black tracking-[-.06em]">{title}</h1></div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/profile" className="flex items-center gap-2 text-right" aria-label="Lihat profil akun">
            <span><p className="text-sm font-black">Akun saya</p><p className="eyebrow mt-1 text-[var(--muted-soft)]">lihat profil</p></span>
          </Link>
          <button type="button" onClick={signOut} className="flex items-center gap-1 border-l border-[var(--border)] pl-3 text-xs font-black uppercase tracking-[.1em] text-[var(--ink)] hover:text-[var(--accent-strong)]" aria-label="Keluar">
            <span>KELUAR</span>
            <span className="text-lg leading-none" aria-hidden="true">↗</span>
          </button>
          <Link href="/profile" className="grid h-10 w-10 place-items-center bg-[var(--ink)] text-sm font-black text-[var(--lime)]" aria-label="Lihat profil akun">A</Link>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-[var(--ink)] bg-[var(--ink)] px-2 pb-[max(env(safe-area-inset-bottom),.5rem)] lg:hidden" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }} aria-label="Navigasi mobile">
        {navItems.map((item) => { const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)); return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`min-w-0 flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[10px] font-black uppercase tracking-[.06em] ${active ? 'border-[var(--accent)] text-[var(--lime)]' : 'border-transparent text-white/45 hover:text-white'}`}><span className="font-mono text-[9px]">{item.code}</span>{item.label}</Link> })}
      </nav>
    </>
  )
}
