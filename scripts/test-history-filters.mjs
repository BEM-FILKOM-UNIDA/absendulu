import { strict as assert } from 'node:assert'
import { load } from './harness.mjs'

const { defaultHistoryFilters, filterHistory } = load('src/lib/attendance/history-filters.ts')

const attendances = [
  { id: '1', status: 'hadir', events: { name: 'Rapat Kerja FILKOM' }, profiles: { full_name: 'Budi Santoso', nim: 'I.2410036' } },
  { id: '2', status: 'terlambat', events: { name: 'Pelatihan Keanggotaan' }, profiles: { full_name: 'Siti Aminah', nim: 'I.2410037' } },
  { id: '3', status: 'izin', events: null, profiles: null },
  { id: '4', status: 'alpha', events: { name: 'Rapat Kerja FILKOM' }, profiles: null },
]

const ids = (query, status) => filterHistory(attendances, { query, status }).map((item) => item.id)

assert.deepEqual(defaultHistoryFilters, { query: '', status: 'all' })
assert.deepEqual(ids('', 'all'), ['1', '2', '3', '4'])
assert.deepEqual(ids('', 'hadir'), ['1'])
assert.deepEqual(ids('', 'terlambat'), ['2'])
assert.deepEqual(ids('', 'izin'), ['3'])
assert.deepEqual(ids('', 'alpha'), ['4'])
assert.deepEqual(ids('rapat', 'all'), ['1', '4'])
assert.deepEqual(ids('  RAPAT  ', 'all'), ['1', '4'])
assert.deepEqual(ids('   ', 'all'), ['1', '2', '3', '4'])
assert.deepEqual(ids('budi', 'all'), ['1'])
assert.deepEqual(ids('I.2410037', 'all'), ['2'])
assert.deepEqual(ids('rapat', 'alpha'), ['4'])
assert.deepEqual(ids('tidak-ada', 'all'), [])

console.log('history-filters: semua assertion lulus')
