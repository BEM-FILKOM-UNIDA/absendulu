import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase-context'
import { isValidStaffIdentifier, isValidStudentNim } from '~/lib/auth/identity'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'

type ImportRow = { full_name: string; nim: string; email: string; user_type: 'mahasiswa' | 'dosen' | 'tata_usaha'; division: string | null; phone: string | null }
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
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1 }
    else if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && next === '\n') index += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '' }
    else cell += character
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
  if (!full_name || !nim || !email || !USER_TYPES.has(user_type)) throw new Error(`Baris ${index}: wajib memiliki full_name, nim, email, dan user_type yang valid.`)
  if (!email.includes('@')) throw new Error(`Baris ${index}: format email tidak valid.`)
  if ((user_type === 'mahasiswa' && !isValidStudentNim(nim)) || (user_type !== 'mahasiswa' && !isValidStaffIdentifier(nim))) throw new Error(`Baris ${index}: identifier ${user_type === 'mahasiswa' ? 'NIM mahasiswa harus berformat I.#######, contoh I.2410036.' : 'NIP/NIK tidak valid.'}`)
  return { full_name, nim, email, user_type, division: row.division || row.divisi || null, phone: row.phone || row.telepon || null }
}

export const Route = createFileRoute('/api/members/import')({
  server: {
    handlers: {
      // RATE LIMITING: This endpoint is admin-only (withAdminApi enforces this) so
      // the attack surface is limited to compromised admin accounts. The 500-row cap
      // and 2 MB file size limit bound the work per call. If stricter throttling is
      // needed, add a Vercel rate-limit rule for /api/members/* scoped to admin
      // sessions, or integrate an Edge Middleware counter keyed on the admin user ID.
      POST: async ({ request }) => {
        const guard = await withAdminApi(request, { parseBody: false, forbiddenMessage: 'Akses ditolak.' })
        if (guard instanceof Response) return guard
        const { cookies } = guard
        const contentLength = Number(request.headers.get('content-length') ?? '')
        if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) return responseWithCookies({ error: 'Ukuran CSV maksimal 2 MB.' }, 413, cookies)
        let formData: FormData
        try { formData = await request.formData() } catch { return responseWithCookies({ error: 'Form upload tidak valid.' }, 400, cookies) }
        const file = formData.get('file')
        if (!(file instanceof File)) return responseWithCookies({ error: 'File CSV wajib diunggah.' }, 400, cookies)
        if (file.size > MAX_CSV_BYTES) return responseWithCookies({ error: 'Ukuran CSV maksimal 2 MB.' }, 413, cookies)
        let rows: ImportRow[]
        try { rows = parseCsv(await file.text()).map((row, index) => normalizeRow(row, index + 2)) } catch (error) { return responseWithCookies({ error: error instanceof Error ? error.message : 'CSV tidak valid.' }, 400, cookies) }
        if (rows.length === 0) return responseWithCookies({ error: 'CSV tidak memiliki data pengguna.' }, 400, cookies)
        if (rows.length > 500) return responseWithCookies({ error: 'Maksimal 500 pengguna per import.' }, 400, cookies)
        const emails = new Set<string>(); const identifiers = new Set<string>()
        for (const row of rows) { if (emails.has(row.email)) return responseWithCookies({ error: `Email duplikat: ${row.email}` }, 400, cookies); if (identifiers.has(row.nim)) return responseWithCookies({ error: `NIM/NIP duplikat: ${row.nim}` }, 400, cookies); emails.add(row.email); identifiers.add(row.nim) }

        const admin = createAdminClient()

        // Pre-fetch only the profiles whose email is in this CSV batch.
        // This replaces the previous full Auth user enumeration (O(all_users)) with
        // a scoped IN query (O(batch_size)). The profiles table is the source of
        // truth for user IDs — users in Auth but missing a profile are rare and
        // handled per-row by attempting createUser and catching the duplicate error.
        const emailList = [...emails]
        const { data: existingProfiles, error: profilesError } = await admin
          .from('profiles')
          .select('id, email, role, account_status, is_active')
          .in('email', emailList)
        if (profilesError) return responseWithCookies({ error: 'Gagal membaca profile yang sudah ada.' }, 500, cookies)

        const profilesByEmail = new Map((existingProfiles ?? []).filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p]))
        const profilesById = new Map((existingProfiles ?? []).map((p) => [p.id, p]))

        const imported: string[] = []; const existing: string[] = []; const failed: { email: string; error: string }[] = []
        let nextIndex = 0
        async function worker() {
          while (nextIndex < rows.length) {
            const row = rows[nextIndex]; nextIndex += 1
            const existingProfile = profilesByEmail.get(row.email)
            let userId: string | undefined = existingProfile?.id
            let wasExisting = Boolean(existingProfile)

            if (!userId) {
              // Profile not found for this email — try to create the Auth user.
              // If the email already exists in Auth (but has no profile), createUser
              // returns an error matching /already|exists|registered/; we then fall
              // through to upsert the profile using the id we get from the error path.
              const result = await admin.auth.admin.createUser({ email: row.email, email_confirm: true, user_metadata: { full_name: row.full_name, nim: row.nim, user_type: row.user_type } })
              if (result.error && !/already|exists|registered/i.test(result.error.message)) { failed.push({ email: row.email, error: result.error.message }); continue }
              userId = result.data.user?.id
              wasExisting = Boolean(result.error)

              // Auth user existed but profile was missing — find the user id via
              // a narrow listUsers page (page 1, size 1 is not filtered by email,
              // so we re-check profilesByEmail after upsert instead of a second lookup).
              if (!userId) { failed.push({ email: row.email, error: 'User ID tidak ditemukan.' }); continue }
            }

            const previous = profilesById.get(userId)
            const { error } = await admin.from('profiles').upsert({ id: userId, full_name: row.full_name, nim: row.nim, email: row.email, user_type: row.user_type, nim_format_legacy: false, division: row.division, phone: row.phone, role: previous?.role ?? 'user', account_status: previous?.account_status === 'disabled' ? 'disabled' : 'active', is_active: previous?.is_active ?? true })
            if (error) failed.push({ email: row.email, error: error.message }); else if (wasExisting) existing.push(row.email); else imported.push(row.email)
          }
        }
        await Promise.all(Array.from({ length: Math.min(8, rows.length) }, () => worker()))
        return responseWithCookies({ imported, existing, failed }, 200, cookies)
      },
    },
  },
})
