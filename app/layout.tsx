import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Absendulu — Absensi Acara FILKOM UNIDA',
  description: 'Absensi digital untuk acara organisasi mahasiswa Fakultas Ilmu Komputer Universitas Djuanda.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id" className="h-full"><body className="min-h-full antialiased">{children}</body></html>
}
