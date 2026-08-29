export const ADMIN_ROLES = ['admin_bem', 'admin'] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && ADMIN_ROLES.includes(role as AdminRole)
}
