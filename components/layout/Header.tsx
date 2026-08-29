'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <h2 className="text-lg font-semibold text-gray-800">Sistem Absensi</h2>
      <button
        onClick={handleLogout}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Logout
      </button>
    </header>
  )
}
