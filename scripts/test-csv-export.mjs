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

console.log('csv-export: semua assertion lulus')
