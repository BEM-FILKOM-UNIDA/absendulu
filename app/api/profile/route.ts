import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSameOrigin } from '@/lib/http/request-security'
import { isAdminRole } from '@/lib/auth/roles'
import { isValidStaffIdentifier, isValidStudentNim } from '@/lib/auth/identity'

const NAME_PATTERN = /^.{2,100}$/u

type ProfileInput = {
  full_name: string
  nim: string
  division?: string | null
}

function getAuthenticatedClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    },
  )
}

function parseProfileInput(
  value: unknown,
  userType: string,
  isAdmin: boolean,
  existingNim: string,
  existingNimIsLegacy: boolean,
): ProfileInput | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const nim = typeof body.nim === 'string' ? body.nim.trim().toUpperCase() : ''
  const division = typeof body.division === 'string' ? body.division.trim() : ''

  if (!NAME_PATTERN.test(fullName) || nim.length > 64) return null
  const validIdentifier = userType === 'mahasiswa' ? isValidStudentNim(nim) : isValidStaffIdentifier(nim)
  const unchangedLegacyIdentifier = existingNimIsLegacy && nim === existingNim.trim().toUpperCase()
  if (!validIdentifier && !unchangedLegacyIdentifier) return null
  if (isAdmin && division.length > 100) return null

  return {
    full_name: fullName,
    nim,
    ...(isAdmin ? { division: division || null } : {}),
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 })
  }

  const supabase = getAuthenticatedClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sesi login tidak valid.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, user_type, nim, nim_format_legacy, account_status, is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Profil gagal dibaca.' }, { status: 500 })
  if (!profile || profile.account_status === 'disabled' || !profile.is_active) {
    return NextResponse.json({ error: 'Akun tidak aktif.' }, { status: 403 })
  }

  const isAdmin = isAdminRole(profile.role)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 })
  }

  const input = parseProfileInput(
    body,
    profile.user_type,
    isAdmin,
    profile.nim,
    profile.nim_format_legacy === true,
  )
  if (!input) {
    const message = profile.user_type === 'mahasiswa'
      ? 'Nama atau NIM tidak valid. Gunakan format NIM I.#######, contoh I.2410036.'
      : 'Nama atau nomor identitas tidak valid.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const profileUpdate = profile.nim_format_legacy === true && input.nim !== profile.nim
    ? { ...input, nim_format_legacy: false }
    : input

  const { data, error } = await admin
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id)
    .select('full_name, nim, division')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'NIM tersebut sudah digunakan akun lain.' }, { status: 409 })
    return NextResponse.json({ error: 'Profil gagal disimpan. Coba lagi.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Profil tidak ditemukan.' }, { status: 404 })
  return NextResponse.json(data)
}
