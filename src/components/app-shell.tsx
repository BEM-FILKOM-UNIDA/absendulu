import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '~/lib/supabase/client'

const adminNav = [
  ['/dashboard', 'Ringkasan', '00'],
  ['/events', 'Acara FILKOM', '01'],
  ['/scan', 'Scan Absensi', '02'],
  ['/attendance/history', 'Riwayat Absensi', '03'],
  ['/members', 'Data Mahasiswa', '04'],
] as const

const userNav = [
  ['/mahasiswa', 'Beranda', '00'],
  ['/events', 'Acara FILKOM', '01'],
  ['/scan', 'Scan Absensi', '02'],
  ['/attendance/history', 'Riwayat Saya', '03'],
  ['/profile', 'Profil', '04'],
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
}

function titleFor(pathname: string) {
  if (pathname === '/dashboard') return 'Ringkasan'
  if (pathname === '/mahasiswa') return 'Beranda'
  if (pathname.startsWith('/events')) return 'Acara FILKOM'
  if (pathname.startsWith('/scan')) return 'Scan QR'
  if (pathname.startsWith('/attendance')) return 'Riwayat Absensi'
  if (pathname.startsWith('/members')) return 'Data Mahasiswa'
  return 'Profil'
}

function shortLabel(label: string) {
  return label.replace('Acara FILKOM', 'Acara').replace('Scan Absensi', 'Scan').replace('Riwayat Absensi', 'Riwayat').replace('Riwayat Saya', 'Riwayat')
}

function DesktopNavItem({ href, label, code, pathname }: { href: string; label: string; code: string; pathname: string }) {
  const active = isActive(pathname, href)
  return (
    <Link to={href} aria-current={active ? 'page' : undefined} className={`flex items-center justify-between border-l-2 px-3 py-3 text-sm font-bold ${active ? 'border-[var(--accent)] bg-white/10 text-[var(--lime)]' : 'border-transparent text-white/55 hover:bg-white/[.05] hover:text-white'}`}>
      <span>{label}</span>
      <span className="font-mono text-[10px]">{code}</span>
    </Link>
  )
}

function MobileNavItem({ href, label, code, pathname }: { href: string; label: string; code: string; pathname: string }) {
  const active = isActive(pathname, href)
  return (
    <Link to={href} aria-current={active ? 'page' : undefined} className={`flex min-h-[68px] flex-col items-center justify-center gap-1 text-center text-[9px] font-black uppercase ${active ? 'text-[var(--lime)]' : 'text-white/45'}`}>
      <span className="font-mono text-[10px]">{code}</span>
      <span>{shortLabel(label)}</span>
    </Link>
  )
}

export function AppShell({ isAdmin }: { isAdmin: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const items = isAdmin ? adminNav : userNav

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    await createClient().auth.signOut()
    await navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-[100dvh] bg-[var(--background)] lg:h-[100dvh] lg:overflow-hidden">
      <aside className="hidden h-full w-[268px] shrink-0 flex-col bg-[var(--ink)] text-[#f7f4ed] lg:flex">
        <Link to={isAdmin ? '/dashboard' : '/mahasiswa'} className="flex h-24 shrink-0 items-center gap-3 border-b border-white/10 px-7">
          <img src="/logo/Absendulu.webp" alt="Absendulu" width="68" height="40" className="h-9 w-auto" />
          <span className="eyebrow text-white/35">FILKOM UNIDA</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-4 py-8" aria-label="Navigasi dashboard">
          <p className="eyebrow mb-4 px-3 text-white/35">Menu utama</p>
          <div className="space-y-1">
            {items.map(([href, label, code]) => <DesktopNavItem key={href} href={href} label={label} code={code} pathname={location.pathname} />)}
          </div>
        </nav>
        <div className="border-t border-white/10 p-4">
          <button type="button" onClick={signOut} disabled={signingOut} className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm font-bold text-white/55 hover:text-[#ffb5ad]">
            <span>{signingOut ? 'Mengeluarkan…' : 'Keluar'}</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
        <header className="flex min-h-24 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--paper)] px-5 sm:px-8">
          <div>
            <p className="eyebrow text-[var(--accent-strong)] lg:hidden">absendulu/</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-.06em]">{titleFor(location.pathname)}</h1>
          </div>
          <Link to="/profile" className="grid h-10 w-10 place-items-center bg-[var(--ink)] text-sm font-black text-[var(--lime)]" aria-label="Lihat profil akun">A</Link>
        </header>
        <main className="min-h-0 flex-1 px-5 py-7 pb-28 sm:px-8 sm:py-9 lg:overflow-y-auto lg:pb-9">
          <div className="mx-auto w-full max-w-7xl"><Outlet /></div>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[var(--ink)] px-1 pb-[max(env(safe-area-inset-bottom),.5rem)] lg:hidden" aria-label="Navigasi dashboard">
          {items.map(([href, label, code]) => <MobileNavItem key={href} href={href} label={label} code={code} pathname={location.pathname} />)}
        </nav>
      </div>
    </div>
  )
}
