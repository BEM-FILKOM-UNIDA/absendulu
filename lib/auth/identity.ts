export const STUDENT_NIM_PATTERN = /^I\.[0-9]{7}$/
export const GENERATED_IDENTIFIER_PATTERN = /^AUTH-/i
export const STAFF_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$/

export function isValidStudentNim(value: string | null | undefined): boolean {
  return typeof value === 'string' && STUDENT_NIM_PATTERN.test(value.trim().toUpperCase())
}

export function isValidStaffIdentifier(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim()
  return normalized.length >= 3
    && normalized.length <= 64
    && STAFF_IDENTIFIER_PATTERN.test(normalized)
    && !GENERATED_IDENTIFIER_PATTERN.test(normalized)
}

export function isProfileComplete(profile: { user_type?: string | null; full_name?: string | null; nim?: string | null } | null | undefined): boolean {
  if (!profile || !profile.full_name?.trim() || !profile.nim?.trim()) return false
  return profile.user_type === 'mahasiswa' ? isValidStudentNim(profile.nim) : isValidStaffIdentifier(profile.nim)
}
