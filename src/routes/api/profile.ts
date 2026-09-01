import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { isAdminRole } from '~/lib/auth/roles'
import { GENERATED_IDENTIFIER_PATTERN, isValidStaffIdentifier, isValidStudentNim } from '~/lib/auth/identity'
import { isSameOrigin } from '~/lib/http/request-security'
import { createRequestSupabase, responseWithCookies } from '~/server/request-auth'

const NAME_PATTERN = /^.{2,100}$/u

export const Route = createFileRoute('/api/profile')({ server: { handlers: { PATCH: async ({ request }) => {
  const cookies: string[] = []
  if (!isSameOrigin(request)) return responseWithCookies({ error: 'Origin request tidak valid.' }, 403, cookies)
  const supabase = createRequestSupabase(request, cookies)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return responseWithCookies({ error: 'Sesi login tidak valid.' }, 401, cookies)
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('id, role, user_type, nim, nim_format_legacy, account_status, is_active').eq('id', user.id).maybeSingle()
  if (profileError) return responseWithCookies({ error: 'Profil gagal dibaca.' }, 500, cookies)
  if (!profile || GENERATED_IDENTIFIER_PATTERN.test(profile.nim ?? '')) return responseWithCookies({ error: 'Akun belum didaftarkan panitia.' }, 403, cookies)
  if (profile.account_status === 'disabled' || !profile.is_active) return responseWithCookies({ error: 'Akun tidak aktif.' }, 403, cookies)
  let body: unknown
  try { body = await request.json() } catch { return responseWithCookies({ error: 'Body request tidak valid.' }, 400, cookies) }
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const fullName = typeof input.full_name === 'string' ? input.full_name.trim() : ''
  const nim = typeof input.nim === 'string' ? input.nim.trim().toUpperCase() : ''
  const division = typeof input.division === 'string' ? input.division.trim() : ''
  const validIdentifier = profile.user_type === 'mahasiswa' ? isValidStudentNim(nim) : isValidStaffIdentifier(nim)
  const legacy = profile.nim_format_legacy === true && nim === profile.nim.trim().toUpperCase()
  if (!NAME_PATTERN.test(fullName) || nim.length > 64 || (!validIdentifier && !legacy) || (isAdminRole(profile.role) && division.length > 100)) return responseWithCookies({ error: profile.user_type === 'mahasiswa' ? 'Nama atau NIM tidak valid. Gunakan format NIM I.#######.' : 'Nama atau nomor identitas tidak valid.' }, 400, cookies)
  const update = { full_name: fullName, nim, ...(isAdminRole(profile.role) ? { division: division || null } : {}), ...(profile.nim_format_legacy === true && nim !== profile.nim ? { nim_format_legacy: false } : {}) }
  const { data, error } = await admin.from('profiles').update(update).eq('id', user.id).select('full_name, nim, division').maybeSingle()
  if (error) return responseWithCookies({ error: error.code === '23505' ? 'NIM tersebut sudah digunakan akun lain.' : 'Profil gagal disimpan. Coba lagi.' }, error.code === '23505' ? 409 : 500, cookies)
  if (!data) return responseWithCookies({ error: 'Profil tidak ditemukan.' }, 404, cookies)
  return responseWithCookies(data, 200, cookies)
} } } })
