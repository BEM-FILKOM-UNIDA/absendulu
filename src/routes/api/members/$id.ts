import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { isAdminRole } from '~/lib/auth/roles'
import { isProfileComplete } from '~/lib/auth/identity'
import { isAdminMutableAccountStatus } from '~/lib/auth/account-status'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'

export const Route = createFileRoute('/api/members/$id')({ server: { handlers: { PATCH: async ({ request, params }) => {
  const guard = await withAdminApi(request, { forbiddenMessage: 'Akses ditolak.' })
  if (guard instanceof Response) return guard
  const { user, body, cookies } = guard
  const admin = createAdminClient()
  const status = body && typeof body === 'object' && 'account_status' in body ? (body as { account_status?: unknown }).account_status : null
  if (!isAdminMutableAccountStatus(status)) return responseWithCookies({ error: 'Status akun tidak valid.' }, 400, cookies)
  if (params.id === user.id && status !== 'active') return responseWithCookies({ error: 'Akun admin yang sedang digunakan tidak dapat dinonaktifkan.' }, 400, cookies)
  // Prevent admins from disabling other admin accounts
  const { data: targetRole } = await admin.from('profiles').select('role').eq('id', params.id).maybeSingle()
  if (targetRole && isAdminRole(targetRole.role) && status === 'disabled') return responseWithCookies({ error: 'Akun admin lain tidak dapat dinonaktifkan dari panel ini.' }, 400, cookies)
  const { data: target, error: targetError } = await admin.from('profiles').select('id, user_type, full_name, nim').eq('id', params.id).maybeSingle()
  if (targetError) return responseWithCookies({ error: 'Gagal membaca akun.' }, 500, cookies)
  if (!target) return responseWithCookies({ error: 'Akun tidak ditemukan.' }, 404, cookies)
  if (status === 'active' && !isProfileComplete(target)) return responseWithCookies({ error: 'Profil belum lengkap. Minta pengguna melengkapi nama dan NIM/NIP terlebih dahulu.' }, 400, cookies)
  const { data, error } = await admin.from('profiles').update({ account_status: status, is_active: status !== 'disabled' }).eq('id', params.id).select('id, account_status, is_active').maybeSingle()
  if (error) return responseWithCookies({ error: 'Status akun gagal diperbarui.' }, 500, cookies)
  if (!data) return responseWithCookies({ error: 'Akun tidak ditemukan.' }, 404, cookies)
  return responseWithCookies(data, 200, cookies)
} } } })
