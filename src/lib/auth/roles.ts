export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'admin_bem'
}

type AdminProfile = {
  role?: unknown
  account_status?: unknown
  is_active?: unknown
}

export function isActiveAdminProfile(profile: AdminProfile | null | undefined): boolean {
  return isAdminRole(typeof profile?.role === 'string' ? profile.role : undefined)
    && profile?.account_status === 'active'
    && profile.is_active === true
}
