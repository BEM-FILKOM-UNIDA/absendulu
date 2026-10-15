import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// ponytail: harness ini dicopy-paste di 4 script sebelumya — satu tempat sekarang.
// stubs diisi untuk module yang di-import file target (contoh: './time-utils').
export function load(relativePath, stubs = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText
  const module = { exports: {} }
  const requireStub = (id) => {
    if (id in stubs) return stubs[id]
    throw new Error(`un-stubbed import "${id}" while loading ${relativePath}`)
  }
  new Function('module', 'exports', 'require', output)(module, module.exports, requireStub)
  return module.exports
}