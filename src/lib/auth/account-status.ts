export const ADMIN_MUTABLE_ACCOUNT_STATUSES = ['active', 'disabled'] as const
export type AdminMutableAccountStatus = (typeof ADMIN_MUTABLE_ACCOUNT_STATUSES)[number]

export function isAdminMutableAccountStatus(value: unknown): value is AdminMutableAccountStatus {
  return typeof value === 'string' && ADMIN_MUTABLE_ACCOUNT_STATUSES.includes(value as AdminMutableAccountStatus)
}
