import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { normalizeProfileAccess } from '~/lib/auth/profile-access'
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
    const { data: profile } = user
      ? await supabase.from('profiles').select('role, account_status, is_active, nim').eq('id', user.id).maybeSingle()
      : { data: null }

    if (responseCookies.length > 0) {
      setResponseHeader('Set-Cookie', responseCookies)
    }

    return {
      user: user ? { id: user.id, email: user.email ?? null } : null,
      profile: normalizeProfileAccess(profile) ? { ...normalizeProfileAccess(profile)!, nim: profile?.nim ?? null } : null,
    }
  } catch (error) {
    console.error('readAuth failed:', error)
    throw error
  }
}

export const getCurrentAuth = createServerFn({ method: 'GET' }).handler(readAuth)
