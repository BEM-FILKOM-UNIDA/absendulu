#!/usr/bin/env node
/**
 * Feedback loop for dashboard navbar navigation UX.
 * Symptom: click tab → navbar may switch, but content/data lags and loading feels late/ugly.
 *
 * Assertions (RED until fixed):
 * 1. Router must show pending immediately (defaultPendingMs === 0)
 * 2. RoutePending must be content-area only (no nested <main>, no fixed full-viewport bar only)
 * 3. AppShell must react to router pending/loading (progress or pending indicator)
 * 4. Heavy auth routes should defer data so shell can paint before fetch settles
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const router = read('src/router.tsx')
const pending = read('src/components/route-fallbacks.tsx')
const shell = read('src/components/app-shell.tsx')
const authRoutes = [
  'src/routes/_auth/dashboard.tsx',
  'src/routes/_auth/events.tsx',
  'src/routes/_auth/members.tsx',
  'src/routes/_auth/attendance/history.tsx',
  'src/routes/_auth/mahasiswa.tsx',
  'src/routes/_auth/profile.tsx',
].map((rel) => ({ rel, src: read(rel) }))

const failures = []

const pendingMsMatch = router.match(/defaultPendingMs:\s*(\d+)/)
if (!pendingMsMatch || Number(pendingMsMatch[1]) !== 0) {
  failures.push(`router defaultPendingMs must be 0 (got ${pendingMsMatch?.[1] ?? 'missing'}) — delayed pending UI after navbar switch`)
}

if (/<main[\s>]/.test(pending) && /RoutePending/.test(pending)) {
  // RoutePending itself should not nest another main inside AppShell main
  const fn = pending.slice(pending.indexOf('function RoutePending'))
  if (/<main[\s>]/.test(fn)) failures.push('RoutePending nests <main> inside AppShell <main> — awkward full-page loading chrome')
}

if (!/isLoading|status === ['"]pending['"]|status===['"]pending['"]/.test(shell) && !/useRouterState/.test(shell)) {
  failures.push('AppShell does not subscribe to router pending/loading — no immediate nav progress after click')
}

for (const { rel, src } of authRoutes) {
  const hasDefer = /defer\s*\(/.test(src)
  const wrongDeferObject = /defer\s*\(\s*\{\s*data:/.test(src)
  if (wrongDeferObject) failures.push(`${rel}: defer({ data: promise }) is wrong API — defer() wraps a Promise, not an object`)
  if (!hasDefer && /loader:\s*\(/.test(src)) {
    failures.push(`${rel}: blocking loader without defer — tab content waits on network before paint`)
  }
}

console.log('[LOOP] Navbar / pending navigation audit')
if (failures.length === 0) {
  console.log('[LOOP] VERDICT: GREEN — pending timing, shell progress, and deferred loaders look correct')
  process.exit(0)
}

console.log('[LOOP] VERDICT: RED')
for (const failure of failures) console.log(`  - ${failure}`)
process.exit(1)
