import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { normalizeProfileAccess } from '~/lib/auth/profile-access'
import { isAdminRole } from '~/lib/auth/roles'
import { cached } from '~/lib/cache'
import { createServerSupabase } from './supabase-context'

export type AuthProfile = {
  role: string | null
  account_status: 'invited' | 'active' | 'disabled'
  is_active: boolean
  nim: string | null
}

export type AuthSnapshot = {
  user: { id: string; email: string | null } | null
  profile: AuthProfile | null
}

async function readAuth(): Promise<AuthSnapshot> {
  try {
    const { supabase, responseCookies } = createServerSupabase(getRequest())
    const { data: { user } } = await supabase.auth.getUser()

    if (responseCookies.length > 0) {
      setResponseHeader('Set-Cookie', responseCookies)
    }

    if (!user) return { user: null, profile: null }

    // Short TTL: navbar tab switches hit beforeLoad + page loaders repeatedly.
    const profile = await cached(`auth-profile:${user.id}`, 10_000, async () => {
      const { data } = await supabase.from('profiles').select('role, account_status, is_active, nim').eq('id', user.id).maybeSingle()
      return data
    })

    return {
      user: { id: user.id, email: user.email ?? null },
      profile: normalizeProfileAccess(profile) ? { ...normalizeProfileAccess(profile)!, nim: profile?.nim ?? null } : null,
    }
  } catch (error) {
    console.error('readAuth failed:', error)
    throw error
  }
}

export const getCurrentAuth = createServerFn({ method: 'GET' }).handler(readAuth)

// ponytail: deep Auth module — guards live with readAuth for locality, single import for routes
export async function requireActiveAuth() {
  const auth = await getCurrentAuth()
  if (!auth.user || !auth.profile || auth.profile.account_status !== 'active' || !auth.profile.is_active) {
    throw new Error('Unauthorized')
  }
  return { ...auth, user: auth.user, profile: auth.profile }
}

export async function requireAdminAuth() {
  const auth = await requireActiveAuth()
  if (!isAdminRole(auth.profile.role)) throw new Error('Forbidden')
  return auth
}
