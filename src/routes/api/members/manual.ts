import { createFileRoute } from '@tanstack/react-router'
import { invalidate } from '~/lib/cache'
import { createAdminClient } from '~/server/supabase-context'
import { isValidStaffIdentifier, isValidStudentNim } from '~/lib/auth/identity'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'

type UserType = 'mahasiswa' | 'dosen' | 'tata_usaha'
const USER_TYPES = new Set<UserType>(['mahasiswa', 'dosen', 'tata_usaha'])

export const Route = createFileRoute('/api/members/manual')({
  server: {
    handlers: {
      // RATE LIMITING: Admin-only via withAdminApi. Single-user creation is low-volume
      // by design. If a compromised admin account is suspected, revoke it in the
      // Supabase dashboard; no application-layer throttle is required for normal ops.
      POST: async ({ request }) => {
        const guard = await withAdminApi(request, {
          forbiddenMessage: 'Akses ditolak.',
          invalidBodyMessage: 'Data pendaftaran tidak valid.',
        })
        if (guard instanceof Response) return guard
        const { body: parsedBody, cookies } = guard
        if (!parsedBody || typeof parsedBody !== 'object') return responseWithCookies({ error: 'Data pendaftaran tidak valid.' }, 400, cookies)
        const body = parsedBody as Record<string, unknown>
        const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
        const nim = typeof body.nim === 'string' ? body.nim.trim().toUpperCase() : ''
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
        const userType = typeof body.user_type === 'string' ? body.user_type : ''
        const division = typeof body.division === 'string' ? body.division.trim() : ''
        const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
        if (!fullName || !nim || !email || !USER_TYPES.has(userType as UserType)) return responseWithCookies({ error: 'Nama, NIM/NIP, email, dan tipe pengguna wajib diisi.' }, 400, cookies)
        if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) return responseWithCookies({ error: 'Format email tidak valid.' }, 400, cookies)
        if (fullName.length > 160 || nim.length > 80 || email.length > 254) return responseWithCookies({ error: 'Data terlalu panjang.' }, 400, cookies)
        if ((userType === 'mahasiswa' && !isValidStudentNim(nim)) || (userType !== 'mahasiswa' && !isValidStaffIdentifier(nim))) return responseWithCookies({ error: userType === 'mahasiswa' ? 'NIM mahasiswa harus berformat I.#######, contoh I.2410036.' : 'NIP/NIK tidak valid.' }, 400, cookies)

        const admin = createAdminClient()

        // Use profiles table as the source of truth for existing users — avoids
        // enumerating all Auth users. The profiles.email column is indexed and
        // covers both Auth-registered users and pre-provisioned accounts.
        const [{ data: profileByEmail, error: emailLookupError }, { data: conflictingProfile, error: conflictError }] = await Promise.all([
          admin.from('profiles').select('id, role').eq('email', email).maybeSingle(),
          admin.from('profiles').select('id').eq('nim', nim).maybeSingle(),
        ])
        if (emailLookupError) return responseWithCookies({ error: 'Gagal memeriksa email.' }, 500, cookies)
        if (conflictError) return responseWithCookies({ error: 'Gagal memeriksa NIM/NIP.' }, 500, cookies)

        const existingUserId: string | undefined = profileByEmail?.id
        const wasExisting = Boolean(existingUserId)

        if (conflictingProfile && (!existingUserId || conflictingProfile.id !== existingUserId)) return responseWithCookies({ error: 'NIM/NIP tersebut sudah dipakai akun lain.' }, 409, cookies)

        const createdUser = !existingUserId
        let userId = existingUserId
        if (!userId) {
          // New user: create Auth account then let handle_new_user trigger create the profile stub.
          const result = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: fullName, nim, user_type: userType } })
          if (result.error) return responseWithCookies({ error: result.error.message }, 400, cookies)
          userId = result.data.user?.id
        }
        if (!userId) return responseWithCookies({ error: 'User ID tidak ditemukan.' }, 500, cookies)

        const existingRole = profileByEmail?.role
        const { error: profileError } = await admin.from('profiles').upsert({ id: userId, full_name: fullName, nim, email, user_type: userType, nim_format_legacy: false, division: division || null, phone: phone || null, role: existingRole ?? 'user', account_status: 'active', is_active: true })
        if (profileError) {
          if (createdUser) await admin.auth.admin.deleteUser(userId)
          return responseWithCookies({ error: profileError.message }, 500, cookies)
        }
        invalidate('members')
        invalidate('dashboard')
        return responseWithCookies({ email, status: wasExisting ? 'updated' : 'created' }, 200, cookies)
      },
    },
  },
})
