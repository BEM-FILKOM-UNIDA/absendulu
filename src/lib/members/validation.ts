import { isValidStaffIdentifier, isValidStudentNim } from '~/lib/auth/identity'

// ponytail: satu aturan untuk form manual dan import CSV — sebelumnya import hanya
// cek `includes('@')` dan tanpa batas panjang, jadi menerima `a@` yang ditolak manual.
export const MEMBER_LIMITS = { name: 160, identifier: 80, email: 254 }

export function isValidMemberEmail(email: string): boolean {
  return email.includes('@') && !email.startsWith('@') && !email.endsWith('@')
}

export function isValidMemberIdentifier(userType: string, identifier: string): boolean {
  return userType === 'mahasiswa' ? isValidStudentNim(identifier) : isValidStaffIdentifier(identifier)
}

export function exceedsMemberLimits(name: string, identifier: string, email: string): boolean {
  return name.length > MEMBER_LIMITS.name
    || identifier.length > MEMBER_LIMITS.identifier
    || email.length > MEMBER_LIMITS.email
}