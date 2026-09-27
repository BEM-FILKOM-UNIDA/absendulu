import { strict as assert } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(directory, '..', 'src', 'lib', 'attendance', 'history-filters.ts')

const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
}).outputText
const module = { exports: {} }
new Function('module', 'exports', output)(module, module.exports)
const { defaultHistoryFilters, filterHistory } = module.exports

const attendances = [
  { id: '1', status: 'hadir', events: { name: 'Rapat Kerja FILKOM' }, profiles: { full_name: 'Budi Santoso', nim: 'I.2410036' } },
  { id: '2', status: 'terlambat', events: { name: 'Pelatihan Keanggotaan' }, profiles: { full_name: 'Siti Aminah', nim: 'I.2410037' } },
  { id: '3', status: 'izin', events: null, profiles: null },
  { id: '4', status: 'alpha', events: { name: 'Rapat Kerja FILKOM' }, profiles: null },
]

const ids = (query, status, isAdmin) => filterHistory(attendances, { query, status }, isAdmin).map((item) => item.id)

assert.deepEqual(defaultHistoryFilters, { query: '', status: 'all' })
assert.deepEqual(ids('', 'all', false), ['1', '2', '3', '4'])
assert.deepEqual(ids('', 'hadir', false), ['1'])
assert.deepEqual(ids('', 'terlambat', false), ['2'])
assert.deepEqual(ids('', 'izin', false), ['3'])
assert.deepEqual(ids('', 'alpha', false), ['4'])
assert.deepEqual(ids('rapat', 'all', false), ['1', '4'])
assert.deepEqual(ids('  RAPAT  ', 'all', false), ['1', '4'])
assert.deepEqual(ids('   ', 'all', false), ['1', '2', '3', '4'])
assert.deepEqual(ids('budi', 'all', true), ['1'])
assert.deepEqual(ids('I.2410037', 'all', true), ['2'])
assert.deepEqual(ids('rapat', 'alpha', true), ['4'])
assert.deepEqual(ids('tidak-ada', 'all', true), [])

// Mahasiswa hanya boleh mencari nama acara, bukan identitas peserta lain.
assert.deepEqual(ids('budi', 'all', false), [])
assert.deepEqual(ids('I.2410037', 'all', false), [])

console.log('history-filters: semua assertion lulus')
