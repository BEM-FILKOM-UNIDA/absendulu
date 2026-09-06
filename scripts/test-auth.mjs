import { strict as assert } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const rolesPath = path.join(directory, '..', 'src', 'lib', 'auth', 'roles.ts')
const requestAuthPath = path.join(directory, '..', 'src', 'server', 'request-auth.ts')
const healthPath = path.join(directory, '..', 'src', 'routes', 'api', 'health.ts')

const source = fs.readFileSync(rolesPath, 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
}).outputText
const module = { exports: {} }
new Function('module', 'exports', output)(module, module.exports)
const { isActiveAdminProfile } = module.exports

assert.equal(isActiveAdminProfile({ role: 'admin', account_status: 'active', is_active: true }), true)
assert.equal(isActiveAdminProfile({ role: 'admin_bem', account_status: 'active', is_active: true }), true)
assert.equal(isActiveAdminProfile({ role: 'admin', account_status: 'disabled', is_active: true }), false)
assert.equal(isActiveAdminProfile({ role: 'admin', account_status: 'active', is_active: false }), false)
assert.equal(isActiveAdminProfile({ role: 'user', account_status: 'active', is_active: true }), false)
assert.equal(isActiveAdminProfile({ role: 'admin' }), false)
assert.equal(isActiveAdminProfile(null), false)

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
]
for (const relativePath of adminRoutePaths) {
  const routeSource = fs.readFileSync(path.join(routesDirectory, relativePath), 'utf8')
  assert.match(routeSource, /withAdminApi\(/, `${relativePath} must use the admin API guard`)
}

const readOnlyAdminRoutes = ['events.ts', 'events/$id.ts', 'events/$id/session.ts']
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

console.log('auth regression: PASS (active admin guard, admin route coverage, origin protection, and server health check)')
