import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser, getUserRole } from '@/lib/supabase/request'
import { isSameOrigin } from '@/lib/http/request-security'
import { isAdminRole } from '@/lib/auth/roles'
import { isProfileComplete } from '@/lib/auth/identity'
import { isAdminMutableAccountStatus } from '@/lib/auth/account-status'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 })
  }

  const { user } = await getUser(request)
  if (!user || !isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 })
  }

  const status = body && typeof body === 'object' && 'account_status' in body
    ? (body as { account_status?: unknown }).account_status
    : null
  if (!isAdminMutableAccountStatus(status)) {
    return NextResponse.json({ error: 'Status akun tidak valid.' }, { status: 400 })
  }

  const { id } = await params
  if (id === user.id && status !== 'active') {
    return NextResponse.json({ error: 'Akun admin yang sedang digunakan tidak dapat dinonaktifkan.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, user_type, full_name, nim')
    .eq('id', id)
    .maybeSingle()

  if (targetError) return NextResponse.json({ error: 'Gagal membaca akun.' }, { status: 500 })
  if (!target) return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 })
  if (status === 'active' && !isProfileComplete(target)) {
    return NextResponse.json({ error: 'Profil belum lengkap. Minta pengguna melengkapi nama dan NIM/NIP terlebih dahulu.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('profiles')
    .update({
      account_status: status,
      is_active: status !== 'disabled',
    })
    .eq('id', id)
    .select('id, account_status, is_active')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Status akun gagal diperbarui.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 })

  return NextResponse.json(data)
}
