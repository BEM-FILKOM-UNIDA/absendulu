import { strict as assert } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(directory, '..', 'src', 'lib', 'export', 'csv.ts')

const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
}).outputText
const module = { exports: {} }
new Function('module', 'exports', output)(module, module.exports)
const { toCsv } = module.exports

assert.equal(
  toCsv(['full_name', 'nim', 'check_in_at', 'status'], [['Budi Santoso', 'I.2410036', '2026-09-28T02:00:00+00:00', 'hadir']]),
  '\uFEFFfull_name,nim,check_in_at,status\r\nBudi Santoso,I.2410036,2026-09-28T02:00:00+00:00,hadir\r\n',
)

assert.equal(
  toCsv(['full_name', 'nim'], [['Anak", kecil', 'I.2410037'], ['Baris\r\nbaru', null]]),
  '\uFEFFfull_name,nim\r\n"Anak"", kecil",I.2410037\r\n"Baris\r\nbaru",\r\n',
)

assert.equal(toCsv(['a'], []), '\uFEFFa\r\n')

assert.equal(toCsv(['a', 'b'], [[1, true], [null, undefined]]), '\uFEFFa,b\r\n1,true\r\n,\r\n')

// Formula injection: full_name is self-service (profile.ts) or CSV-imported, so a
// cell must never reach Excel as something it will evaluate.
assert.equal(
  toCsv(['full_name'], [['=HYPERLINK("http://evil.test","click")'], ['+1+1'], ['-2+3'], ['@SUM(A1)']]),
  '\uFEFFfull_name\r\n"\'=HYPERLINK(""http://evil.test"",""click"")"\r\n\'+1+1\r\n\'-2+3\r\n\'@SUM(A1)\r\n',
)

assert.equal(
  toCsv(['nim'], [['I.2410036'], ['1987654321']]),
  '\uFEFFnim\r\nI.2410036\r\n1987654321\r\n',
  'legitimate identifiers must stay unprefixed',
)

console.log('csv-export: semua assertion lulus')
