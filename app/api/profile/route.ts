import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSameOrigin } from '@/lib/http/request-security'
import { getUserRole } from '@/lib/supabase/request'
import { isAdminRole } from '@/lib/auth/roles'

const NAME_PATTERN = /^.{2,100}$/u
const NIM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$/

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

function parseProfileInput(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const nim = typeof body.nim === 'string' ? body.nim.trim().toUpperCase() : ''
  const division = typeof body.division === 'string' ? body.division.trim() : ''

  if (!NAME_PATTERN.test(fullName)) return null
  if (!NIM_PATTERN.test(nim)) return null
  if (division.length > 100) return null

  return {
    full_name: fullName,
    nim,
    division: division || null,
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 })
  }

  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const supabase = getAuthenticatedClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sesi login tidak valid.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 })
  }

  const input = parseProfileInput(body)
  if (!input) {
    return NextResponse.json({ error: 'Nama atau NIM tidak valid. Gunakan nama 2–100 karakter dan NIM 3–64 karakter.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update(input)
    .eq('id', user.id)
    .select('full_name, nim, division')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'NIM tersebut sudah digunakan akun lain.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Profil gagal disimpan. Coba lagi.' }, { status: 500 })
  }

  if (!data) return NextResponse.json({ error: 'Profil tidak ditemukan.' }, { status: 404 })
  return NextResponse.json(data)
}
