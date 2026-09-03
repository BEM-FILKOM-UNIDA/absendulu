import { createFileRoute } from '@tanstack/react-router'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '~/server/supabase'
import { isValidStaffIdentifier, isValidStudentNim } from '~/lib/auth/identity'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'
import { listAllAuthUsers } from '~/lib/members/auth-users'

type UserType = 'mahasiswa' | 'dosen' | 'tata_usaha'
const USER_TYPES = new Set<UserType>(['mahasiswa', 'dosen', 'tata_usaha'])

export const Route = createFileRoute('/api/members/manual')({
  server: {
    handlers: {
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
        let authUsers: User[]
        try { authUsers = await listAllAuthUsers(admin) } catch { return responseWithCookies({ error: 'Gagal membaca akun Auth yang sudah ada.' }, 500, cookies) }
        let user = authUsers.find((candidate) => candidate.email?.toLowerCase() === email)
        const wasExisting = Boolean(user)
        const { data: conflictingProfile, error: conflictError } = await admin.from('profiles').select('id').eq('nim', nim).maybeSingle()
        if (conflictError) return responseWithCookies({ error: 'Gagal memeriksa NIM/NIP.' }, 500, cookies)
        if (conflictingProfile && (!user || conflictingProfile.id !== user.id)) return responseWithCookies({ error: 'NIM/NIP tersebut sudah dipakai akun lain.' }, 409, cookies)

        const createdUser = !user
        if (!user) {
          const result = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: fullName, nim, user_type: userType } })
          if (result.error) return responseWithCookies({ error: result.error.message }, 400, cookies)
          user = result.data.user ?? undefined
        }
        if (!user) return responseWithCookies({ error: 'User ID tidak ditemukan.' }, 500, cookies)
        const { data: existingProfile, error: existingProfileError } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (existingProfileError) {
          if (createdUser) await admin.auth.admin.deleteUser(user.id)
          return responseWithCookies({ error: 'Gagal membaca profile pengguna.' }, 500, cookies)
        }
        const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, full_name: fullName, nim, email, user_type: userType, nim_format_legacy: false, division: division || null, phone: phone || null, role: existingProfile?.role ?? 'user', account_status: 'active', is_active: true })
        if (profileError) {
          if (createdUser) await admin.auth.admin.deleteUser(user.id)
          return responseWithCookies({ error: profileError.message }, 500, cookies)
        }
        return responseWithCookies({ email, status: wasExisting ? 'updated' : 'created' }, 200, cookies)
      },
    },
  },
})
