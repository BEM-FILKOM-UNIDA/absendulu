import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { normalizeProfileAccess } from '@/lib/auth/profile-access'

export async function getUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}

export async function getUserRole(request: NextRequest): Promise<string | null> {
  const { supabase, user } = await getUser(request)
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const access = normalizeProfileAccess(profile)
  if (!access || access.account_status === 'disabled' || !access.is_active) return null
  return access.role ?? null
}
