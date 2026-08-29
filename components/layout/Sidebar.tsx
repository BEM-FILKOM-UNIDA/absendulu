'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/events', label: 'Acara', icon: '📅' },
  { href: '/scan', label: 'Scan QR', icon: '📷' },
  { href: '/members', label: 'Anggota', icon: '👥' },
  { href: '/attendance/history', label: 'Riwayat', icon: '📋' },
  { href: '/profile', label: 'Profil', icon: '👤' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="text-xl font-bold mb-8 px-3">📋 Absensi</div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
