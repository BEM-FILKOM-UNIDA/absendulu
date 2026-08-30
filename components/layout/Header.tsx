'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard' || pathname === '/mahasiswa') return pathname === '/mahasiswa' ? 'Beranda' : 'Ringkasan'
  if (pathname === '/profile') return 'Profil'
  if (pathname === '/events' || pathname.startsWith('/events/')) return 'Acara FILKOM'
  if (pathname === '/scan' || pathname.startsWith('/scan/')) return 'Scan QR'
  if (pathname === '/attendance/history' || pathname.startsWith('/attendance/history/')) return 'Riwayat Absensi'
  if (pathname === '/members' || pathname.startsWith('/members/')) return 'Data Mahasiswa'
  return 'Absendulu'
}
const adminMobileNav = [
  { href: '/dashboard', label: 'Ringkasan', code: '00' },
  { href: '/events', label: 'Acara', code: '01' },
  { href: '/scan', label: 'Scan', code: '02' },
  { href: '/attendance/history', label: 'Riwayat', code: '03' },
] as const

const userMobileNav = [
  { href: '/mahasiswa', label: 'Beranda', code: '00' },
  { href: '/events', label: 'Acara', code: '01' },
  { href: '/scan', label: 'Scan', code: '02' },
  { href: '/attendance/history', label: 'Riwayat', code: '03' },
  { href: '/profile', label: 'Profil', code: '04' },
] as const

function isActiveRoute(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const navItems = isAdmin
    ? [...adminMobileNav, { href: '/members', label: 'Data', code: '04' }]
    : userMobileNav

  return (
    <>
      <header className="flex min-h-24 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--paper)] px-5 sm:px-8">
        <div className="min-w-0">
          <p className="eyebrow text-[var(--accent-strong)] lg:hidden">absendulu/</p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-[-.06em]">{title}</h1>
        </div>

        {isAdmin ? (
          <Link
            href="/profile"
            className="ml-4 flex shrink-0 items-center gap-2 text-right transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label="Lihat profil akun"
          >
            <span className="hidden sm:block">
              <span className="block text-sm font-black">Akun saya</span>
              <span className="eyebrow mt-1 block text-[var(--muted-soft)]">lihat profil</span>
            </span>
            <span className="grid h-10 w-10 place-items-center bg-[var(--ink)] text-sm font-black text-[var(--lime)]">A</span>
          </Link>
        ) : (
          <span className="ml-4 grid h-10 w-10 place-items-center bg-[var(--ink)] text-sm font-black text-[var(--lime)]" aria-label="Akun mahasiswa">A</span>
        )}
      </header>

      <nav
        className={`fixed inset-x-0 bottom-0 z-50 grid border-t border-white/10 bg-[var(--ink)] px-1 pb-[max(env(safe-area-inset-bottom),.5rem)] shadow-[0_-8px_30px_rgba(0,0,0,.12)] lg:hidden grid-cols-5`}
        aria-label="Navigasi dashboard"
      >
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 border-t-2 px-1 text-center text-[9px] font-black uppercase tracking-[.04em] transition-colors ${active ? 'border-[var(--accent)] bg-white/[.06] text-[var(--lime)]' : 'border-transparent text-white/45 hover:bg-white/[.04] hover:text-white'}`}
            >
              <span className="font-mono text-[10px] leading-none">{item.code}</span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
