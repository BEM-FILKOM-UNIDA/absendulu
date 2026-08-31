import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/supabase/request'
import { isSameOrigin } from '@/lib/http/request-security'
import { isAdminRole } from '@/lib/auth/roles'
import { isValidStaffIdentifier, isValidStudentNim } from '@/lib/auth/identity'

type ImportRow = {
  full_name: string
  nim: string
  email: string
  user_type: 'mahasiswa' | 'dosen' | 'tata_usaha'
  division: string | null
  phone: string | null
}

const USER_TYPES = new Set<ImportRow['user_type']>(['mahasiswa', 'dosen', 'tata_usaha'])
const MAX_CSV_BYTES = 2 * 1024 * 1024
const MAX_MULTIPART_BYTES = 3 * 1024 * 1024

function parseCsv(csv: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]
    const next = csv[index + 1]
    if (character === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (quoted) throw new Error('CSV memiliki tanda kutip yang tidak tertutup.')
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)

  const headers = rows.shift()?.map((header) => header.toLowerCase().replace(/^\uFEFF/, '')) ?? []
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function normalizeRow(row: Record<string, string>, index: number): ImportRow {
  const full_name = (row.full_name || row.nama || '').trim()
  const nim = (row.nim || row.identifier || row.nip || '').trim().toUpperCase()
  const email = (row.email || '').trim().toLowerCase()
  const user_type = (row.user_type || row.tipe || row.jenis || '').toLowerCase() as ImportRow['user_type']

  if (!full_name || !nim || !email || !USER_TYPES.has(user_type)) {
    throw new Error(`Baris ${index}: wajib memiliki full_name, nim, email, dan user_type yang valid.`)
  }
  if (!email.includes('@')) throw new Error(`Baris ${index}: format email tidak valid.`)
  if ((user_type === 'mahasiswa' && !isValidStudentNim(nim)) || (user_type !== 'mahasiswa' && !isValidStaffIdentifier(nim))) {
    throw new Error(`Baris ${index}: identifier ${user_type === 'mahasiswa' ? 'NIM mahasiswa harus berformat I.#######, contoh I.2410036.' : 'NIP/NIK tidak valid.'}`)
  }

  return {
    full_name,
    nim,
    email,
    user_type,
    division: row.division || row.divisi || null,
    phone: row.phone || row.telepon || null,
  }
}

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

  const contentLength = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json({ error: 'Ukuran CSV maksimal 2 MB.' }, { status: 413 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File CSV wajib diunggah.' }, { status: 400 })
  }

  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: 'Ukuran CSV maksimal 2 MB.' }, { status: 413 })
  }

  let rows: ImportRow[]
  try {
    rows = parseCsv(await file.text()).map(normalizeRow)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CSV tidak valid.' }, { status: 400 })
  }
  if (rows.length === 0) return NextResponse.json({ error: 'CSV tidak memiliki data pengguna.' }, { status: 400 })
  if (rows.length > 500) return NextResponse.json({ error: 'Maksimal 500 pengguna per import.' }, { status: 400 })

  const emails = new Set<string>()
  const identifiers = new Set<string>()
  for (const row of rows) {
    if (emails.has(row.email)) return NextResponse.json({ error: `Email duplikat: ${row.email}` }, { status: 400 })
    if (identifiers.has(row.nim)) return NextResponse.json({ error: `NIM/NIP duplikat: ${row.nim}` }, { status: 400 })
    emails.add(row.email)
    identifiers.add(row.nim)
  }

  const admin = createAdminClient()
  let authUsers: User[]
  try {
    authUsers = await listAllAuthUsers(admin)
  } catch {
    return NextResponse.json({ error: 'Gagal membaca akun Auth yang sudah ada.' }, { status: 500 })
  }

  const [profilesResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, role, account_status, is_active')
      .not('email', 'is', null),
  ])

  if (profilesResult.error) {
    return NextResponse.json({ error: 'Gagal membaca profile yang sudah ada.' }, { status: 500 })
  }

  const authUsersByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [user.email!.toLowerCase(), user]),
  )
  const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
  const imported: string[] = []
  const existing: string[] = []
  const failed: { email: string; error: string }[] = []

  async function importRow(row: ImportRow) {
    let user = authUsersByEmail.get(row.email)
    let wasExisting = Boolean(user)

    if (!user) {
      const result = await admin.auth.admin.createUser({
        email: row.email,
        email_confirm: true,
        user_metadata: { full_name: row.full_name, nim: row.nim, user_type: row.user_type },
      })
      if (result.error && !/already|exists|registered/i.test(result.error.message)) {
        failed.push({ email: row.email, error: result.error.message })
        return
      }
      user = result.data.user ?? authUsersByEmail.get(row.email)
      wasExisting = Boolean(result.error)
    }

    if (!user) {
      failed.push({ email: row.email, error: 'User ID tidak ditemukan.' })
      return
    }

    authUsersByEmail.set(row.email, user)
    const existingProfile = profilesById.get(user.id)
    const { error: profileError } = await admin.from('profiles').upsert({
      id: user.id,
      full_name: row.full_name,
      nim: row.nim,
      email: row.email,
      user_type: row.user_type,
      nim_format_legacy: false,
      division: row.division,
      phone: row.phone,
      role: existingProfile?.role ?? 'user',
      account_status: existingProfile?.account_status === 'disabled' ? 'disabled' : 'active',
      is_active: existingProfile?.is_active ?? true,
    })

    if (profileError) {
      failed.push({ email: row.email, error: profileError.message })
    } else if (wasExisting) {
      existing.push(row.email)
    } else {
      imported.push(row.email)
    }
  }

  let nextIndex = 0
  async function worker() {
    while (nextIndex < rows.length) {
      const row = rows[nextIndex]
      nextIndex += 1
      await importRow(row)
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, rows.length) }, () => worker()))

  return NextResponse.json({ imported, existing, failed })
}
