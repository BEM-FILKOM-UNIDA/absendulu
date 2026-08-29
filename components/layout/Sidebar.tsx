'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type NavItem = {
  href: string
  label: string
  code: string
}

const mainNav: NavItem[] = [
  { href: '/dashboard', label: 'Ringkasan', code: '00' },
  { href: '/events', label: 'Acara FILKOM', code: '01' },
  { href: '/scan', label: 'Scan Absensi', code: '02' },
  { href: '/attendance/history', label: 'Riwayat Absensi', code: '03' },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const navItems = isAdmin
    ? [...mainNav, { href: '/members', label: 'Data Mahasiswa', code: '04' }]
    : mainNav

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)

    const { error } = await supabase.auth.signOut()
    if (error) {
      setIsSigningOut(false)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <aside className="hidden h-[100dvh] w-[268px] shrink-0 flex-col border-r border-white/10 bg-[var(--ink)] text-[#f7f4ed] lg:flex">
      <Link href="/dashboard" className="flex h-24 shrink-0 items-center gap-3 border-b border-white/10 px-7 transition-colors hover:bg-white/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lime)] focus-visible:ring-inset">
        <span className="grid h-10 w-10 shrink-0 place-items-center bg-[var(--accent)] text-sm font-black text-[var(--ink)]">A</span>
        <span className="min-w-0">
          <span className="block font-black tracking-[-.08em]">absendulu<span className="text-[var(--lime)]">/</span></span>
          <span className="eyebrow mt-1 block text-white/35">FILKOM UNIDA</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-4 py-8" aria-label="Navigasi dashboard">
        <p className="eyebrow mb-4 px-3 text-white/35">Menu utama</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActiveRoute(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center justify-between border-l-2 px-3 py-3 text-sm font-bold transition-colors ${active ? 'border-[var(--accent)] bg-white/10 text-[var(--lime)]' : 'border-transparent text-white/55 hover:border-white/30 hover:bg-white/[.05] hover:text-white'}`}
              >
                <span>{item.label}</span>
                <span className={`font-mono text-[10px] ${active ? 'text-[var(--accent)]' : 'text-white/25 group-hover:text-white/45'}`}>{item.code}</span>
              </Link>
            )
          })}
        </div>

        <p className="eyebrow mb-4 mt-12 px-3 text-white/35">Akun</p>
        <Link
          href="/profile"
          aria-current={pathname === '/profile' ? 'page' : undefined}
          className={`group flex items-center justify-between border-l-2 px-3 py-3 text-sm font-bold transition-colors ${pathname === '/profile' ? 'border-[var(--accent)] bg-white/10 text-[var(--lime)]' : 'border-transparent text-white/55 hover:border-white/30 hover:bg-white/[.05] hover:text-white'}`}
        >
          <span>Profil</span>
          <span className={`font-mono text-[10px] ${pathname === '/profile' ? 'text-[var(--accent)]' : 'text-white/25 group-hover:text-white/45'}`}>05</span>
        </Link>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm font-bold text-white/55 transition-colors hover:bg-[#b84c4c]/20 hover:text-[#ffb5ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb5ad] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{isSigningOut ? 'Mengeluarkan…' : 'Keluar'}</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </aside>
  )
}
