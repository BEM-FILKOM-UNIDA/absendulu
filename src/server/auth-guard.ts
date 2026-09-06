import { getCurrentAuth } from './auth'
import { isAdminRole } from '~/lib/auth/roles'

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
