# Data Layer Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the shallow `src/server/data.ts` god module, centralize auth and Supabase wiring, and remove duplicated boilerplate across API handlers.

**Architecture:** Split `data.ts` into domain-specific server function modules under `src/server/data/`, introduce a shared auth seam and Supabase client seam, and extract a common `withAdminApi` wrapper for API routes. Keep existing route behavior and exported interfaces unchanged from the caller's perspective.

**Tech Stack:** TypeScript, TanStack Start server functions, Supabase SSR/admin clients, Nitro/Vercel deployment.

## Global Constraints

- Do not change route URLs, loader signatures, or response shapes visible to existing pages.
- Keep `createServerFn({ method: 'GET' })` on all public data server functions unless a task explicitly says otherwise.
- Maintain existing admin-only guards; do not weaken authorization.
- `npm run build` must pass after every task.
- Run local production smoke tests for `/dashboard` and `/mahasiswa` after the data-layer split.
- Commit at the end of each task; do not batch unrelated changes.

---

## File Structure After Plan

```
src/server/
  auth.ts
  supabase-context.ts
  data/
    index.ts
    events.ts
    members.ts
    attendance.ts
    dashboard.ts
    onboarding.ts
  data.ts
  request-auth.ts
  supabase.ts

src/lib/events/
  time-utils.ts
  validation.ts
  schedule.ts

src/server/api-middleware.ts
```

## Task 1: Centralize Supabase client and cookie wiring

**Files:**
- Create: `src/server/supabase-context.ts`
- Modify: `src/server/auth.ts:1-49`
- Modify: `src/server/request-auth.ts:1-34`
- Modify: `src/routes/api/attendance/check-in.ts:1-96`
- Modify: `src/server/supabase.ts:1-8`

**Interfaces:**
- Consumes: existing cookie helpers in `src/lib/http/cookies.ts`
- Produces: `createAdminClient()`, `createServerSupabase()`, `createRequestSupabase(request, responseCookies)`

- [ ] **Step 1: Inspect current duplication**

Confirm these three locations all reimplement the same `createServerClient` cookie wiring:
- `src/server/auth.ts:22-32`
- `src/server/request-auth.ts:6-15`
- `src/routes/api/attendance/check-in.ts` inline client

- [ ] **Step 2: Create `src/server/supabase-context.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getRequest } from '@tanstack/react-start/server'
import { readCookies, serializeCookie } from '~/lib/http/cookies'

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase server environment belum dikonfigurasi')
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function createServerSupabase(request?: Request) {
  const _request = request ?? getRequest()
  const responseCookies: string[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => readCookies(_request),
        setAll: (cookies) => {
          responseCookies.push(...cookies.map(({ name, value, options }) => serializeCookie(name, value, options)))
        },
      },
    },
  )
  return { supabase, responseCookies }
}

> Note: `createServerSupabase` accepts an optional `request` parameter because the TanStack Start import-protection plugin blocks `@tanstack/react-start/server` imports in files reachable from client bundles unless those imports are used directly in the file body. Passing `getRequest()` from `auth.ts` satisfies the plugin while preserving centralization.
```

- [ ] **Step 3: Update `src/server/auth.ts` to use the new module**

Replace inline cookie wiring with `createServerSupabase()`. Keep `getCurrentAuth` behavior identical.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { normalizeProfileAccess } from '~/lib/auth/profile-access'
import { createServerSupabase } from './supabase-context'

export type AuthProfile = {
  role: string | null
  account_status: 'invited' | 'active' | 'disabled'
  is_active: boolean
  nim: string | null
}

export type AuthSnapshot = {
  user: { id: string; email: string | null } | null
  profile: AuthProfile | null
}

async function readAuth(): Promise<AuthSnapshot> {
  const { supabase, responseCookies } = createServerSupabase(getRequest())
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role, account_status, is_active, nim').eq('id', user.id).maybeSingle()
    : { data: null }

  if (responseCookies.length > 0) {
    setResponseHeader('Set-Cookie', responseCookies)
  }

  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    profile: normalizeProfileAccess(profile) ? { ...normalizeProfileAccess(profile)!, nim: profile?.nim ?? null } : null,
  }
}

export const getCurrentAuth = createServerFn({ method: 'GET' }).handler(readAuth)
```

- [ ] **Step 4: Update `src/server/request-auth.ts`**

Import `createAdminClient` from `supabase-context.ts` and `createRequestSupabase` from the same module. Keep `getRequestAdmin` and `responseWithCookies` signatures unchanged.

- [ ] **Step 5: Update `src/routes/api/attendance/check-in.ts`**

Replace the inline `getAuthenticatedClient` with `createRequestSupabase(request, cookies)` from `supabase-context.ts`.

- [ ] **Step 6: Verify build and smoke test**

Run:
```bash
npm run build
npm run start &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/mahasiswa
```

- [ ] **Step 7: Commit**

```bash
git add src/server/supabase-context.ts src/server/auth.ts src/server/request-auth.ts src/routes/api/attendance/check-in.ts src/server/supabase.ts
git commit -m "refactor: centralize Supabase client and cookie wiring"
```

---

## Task 2: Extract shared auth seam for server functions

**Files:**
- Create: `src/server/auth-guard.ts`
- Modify: `src/server/data.ts:1-123`
- Modify: Each new domain module in Task 3-7 to import from `auth-guard.ts`

**Interfaces:**
- Consumes: `getCurrentAuth` from `auth.ts`, `isAdminRole` from `~/lib/auth/roles`
- Produces: `requireActiveAuth()` returning `{ user, profile }`, plus `requireAdminAuth()` returning `{ user, profile }` or throwing

- [ ] **Step 1: Create `src/server/auth-guard.ts`**

```ts
import { getCurrentAuth } from './auth'
import { isAdminRole } from '~/lib/auth/roles'

export async function requireActiveAuth() {
  const auth = await getCurrentAuth()
  if (!auth.user || !auth.profile || auth.profile.account_status !== 'active' || !auth.profile.is_active) {
    throw new Error('Unauthorized')
  }
  return { ...auth, user: auth.user, profile: auth.profile }
}

export async function requireAdminAuth() {
  const auth = await requireActiveAuth()
  if (!isAdminRole(auth.profile.role)) throw new Error('Forbidden')
  return auth
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/server/auth-guard.ts
git commit -m "feat: extract shared auth seam for server functions"
```

---

## Task 3: Split `data.ts` into domain modules

**Files:**
- Create: `src/server/data/index.ts`
- Create: `src/server/data/events.ts`
- Create: `src/server/data/members.ts`
- Create: `src/server/data/attendance.ts`
- Create: `src/server/data/dashboard.ts`
- Create: `src/server/data/onboarding.ts`
- Modify: `src/server/data.ts` to re-export from the new modules
- Modify: All route files that import from `~/server/data`

**Interfaces:**
- Consumes: `requireActiveAuth`, `requireAdminAuth`, `createAdminClient` from existing server modules
- Produces: Same exports as current `data.ts`, but implemented in domain files

- [ ] **Step 1: Create `src/server/data/events.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth, requireAdminAuth } from '../auth-guard'

export const getEventsData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  let query = createAdminClient().from('events').select('id, name, description, event_date, start_time, end_time, location, status').order('event_date', { ascending: !isAdmin }).order('start_time', { ascending: true }).limit(100)
  if (!isAdmin) query = query.eq('status', 'active')
  const { data } = await query
  return { isAdmin, events: data ?? [] }
})

export const getEventDetailData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  const admin = createAdminClient()
  let eventQuery = admin.from('events').select('id, name, description, event_date, start_time, end_time, location, status').eq('id', data.id)
  if (!isAdmin) eventQuery = eventQuery.eq('status', 'active')
  const { data: event } = await eventQuery.maybeSingle()
  if (!event) throw new Error('Event not found')
  const { data: session } = isAdmin ? await admin.from('attendance_sessions').select('id, event_id, is_open').eq('event_id', data.id).eq('is_open', true).maybeSingle() : { data: null }
  const { count } = isAdmin && session ? await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id) : { count: 0 }
  return { event, isAdmin, session, attendanceCount: count ?? 0 }
})

export const getQrData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
  const auth = await requireAdminAuth()
  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('id, name, event_date, start_time, end_time, location, status').eq('id', data.id).maybeSingle()
  if (!event) throw new Error('Event not found')
  const { data: session } = await admin.from('attendance_sessions').select('id, event_id, is_open, qr_token').eq('event_id', data.id).eq('is_open', true).maybeSingle()
  if (!session) return { event, session: null, attendanceCount: 0 }
  const { count } = await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id)
  return { event, session, attendanceCount: count ?? 0 }
})
```

- [ ] **Step 2: Create `src/server/data/members.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireAdminAuth } from '../auth-guard'

export const getMembersData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireAdminAuth()
  const { data: members } = await createAdminClient().from('profiles').select('id, full_name, nim, email, user_type, account_status, is_active').order('full_name').limit(1000)
  return { members: members ?? [] }
})
```

- [ ] **Step 3: Create `src/server/data/attendance.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth } from '../auth-guard'

export const getHistoryData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  let query = createAdminClient().from('attendances').select('id, user_id, status, method, check_in_at, notes, events(name)').order('check_in_at', { ascending: false }).limit(isAdmin ? 100 : 50)
  if (!isAdmin) query = query.eq('user_id', auth.user.id)
  const { data } = await query
  const rows = data ?? []
  const userIds = isAdmin ? [...new Set(rows.map((item) => item.user_id))] : []
  const { data: profiles } = userIds.length > 0 ? await createAdminClient().from('profiles').select('id, full_name, nim').in('id', userIds) : { data: [] }
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return { isAdmin, attendances: rows.map((attendance) => ({ ...attendance, profiles: isAdmin ? profilesById.get(attendance.user_id) ?? null : null })) }
})
```

- [ ] **Step 4: Create `src/server/data/dashboard.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth } from '../auth-guard'

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  const admin = createAdminClient()
  const [eventsResult, profilesResult, sessionsResult] = await Promise.all([
    admin.from('events').select('id, name, event_date, start_time, status, location').order('event_date', { ascending: false }).limit(4),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('attendance_sessions').select('id').eq('is_open', true),
  ])
  const sessionIds = sessionsResult.data?.map((session) => session.id) ?? []
  const { count: checkIns } = sessionIds.length > 0 ? await admin.from('attendances').select('id', { count: 'exact', head: true }).in('session_id', sessionIds) : { count: 0 }
  return {
    auth,
    isAdmin,
    events: eventsResult.data ?? [],
    stats: [
      { label: 'Acara terdekat', value: eventsResult.data?.length ?? 0, note: 'tercatat di Absendulu' },
      { label: 'Mahasiswa', value: profilesResult.count ?? 0, note: 'terdaftar di FILKOM' },
      { label: 'Absensi aktif', value: sessionIds.length, note: 'sedang dibuka' },
      { label: 'Sudah hadir', value: checkIns ?? 0, note: 'di acara berjalan' },
    ],
  }
})
```

- [ ] **Step 5: Create `src/server/data/onboarding.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { getCurrentAuth } from '../auth'
import { requireActiveAuth } from '../auth-guard'

export const getOnboardingData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await getCurrentAuth()
  if (!auth.user) return { auth, profile: null }
  const { data: profile } = await createAdminClient()
    .from('profiles')
    .select('full_name, nim, user_type, account_status, is_active')
    .eq('id', auth.user.id)
    .maybeSingle()
  return { auth, profile }
})

export const getStudentHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const admin = createAdminClient()
  const [{ data: profile }, { data: events }, { data: attendance }] = await Promise.all([
    admin.from('profiles').select('id, full_name, nim, role, account_status, is_active, email').eq('id', auth.user.id).maybeSingle(),
    admin.from('events').select('id, name, event_date, start_time, location').eq('status', 'active').order('event_date', { ascending: true }).order('start_time', { ascending: true }).limit(8),
    admin.from('attendances').select('id, status, method, check_in_at, events(name)').eq('user_id', auth.user.id).order('check_in_at', { ascending: false }).limit(5),
  ])
  const eventIds = events?.map((event) => event.id) ?? []
  const { data: openSessions } = eventIds.length > 0 ? await admin.from('attendance_sessions').select('event_id').in('event_id', eventIds).eq('is_open', true) : { data: [] }
  return { auth, profile, events: events ?? [], openEventIds: (openSessions ?? []).map((session) => session.event_id), attendance: attendance ?? [] }
})
```

- [ ] **Step 6: Create `src/server/data/index.ts`**

```ts
export { getEventsData, getEventDetailData, getQrData } from './events'
export { getMembersData } from './members'
export { getHistoryData } from './attendance'
export { getDashboardData } from './dashboard'
export { getOnboardingData, getStudentHomeData } from './onboarding'
```

- [ ] **Step 7: Convert `src/server/data.ts` to a barrel**

Replace the implementation with:

```ts
export { getEventsData, getEventDetailData, getQrData } from './data/events'
export { getMembersData } from './data/members'
export { getHistoryData } from './data/attendance'
export { getDashboardData } from './data/dashboard'
export { getOnboardingData, getStudentHomeData } from './data/onboarding'
```

- [ ] **Step 8: Update all route imports**

Update these files to keep importing from `~/server/data` (they do not need changes because `data.ts` still re-exports):
- `src/routes/_auth/dashboard.tsx`
- `src/routes/_auth/mahasiswa.tsx`
- `src/routes/_auth/events.tsx`
- `src/routes/_auth/events/$id.tsx`
- `src/routes/_auth/events/$id/qr.tsx`
- `src/routes/_auth/attendance/history.tsx`
- `src/routes/_auth/members.tsx`
- `src/routes/_auth/profile.tsx`
- `src/routes/waiting-approval.tsx`
- `src/routes/complete-profile.tsx`

No route file changes are required in this step because `data.ts` continues to re-export.

- [ ] **Step 9: Verify build and smoke test**

```bash
npm run build
npm run start &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/mahasiswa
```

- [ ] **Step 10: Commit**

```bash
git add src/server/data.ts src/server/data/index.ts src/server/data/events.ts src/server/data/members.ts src/server/data/attendance.ts src/server/data/dashboard.ts src/server/data/onboarding.ts src/server/auth-guard.ts
git commit -m "refactor: split data.ts into domain-specific server function modules"
```

---

## Task 4: Extract API handler middleware

**Files:**
- Create: `src/server/api-middleware.ts`
- Modify: `src/routes/api/members/manual.ts`
- Modify: `src/routes/api/members/import.ts`
- Modify: `src/routes/api/members/$id.ts`
- Modify: `src/routes/api/events.ts`
- Modify: `src/routes/api/events/$id.ts`
- Modify: `src/routes/api/events/$id/session.ts`
- Modify: `src/routes/api/events/$id/session/open.ts`
- Modify: `src/routes/api/events/$id/session/close.ts`
- Modify: `src/routes/api/profile.ts`
- Modify: `src/routes/api/health.ts`

**Interfaces:**
- Consumes: `isSameOrigin` from `~/lib/http/request-security`, `getRequestAdmin` / `responseWithCookies` from `../request-auth`
- Produces: `withAdminApi(request)` returning `{ isAdmin, user, body, cookies }` plus helper methods

- [ ] **Step 1: Create `src/server/api-middleware.ts`**

```ts
import { isSameOrigin } from '~/lib/http/request-security'
import { getRequestAdmin, responseWithCookies } from './request-auth'

export async function withAdminApi(request: Request) {
  const cookies: string[] = []
  if (!isSameOrigin(request)) {
    return responseWithCookies({ error: 'Origin request tidak valid.' }, 403, cookies)
  }
  const admin = await getRequestAdmin(request, cookies)
  if (!admin.isAdmin) {
    return responseWithCookies({ error: 'Akses ditolak' }, 403, cookies)
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return responseWithCookies({ error: 'Body request tidak valid.' }, 400, cookies)
  }
  return { isAdmin: admin.isAdmin, user: admin.user, body, cookies }
}
```

- [ ] **Step 2: Update `src/routes/api/members/manual.ts`**

Replace preamble with:

```ts
const guard = await withAdminApi(request)
if ('error' in guard) return guard
const { isAdmin, user, body, cookies } = guard
```

Keep all validation and business logic unchanged.

- [ ] **Step 3: Update `src/routes/api/events.ts`**

Replace both GET and POST preambles with `withAdminApi(request)`. Keep query and insert logic unchanged.

- [ ] **Step 4: Update remaining API routes**

Apply the same preamble replacement to:
- `src/routes/api/members/import.ts`
- `src/routes/api/members/$id.ts`
- `src/routes/api/events/$id.ts`
- `src/routes/api/events/$id/session.ts`
- `src/routes/api/events/$id/session/open.ts`
- `src/routes/api/events/$id/session/close.ts`
- `src/routes/api/profile.ts`

For routes that allow non-admin authenticated users in some methods, extract a `withAuthenticatedApi` variant later if needed; for now only admin routes use the wrapper.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/server/api-middleware.ts src/routes/api/members/manual.ts src/routes/api/members/import.ts src/routes/api/members/\$id.ts src/routes/api/events.ts src/routes/api/events/\$id.ts src/routes/api/events/\$id/session.ts src/routes/api/events/\$id/session/open.ts src/routes/api/events/\$id/session/close.ts src/routes/api/profile.ts
git commit -m "refactor: extract API handler middleware"
```

---

## Task 5: Consolidate duplicated time utilities

**Files:**
- Create: `src/lib/events/time-utils.ts`
- Modify: `src/lib/events/validation.ts`
- Modify: `src/lib/events/schedule.ts`

**Interfaces:**
- Consumes: none
- Produces: `toMinutes(time: string): number`, `isValidEventTimeRange(start: string, end: string): boolean`

- [ ] **Step 1: Create `src/lib/events/time-utils.ts`**

```ts
export function toMinutes(time: string): number {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}

export function isValidEventTimeRange(start: string, end: string): boolean {
  return toMinutes(end) > toMinutes(start)
}
```

- [ ] **Step 2: Update `src/lib/events/validation.ts`**

Remove the local `toMinutes` and `isValidEventTimeRange` definitions. Import them from `./time-utils`.

- [ ] **Step 3: Update `src/lib/events/schedule.ts`**

Remove the local `toMinutes` and `isValidEventTimeRange` definitions. Import them from `./time-utils`.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/time-utils.ts src/lib/events/validation.ts src/lib/events/schedule.ts
git commit -m "refactor: consolidate duplicated time utilities"
```

---

## Task 6: Remove old `data.ts` implementation and clean up imports

**Files:**
- Modify: `src/server/data.ts`
- Modify: All route files that import from `~/server/data` to import directly from `~/server/data/<domain>` (optional cleanup)

**Interfaces:**
- Consumes: domain modules created in Task 3
- Produces: clean module tree with no orphaned implementation

- [ ] **Step 1: Inspect remaining imports**

Search for any remaining imports from `src/server/data.ts` that bypass the barrel or reference old paths.

```bash
grep -rn "from '~/server/data'" src/
```

- [ ] **Step 2: Convert `src/server/data.ts` to a thin barrel only**

```ts
export { getEventsData, getEventDetailData, getQrData } from './data/events'
export { getMembersData } from './data/members'
export { getHistoryData } from './data/attendance'
export { getDashboardData } from './data/dashboard'
export { getOnboardingData, getStudentHomeData } from './data/onboarding'
```

- [ ] **Step 3: Optional direct imports**

If you want to tighten locality, update route files to import directly from `~/server/data/events`, `~/server/data/members`, etc. This is optional because the barrel preserves existing import paths.

- [ ] **Step 4: Verify build and smoke test**

```bash
npm run build
npm run start &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/mahasiswa
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/events
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/members
```

- [ ] **Step 5: Commit**

```bash
git add src/server/data.ts
git commit -m "refactor: remove old data.ts implementation and finalize barrel"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-02-data-layer-deepening.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?