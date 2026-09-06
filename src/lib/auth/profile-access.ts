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
  const account_status = rawStatus === 'invited' || rawStatus === 'disabled' || rawStatus === 'active' ? rawStatus : 'active'
  return {
    role: typeof profile.role === 'string' ? profile.role : null,
    account_status,
    is_active: profile.is_active !== false,
  }
}
