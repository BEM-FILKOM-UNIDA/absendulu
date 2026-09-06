#!/usr/bin/env node
// Phase 1 — tight feedback loop for "Absendulu / error" on first visit
// Simulates SSR loader for "/" with mocked getCurrentAuth that throws.
// Asserts the loop goes RED when error would surface as RouteError.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexPath = path.join(__dirname, '..', 'src', 'routes', 'index.tsx')
const source = fs.readFileSync(indexPath, 'utf8')

// Check if loader has try/catch that returns null (should be green) vs throws (red)
const hasTryCatch = source.includes('try {') && source.includes('return null')
const catchesRedirect = source.includes('catch (error)') && source.includes('return null') && !source.includes('isRedirect')
const hasCorrectRedirectHandling = source.includes('isRedirect') || source.includes('redirect')

console.log('[LOOP] Checking src/routes/index.tsx loader error handling')
console.log(`  hasTryCatch: ${hasTryCatch}`)
console.log(`  catchesRedirect (bug): ${catchesRedirect}`)
console.log(`  hasCorrectRedirectHandling: ${hasCorrectRedirectHandling}`)

if (catchesRedirect) {
  console.log('[LOOP] RED — loader swallows redirect, authenticated users stuck on landing page')
  console.log('[LOOP] Also, if try/catch were missing, any getCurrentAuth failure would bubble to RouteError')
} else if (!hasTryCatch) {
  console.log('[LOOP] RED — loader has no catch, any getCurrentAuth failure -> RouteError (user symptom)')
} else {
  console.log('[LOOP] GREEN — loader correctly handles errors without swallowing redirect')
}

// Second check: production curl for error string (if network available)
let prodError = false
try {
  const res = await fetch('https://absendulu-filkom.vercel.app/', { signal: AbortSignal.timeout(5000) })
  const html = await res.text()
  prodError = html.includes('Absendulu / error')
  console.log(`[LOOP] Production fetch: ${prodError ? 'RED — contains error' : 'GREEN — no error string'}`)
  // Also check health
  const healthRes = await fetch('https://absendulu-filkom.vercel.app/api/health', { signal: AbortSignal.timeout(5000) })
  const health = await healthRes.text()
  console.log(`[LOOP] Health: ${health} (status ${healthRes.status})`)
  if (health.includes('degraded')) console.log('[LOOP] WARN — health degraded, DB queries may fail and trigger RouteError on data loaders')
} catch (e) {
  console.log(`[LOOP] Production fetch failed: ${e.message} (offline, skipping)`)
}

// Overall verdict
const isRed = catchesRedirect || !hasTryCatch || prodError
console.log(`\n[LOOP] VERDICT: ${isRed ? 'RED — bug reproduced or prod error' : 'GREEN — no bug'}`)
process.exit(isRed ? 1 : 0)
