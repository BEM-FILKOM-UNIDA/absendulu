import { NextRequest, NextResponse } from 'next/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/request'
import { isSameOrigin } from '@/lib/http/request-security'
import { isAdminRole } from '@/lib/auth/roles'
import { isValidStaffIdentifier, isValidStudentNim } from '@/lib/auth/identity'

type UserType = 'mahasiswa' | 'dosen' | 'tata_usaha'

const USER_TYPES = new Set<UserType>(['mahasiswa', 'dosen', 'tata_usaha'])

async function listAllAuthUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = []
  const perPage = 1000
  let page = 1

  while (true) {
    const result = await admin.auth.admin.listUsers({ page, perPage })
    if (result.error) throw result.error
    users.push(...result.data.users)
    if (result.data.users.length < perPage) return users
    page += 1
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 })
  }
  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Data pendaftaran tidak valid.' }, { status: 400 })
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const nim = typeof body.nim === 'string' ? body.nim.trim().toUpperCase() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const userType = typeof body.user_type === 'string' ? body.user_type : ''
  const division = typeof body.division === 'string' ? body.division.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

  if (!fullName || !nim || !email || !USER_TYPES.has(userType as UserType)) {
    return NextResponse.json({
      error: 'Nama, NIM/NIP, email, dan tipe pengguna wajib diisi.',
    }, { status: 400 })
  }
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 })
  }
  if (fullName.length > 160 || nim.length > 80 || email.length > 254) {
    return NextResponse.json({ error: 'Data terlalu panjang.' }, { status: 400 })
  }
  if ((userType === 'mahasiswa' && !isValidStudentNim(nim)) || (userType !== 'mahasiswa' && !isValidStaffIdentifier(nim))) {
    return NextResponse.json({ error: userType === 'mahasiswa' ? 'NIM mahasiswa harus berformat I.#######, contoh I.2410036.' : 'NIP/NIK tidak valid.' }, { status: 400 })
  }

  const admin = createAdminClient()
  let authUsers: User[]
  try {
    authUsers = await listAllAuthUsers(admin)
  } catch {
    return NextResponse.json({ error: 'Gagal membaca akun Auth yang sudah ada.' }, { status: 500 })
  }

  let user = authUsers.find((candidate) => candidate.email?.toLowerCase() === email)
  const wasExisting = Boolean(user)

  const { data: conflictingProfile, error: conflictError } = await admin
    .from('profiles')
    .select('id')
    .eq('nim', nim)
    .maybeSingle()

  if (conflictError) {
    return NextResponse.json({ error: 'Gagal memeriksa NIM/NIP.' }, { status: 500 })
  }
  if (conflictingProfile && (!user || conflictingProfile.id !== user.id)) {
    return NextResponse.json({ error: 'NIM/NIP tersebut sudah dipakai akun lain.' }, { status: 409 })
  }

  const createdUser = !user
  if (!user) {
    const result = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, nim, user_type: userType },
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }
    user = result.data.user ?? undefined
  }

  if (!user) {
    return NextResponse.json({ error: 'User ID tidak ditemukan.' }, { status: 500 })
  }

  const { data: existingProfile, error: existingProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfileError) {
    if (createdUser) await admin.auth.admin.deleteUser(user.id)
    return NextResponse.json({ error: 'Gagal membaca profile pengguna.' }, { status: 500 })
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    full_name: fullName,
    nim,
    email,
    user_type: userType,
    nim_format_legacy: false,
    division: division || null,
    phone: phone || null,
    role: existingProfile?.role ?? 'user',
    account_status: 'active',
    is_active: true,
  })

  if (profileError) {
    if (createdUser) await admin.auth.admin.deleteUser(user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({
    email,
    status: wasExisting ? 'updated' : 'created',
  })
}
