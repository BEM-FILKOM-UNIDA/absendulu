'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function ProfileActions() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    if (loading) return
    setLoading(true)

    const { error } = await supabase.auth.signOut()
    if (error) {
      setLoading(false)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <Button className="lg:hidden" type="button" variant="danger" onClick={handleSignOut} disabled={loading}>
      {loading ? 'Mengeluarkan…' : 'Keluar'}
      <span aria-hidden="true">↗</span>
    </Button>
  )
}
