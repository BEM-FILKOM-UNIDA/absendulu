import { strict as assert } from 'node:assert'
import { load } from './harness.mjs'

const identity = load('src/lib/auth/identity.ts')
const { isValidMemberEmail, isValidMemberIdentifier, exceedsMemberLimits, MEMBER_LIMITS } =
  load('src/lib/members/validation.ts', { '~/lib/auth/identity': identity })

// Member rules must be identical for the manual form and the CSV import. The import
// used to accept "a@" and unbounded lengths that the manual endpoint rejected.
assert.equal(isValidMemberEmail('budi@unida.ac.id'), true)
assert.equal(isValidMemberEmail('a@'), false, 'trailing @ must be rejected')
assert.equal(isValidMemberEmail('@b'), false, 'leading @ must be rejected')
assert.equal(isValidMemberEmail('budi'), false, 'missing @ must be rejected')
assert.equal(isValidMemberEmail('a@b@c'), true, 'only leading/trailing @ are rejected, matching manual.ts')

assert.equal(isValidMemberIdentifier('mahasiswa', 'I.2410036'), true)
assert.equal(isValidMemberIdentifier('mahasiswa', 'bukan-nim'), false)
assert.equal(isValidMemberIdentifier('dosen', '1987654321'), true)
assert.equal(isValidMemberIdentifier('dosen', 'AUTH-2410036'), false, 'generated placeholder must be rejected')

assert.equal(exceedsMemberLimits('Budi', 'I.2410036', 'budi@unida.ac.id'), false)
assert.equal(exceedsMemberLimits('x'.repeat(MEMBER_LIMITS.name), 'I.2410036', 'b@u.id'), false, 'exactly at the limit must pass')
assert.equal(exceedsMemberLimits('x'.repeat(MEMBER_LIMITS.name + 1), 'I.2410036', 'b@u.id'), true)
assert.equal(exceedsMemberLimits('Budi', 'X'.repeat(MEMBER_LIMITS.identifier + 1), 'b@u.id'), true)
assert.equal(exceedsMemberLimits('Budi', 'I.2410036', 'b@u.id'.padEnd(MEMBER_LIMITS.email + 1, 'x')), true)

// Open-redirect guard for the OAuth ?next= parameter.
const { getSafeNextPath, extractQrToken } = load('src/lib/http/navigation.ts')

assert.equal(getSafeNextPath('/events'), '/events')
assert.equal(getSafeNextPath('//evil.test'), '/mahasiswa', 'protocol-relative must be rejected')
assert.equal(getSafeNextPath('https://evil.test'), '/mahasiswa', 'absolute URL must be rejected')
assert.equal(getSafeNextPath('\\evil.test'), '/mahasiswa', 'backslash must be rejected')
assert.equal(getSafeNextPath('/\\evil.test'), '/mahasiswa')
assert.equal(getSafeNextPath(null), '/mahasiswa')
assert.equal(getSafeNextPath(''), '/mahasiswa')
assert.equal(getSafeNextPath(undefined, '/login'), '/login', 'fallback is overridable')

const validToken = 'a'.repeat(32)
assert.equal(extractQrToken(validToken), validToken, 'bare token is accepted')
assert.equal(extractQrToken(`/scan?token=${validToken}`), validToken, 'scan URL is unwrapped')
assert.equal(extractQrToken(`https://absendulu.test/scan?token=${validToken}`), validToken)
assert.equal(extractQrToken('short'), null, 'under 16 chars must be rejected')
assert.equal(extractQrToken('a'.repeat(129)), null, 'over 128 chars must be rejected')
assert.equal(extractQrToken(null), null)

// Every event field is validated in one place; the Jakarta past-date rule has already
// caused a real bug once (validation.ts:44-48).
const { parseEventInput } = load('src/lib/events/validation.ts', { './time-utils': load('src/lib/events/time-utils.ts') })

const jakartaToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
const tomorrow = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
const base = { name: 'Seminar', event_date: tomorrow, start_time: '09:00' }

assert.equal(parseEventInput(null), null)
assert.equal(parseEventInput('bukan objek'), null)
assert.deepEqual(parseEventInput(base), {
  name: 'Seminar', description: null, event_date: tomorrow, start_time: '09:00', end_time: null, location: null, status: 'active',
})
assert.equal(parseEventInput({ ...base, name: '   ' }), null, 'blank name must be rejected')
assert.equal(parseEventInput({ ...base, name: 'x'.repeat(161) }), null, 'name over 160 must be rejected')
assert.equal(parseEventInput({ ...base, name: 'x'.repeat(160) }).name.length, 160, '160 is the boundary and must pass')
assert.equal(parseEventInput({ ...base, description: 'x'.repeat(5001) }), null)
assert.equal(parseEventInput({ ...base, location: 'x'.repeat(201) }), null)
assert.equal(parseEventInput({ ...base, event_date: '2026-13-01' }), null, 'month 13 is not a calendar date')
assert.equal(parseEventInput({ ...base, event_date: '2026-02-30' }), null, 'Feb 30 is not a calendar date')
assert.equal(parseEventInput({ ...base, event_date: 'not-a-date' }), null)
assert.equal(parseEventInput({ ...base, start_time: '24:00' }), null, 'hour 24 is out of range')
assert.equal(parseEventInput({ ...base, start_time: '9:00' }), null, 'hours must be zero padded')
assert.notEqual(parseEventInput({ ...base, end_time: '08:00' }), null, 'end before start is an overnight event, not an error')
assert.equal(parseEventInput({ ...base, start_time: '09:00', end_time: '09:00' }), null, 'identical start and end is a zero-length range')
assert.equal(parseEventInput({ ...base, status: 'archived' }).status, 'active', 'unknown status falls back to active')
assert.equal(parseEventInput({ ...base, status: 'cancelled' }).status, 'cancelled')
assert.equal(parseEventInput({ ...base, event_date: '2020-01-01' }), null, 'past date must be rejected')
assert.notEqual(parseEventInput({ ...base, event_date: jakartaToday }), null, 'today must be accepted in Asia/Jakarta')

console.log('input-validation: semua assertion lulus')