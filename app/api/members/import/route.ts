import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/request'
import { isAdminRole } from '@/lib/auth/roles'

type ImportRow = {
  full_name: string
  nim: string
  email: string
  user_type: 'mahasiswa' | 'dosen' | 'tata_usaha'
  division: string | null
  phone: string | null
}

const USER_TYPES = new Set<ImportRow['user_type']>(['mahasiswa', 'dosen', 'tata_usaha'])

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
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)

  const headers = rows.shift()?.map((header) => header.toLowerCase().replace(/^\uFEFF/, '')) ?? []
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function normalizeRow(row: Record<string, string>, index: number): ImportRow {
  const full_name = row.full_name || row.nama || ''
  const nim = row.nim || row.identifier || row.nip || ''
  const email = (row.email || '').toLowerCase()
  const user_type = (row.user_type || row.tipe || row.jenis || '').toLowerCase() as ImportRow['user_type']

  if (!full_name || !nim || !email || !USER_TYPES.has(user_type)) {
    throw new Error(`Baris ${index}: wajib memiliki full_name, nim, email, dan user_type yang valid.`)
  }
  if (!email.includes('@')) throw new Error(`Baris ${index}: format email tidak valid.`)

  return {
    full_name,
    nim,
    email,
    user_type,
    division: row.division || row.divisi || null,
    phone: row.phone || row.telepon || null,
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRole(await getUserRole(request))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File CSV wajib diunggah.' }, { status: 400 })
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
  const imported: string[] = []
  const existing: string[] = []
  const failed: { email: string; error: string }[] = []

  for (const row of rows) {
    const { data, error } = await admin.auth.admin.createUser({
      email: row.email,
      email_confirm: true,
      user_metadata: { full_name: row.full_name, nim: row.nim, user_type: row.user_type },
    })

    if (error && !/already|exists|registered/i.test(error.message)) {
      failed.push({ email: row.email, error: error.message })
      continue
    }

    let userId = data.user?.id
    if (!userId && error) {
      const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      userId = users.data.users.find((user) => user.email?.toLowerCase() === row.email)?.id
    }
    if (!userId) {
      failed.push({ email: row.email, error: error?.message ?? 'User ID tidak ditemukan.' })
      continue
    }

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('role, account_status, is_active')
      .eq('id', userId)
      .maybeSingle()

    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      full_name: row.full_name,
      nim: row.nim,
      email: row.email,
      user_type: row.user_type,
      division: row.division,
      phone: row.phone,
      role: existingProfile?.role ?? 'user',
      account_status: existingProfile?.account_status === 'disabled' ? 'disabled' : 'active',
      is_active: existingProfile?.is_active ?? true,
    })

    if (profileError) failed.push({ email: row.email, error: profileError.message })
    else if (error) existing.push(row.email)
    else imported.push(row.email)
  }

  return NextResponse.json({ imported, existing, failed })
}
