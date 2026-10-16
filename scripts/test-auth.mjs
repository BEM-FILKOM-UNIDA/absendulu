import { strict as assert } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from './harness.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const requestAuthPath = path.join(directory, '..', 'src', 'server', 'request-auth.ts')
const healthPath = path.join(directory, '..', 'src', 'routes', 'api', 'health.ts')
const startPath = path.join(directory, '..', 'src', 'start.ts')
const startSource = fs.readFileSync(startPath, 'utf8')

assert.match(startSource, /createCsrfMiddleware/)
assert.match(startSource, /filter:\s*\(ctx\)\s*=>\s*ctx\.handlerType\s*===\s*['"]serverFn['"]/)
assert.match(startSource, /requestMiddleware:\s*\[requestMiddleware,\s*csrfMiddleware\]/)

const { isActiveAdminProfile } = load('src/lib/auth/roles.ts')

assert.equal(isActiveAdminProfile({ role: 'admin', account_status: 'active', is_active: true }), true)
assert.equal(isActiveAdminProfile({ role: 'admin_bem', account_status: 'active', is_active: true }), true)
assert.equal(isActiveAdminProfile({ role: 'admin', account_status: 'disabled', is_active: true }), false)
assert.equal(isActiveAdminProfile({ role: 'admin', account_status: 'active', is_active: false }), false)
assert.equal(isActiveAdminProfile({ role: 'user', account_status: 'active', is_active: true }), false)
assert.equal(isActiveAdminProfile({ role: 'admin' }), false)
assert.equal(isActiveAdminProfile(null), false)

// CSRF primitive — no Origin header must never pass.
const { isSameOrigin } = load('src/lib/http/request-security.ts')
const probe = (url, origin) => new Request(url, origin === undefined ? {} : { headers: { origin } })

assert.equal(isSameOrigin(probe('https://absendulu.test/api/events', 'https://absendulu.test')), true)
assert.equal(isSameOrigin(probe('https://absendulu.test/api/events', 'https://evil.test')), false)
assert.equal(isSameOrigin(probe('https://absendulu.test/api/events')), false, 'missing Origin must be rejected')
assert.equal(isSameOrigin(probe('https://absendulu.test/api/events', 'https://absendulu.test:8443')), false, 'port must be compared')
assert.equal(isSameOrigin(probe('https://absendulu.test/api/events', 'HTTPS://absendulu.test')), false, 'Origin compare is exact, not case-folded')

// Unknown account_status must not silently grant access (profile-access.ts:14).
const { normalizeProfileAccess } = load('src/lib/auth/profile-access.ts')
assert.equal(normalizeProfileAccess(null), null)
assert.equal(normalizeProfileAccess(undefined), null)
assert.equal(normalizeProfileAccess({ account_status: 'pending' }), null, 'unknown status must deny')
assert.equal(normalizeProfileAccess({ account_status: '' }), null, 'empty status must deny')
assert.equal(normalizeProfileAccess({ role: 7, account_status: 'active' }).role, null, 'non-string role must not pass through')
assert.equal(normalizeProfileAccess({ account_status: 'active' }).is_active, true, 'absent is_active defaults to true')
assert.equal(normalizeProfileAccess({ account_status: 'active', is_active: false }).is_active, false)
assert.equal(normalizeProfileAccess({ account_status: 'disabled' }).account_status, 'disabled')

// Identity validators — 7 call sites across import, manual, profile, and patch.
const { isValidStudentNim, isValidStaffIdentifier, isProfileComplete } = load('src/lib/auth/identity.ts')
assert.equal(isValidStudentNim('I.2410036'), true)
assert.equal(isValidStudentNim('i.2410036'), true, 'NIM is case-normalised')
assert.equal(isValidStudentNim(' I.2410036 '), true, 'NIM is trimmed')
assert.equal(isValidStudentNim('I.241003'), false, 'needs exactly 7 digits')
assert.equal(isValidStudentNim('2410036'), false, 'leading I. required')
assert.equal(isValidStudentNim(''), false)
assert.equal(isValidStudentNim(null), false)

assert.equal(isValidStaffIdentifier('1987654321'), true)
assert.equal(isValidStaffIdentifier('ab'), false, 'min length 3')
assert.equal(isValidStaffIdentifier('AUTH-2410036'), false, 'generated placeholder must be rejected')
assert.equal(isValidStaffIdentifier('x'.repeat(65)), false, 'max length 64')
assert.equal(isValidStaffIdentifier('_leading'), false, 'must start alphanumeric')

assert.equal(isProfileComplete({ user_type: 'mahasiswa', full_name: 'Budi', nim: 'I.2410036' }), true)
assert.equal(isProfileComplete({ user_type: 'mahasiswa', full_name: 'Budi', nim: 'bukan-nim' }), false)
assert.equal(isProfileComplete({ user_type: 'dosen', full_name: 'Budi', nim: '1987654321' }), true)
assert.equal(isProfileComplete({ user_type: 'mahasiswa', full_name: '  ', nim: 'I.2410036' }), false, 'whitespace name is not complete')
assert.equal(isProfileComplete(null), false)

const requestAuthSource = fs.readFileSync(requestAuthPath, 'utf8')
assert.match(requestAuthSource, /select\('role, account_status, is_active'\)/)
assert.match(requestAuthSource, /isActiveAdminProfile\(profile\)/)

const routesDirectory = path.join(directory, '..', 'src', 'routes', 'api')
const adminRoutePaths = [
  'events.ts',
  'events/$id.ts',
  'events/$id/session.ts',
  'events/$id/session/open.ts',
  'events/$id/session/close.ts',
  'members/$id.ts',
  'members/import.ts',
  'members/manual.ts',
  'events/$id/attendance-export.ts',
]
for (const relativePath of adminRoutePaths) {
  const routeSource = fs.readFileSync(path.join(routesDirectory, relativePath), 'utf8')
  assert.match(routeSource, /withAdminApi\(/, `${relativePath} must use the admin API guard`)
}

const readOnlyAdminRoutes = ['events.ts', 'events/$id.ts', 'events/$id/session.ts', 'events/$id/attendance-export.ts']
for (const relativePath of readOnlyAdminRoutes) {
  const routeSource = fs.readFileSync(path.join(routesDirectory, relativePath), 'utf8')
  assert.match(routeSource, /parseBody: false, requireSameOrigin: false/, `${relativePath} must explicitly allow read-only cross-origin requests`)
}

assert.doesNotMatch(
  fs.readFileSync(path.join(routesDirectory, 'events.ts'), 'utf8'),
  /POST:[\s\S]*requireSameOrigin:\s*false/,
  'event mutations must keep same-origin protection',
)

const healthSource = fs.readFileSync(healthPath, 'utf8')
assert.match(healthSource, /createAdminClient\(\)\.from\('events'\)/)
assert.doesNotMatch(healthSource, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)

const exportSource = fs.readFileSync(path.join(routesDirectory, 'events', '$id', 'attendance-export.ts'), 'utf8')
assert.match(exportSource, /'Acara tidak ditemukan\.'/)
assert.match(exportSource, /'Gagal memuat data absensi\.'/)
assert.match(exportSource, /text\/csv;\s*charset=utf-8/)
assert.match(exportSource, /Content-Disposition/)
assert.match(exportSource, /attendance-\$\{params\.id\}\.csv/)

const attendanceDataSource = fs.readFileSync(path.join(directory, '..', 'src', 'server', 'data', 'attendance.ts'), 'utf8')
assert.match(attendanceDataSource, /fetchEventAttendance/)
assert.match(attendanceDataSource, /from\('attendances'\)[\s\S]*?\.eq\('event_id',\s*eventId\)[\s\S]*?\.limit\(/)
// Mahasiswa hanya boleh melihat absensi sendiri: query dicakup ke user_id dan profil peserta tidak ikut dikirim.
assert.match(attendanceDataSource, /if \(!isAdmin\) query = query\.eq\('user_id', auth\.user\.id\)/)
assert.match(attendanceDataSource, /profiles: isAdmin \? profilesById\.get\(a\.user_id\) \?\? null : null/)

// readAuth must verify the JWT locally (getClaims) instead of paying an Auth round-trip on
// every navigation (getUser). Mutations keep getUser() through request-auth.ts.
const readAuthSource = fs.readFileSync(path.join(directory, '..', 'src', 'server', 'auth.ts'), 'utf8')
assert.match(readAuthSource, /supabase\.auth\.getClaims\(\)/, 'readAuth must verify the JWT locally')
assert.doesNotMatch(readAuthSource, /supabase\.auth\.getUser\(\)/, 'readAuth must not call the Auth server per request')
assert.match(
  fs.readFileSync(requestAuthPath, 'utf8'),
  /supabase\.auth\.getUser\(\)/,
  'mutation path must keep full server-side session validation',
)

console.log('auth regression: PASS (active admin guard, admin route coverage, origin protection, and server health check)')
