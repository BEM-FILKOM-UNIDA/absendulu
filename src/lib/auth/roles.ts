export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'admin_bem'
}
