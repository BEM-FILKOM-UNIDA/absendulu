type ProfileRecord = Record<string, unknown> | null | undefined

export type AccountStatus = 'invited' | 'active' | 'disabled'

export type ProfileAccess = {
  role: string | null
  account_status: AccountStatus
  is_active: boolean
}

export function normalizeProfileAccess(profile: ProfileRecord): ProfileAccess | null {
  if (!profile) return null
  const rawStatus = profile.account_status
  // Unknown status values must not silently grant access — return null so callers
  // treat the profile as absent and redirect to login or deny the request.
  if (rawStatus !== 'invited' && rawStatus !== 'disabled' && rawStatus !== 'active') return null
  return {
    role: typeof profile.role === 'string' ? profile.role : null,
    account_status: rawStatus,
    is_active: profile.is_active !== false,
  }
}
