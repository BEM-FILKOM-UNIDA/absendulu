# Absendulu — Application Architecture & Flow Analysis

## 1. Overall App Architecture

### 1.1 Framework Stack
- **Core**: TanStack Start v1.168.49 + TanStack Router v1.170.32
- **Runtime**: Vite v8.2.2 with Nitro v3.0.260610-beta for server-side rendering and API routes
- **UI**: React 19.2.8, Tailwind CSS v4.2.2, Lucide React icons
- **Backend**: Supabase (auth, database, SSR integration via `@supabase/ssr` v0.12.5)
- **Entry**: `vite dev` for development, `node .output/server/index.mjs` for production

### 1.2 Entry Points
- **`src/start.ts`**: Defines the TanStack Start instance (`startInstance`) with request middleware, security headers, CSP, and API method rules.
- **`src/router.tsx`**: Creates the TanStack Router instance (`getRouter()`) using the auto-generated `routeTree.gen`.
- **`src/routes/__root.tsx`**: Root route shell that wraps all pages in `<html>`, `<head>` (meta, CSS, favicon), and `<body>` with `<Scripts />`.

### 1.3 Routing Structure
Routes are file-based and compiled into `src/routeTree.gen.ts`.

**Public (unauthenticated) routes**:
- `/` — Landing page (`src/routes/index.tsx`)
- `/login` — Google OAuth login (`src/routes/login.tsx`)
- `/auth/callback` — OAuth callback (server-only) (`src/routes/auth/callback.ts`)
- `/complete-profile` — Onboarding for new users (`src/routes/complete-profile.tsx`)
- `/waiting-approval` — Waiting for admin activation (`src/routes/waiting-approval.tsx`)
- `/account-disabled` — Disabled account notice (`src/routes/account-disabled.tsx`)
- `/api/*` — REST API endpoints

**Protected routes** (under `/_auth` layout):
- `/_auth/dashboard` — Admin dashboard (`src/routes/_auth/dashboard.tsx`)
- `/_auth/mahasiswa` — Student home (`src/routes/_auth/mahasiswa.tsx`)
- `/_auth/events` — Events listing (`src/routes/_auth/events/index.tsx`)
- `/_auth/events/new` — Create event (`src/routes/_auth/events/new.tsx`)
- `/_auth/events/$id` — Event detail with children:
  - `/_auth/events/$id/` — Event detail page (`src/routes/_auth/events/$id/index.tsx`)
  - `/_auth/events/$id/qr` — QR code display (`src/routes/_auth/events/$id/qr.tsx`)
- `/_auth/members` — Member management (`src/routes/_auth/members.tsx`)
- `/_auth/scan` — QR scanner (`src/routes/_auth/scan.tsx`)
- `/_auth/profile` — Profile settings (`src/routes/_auth/profile.tsx`)
- `/_auth/attendance/history` — Attendance history (`src/routes/_auth/attendance/history.tsx`)

---

## 2. Authentication Flow (in detail)

### 2.1 Login Flow
**File**: `src/routes/login.tsx`

1. User clicks "Masuk dengan Google" button.
2. `handleGoogleLogin()` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } })`.
3. `callbackUrl()` constructs `https://<origin>/auth/callback?next=<safe_next_path>` using `getSafeNextPath()` which validates the `next` parameter to prevent open redirects.
4. User is redirected to Google, then back to `/auth/callback`.

### 2.2 OAuth Callback (Server-side)
**File**: `src/routes/auth/callback.ts` (server handlers only)

1. **GET handler** receives the callback request.
2. Reads `next`, `error`, and `code` query parameters.
3. Creates a server-side Supabase client using `createServerClient()` with cookie helpers (`readCookies`, `serializeCookie`) to manage the session.
4. If `error` param exists → redirect to `/login?error=google`.
5. If no `code` → redirect to `/login?error=invalid`.
6. Exchanges the auth code for a session: `supabase.auth.exchangeCodeForSession(code)`.
7. If exchange fails → redirect to `/login?error=expired`.
8. Retrieves the authenticated user: `supabase.auth.getUser()`.
9. **Uses admin client** (`createAdminClient()`) to read the `profiles` row by `user.id` — this avoids RLS edge cases during the callback.
10. **If no profile exists** (new self-registration):
    - Derives `nim` from email:
      - If email is `I.########@unida.ac.id` (valid NIM format) → uses the email prefix as NIM and sets `account_status: 'active'`.
      - Otherwise → uses `AUTH-<user.id>` as generated NIM and sets `account_status: 'invited'`.
    - Inserts profile with `user_type: 'mahasiswa'`, `role: 'user'`, `is_active: true`.
    - Redirects to `/mahasiswa` for campus emails or `/complete-profile` for others.
11. **If profile exists**:
    - If NIM matches `GENERATED_IDENTIFIER_PATTERN` (`^AUTH-`) → redirect to `/complete-profile`.
    - Otherwise routes based on status:
      - `disabled` or `is_active === false` → `/account-disabled`
      - `account_status !== 'active'` → `/complete-profile`
      - Admin role → `/dashboard`
      - Regular user → `/mahasiswa` (or `next` if provided)

### 2.3 Session Management
**File**: `src/server/auth.ts`

- **`getCurrentAuth()`** is a `createServerFn` (GET) that:
  1. Creates a server Supabase client from the incoming request cookies.
  2. Calls `supabase.auth.getUser()` to validate the session.
  3. Uses **admin client** to query `profiles` (bypasses RLS, avoids stale JWT propagation issues).
  4. Caches the profile for 10 seconds using `cached('auth-profile:<user.id>', ...)`.
  5. Normalizes profile access via `normalizeProfileAccess()` which only accepts `account_status` values of `invited`, `active`, or `disabled`.
  6. Returns `{ user, profile }` or `{ user: null, profile: null }`.

- **`requireActiveAuth()`**: Calls `getCurrentAuth()` and throws if user is missing, profile missing, account not `active`, or `is_active` is false.
- **`requireAdminAuth()`**: Calls `requireActiveAuth()` and throws if `role` is not `admin` or `admin_bem`.

### 2.4 Client-side Session
**File**: `src/lib/supabase/client.ts`

- `createClient()` is a singleton that creates a `createBrowserClient` using publishable URL and anon key.
- Used in client components for auth actions (sign out, OAuth, real-time if needed).

---

## 3. Protected Route Structure (`_auth` layout)

**File**: `src/routes/_auth.tsx`

### 3.1 Guard Logic (`beforeLoad`)
Runs before any `_auth` child route renders:

```typescript
beforeLoad: async ({ location }) => {
  const auth = await getCurrentAuth()
  if (!auth.user) → redirect('/login?next=<location>')
  if (!auth.profile || profile.account_status === 'disabled' || !profile.is_active) → redirect('/account-disabled')
  if (profile.account_status !== 'active') → redirect('/complete-profile')
  if (GENERATED_IDENTIFIER_PATTERN.test(profile.nim)) → redirect('/complete-profile')
  return { auth }
}
```

### 3.2 Layout Component (`AuthLayout`)
- Receives `auth` from route context.
- Determines `isAdmin` from `auth.profile.role === 'admin' || 'admin_bem'`.
- Renders `<AppShell isAdmin={isAdmin} />`.

### 3.3 Admin-Only Sub-routes
Some routes add an extra `beforeLoad` check:
- `src/routes/_auth/dashboard.tsx` — `if (role !== 'admin' && role !== 'admin_bem') throw redirect('/mahasiswa')`
- `src/routes/_auth/members.tsx` — Implicitly admin-only via data loader (`requireAdminAuth`).
- `src/routes/_auth/events/$id/qr.tsx` — Uses `requireAdminAuth()` in its loader.

---

## 4. Key Pages and Their Purposes

| Route | File | Purpose |
|---|---|---|
| `/` | `src/routes/index.tsx` | Public landing page. Redirects authenticated users via client-side effect + loader. |
| `/login` | `src/routes/login.tsx` | Google OAuth entry point. Shows notices for various error/status states via query params. |
| `/auth/callback` | `src/routes/auth/callback.ts` | Server-only route. Exchanges OAuth code, creates/updates profile, redirects based on account state. |
| `/complete-profile` | `src/routes/complete-profile.tsx` | Onboarding form for new users to enter NIM/NIP and full name. Validates identifier format. Calls `PATCH /api/profile`. |
| `/waiting-approval` | `src/routes/waiting-approval.tsx` | Shown to users with `account_status !== 'active'`. Polls `/waiting-approval` loader via `router.invalidate()` to check status. |
| `/account-disabled` | `src/routes/account-disabled.tsx` | Static page for disabled accounts. |
| `/_auth/dashboard` | `src/routes/_auth/dashboard.tsx` | Admin dashboard showing stats (events, students, active sessions, check-ins) and recent events. |
| `/_auth/mahasiswa` | `src/routes/_auth/mahasiswa.tsx` | Student home showing upcoming events, profile summary, and recent attendance. |
| `/_auth/events` | `src/routes/_auth/events/index.tsx` | Events listing (admin sees all, students see only `active`). |
| `/_auth/events/new` | `src/routes/_auth/events/new.tsx` | Event creation form (admin only). |
| `/_auth/events/$id/` | `src/routes/_auth/events/$id/index.tsx` | Event detail with status management (activate, complete, cancel, delete) and session controls for admins. |
| `/_auth/events/$id/qr` | `src/routes/_auth/events/$id/qr.tsx` | QR code display for active attendance session (admin only). Supports download and fullscreen. |
| `/_auth/members` | `src/routes/_auth/members.tsx` | Member management table with import CSV, manual registration, and activate/deactivate toggles (admin only). |
| `/_auth/scan` | `src/routes/_auth/scan.tsx` | QR scanner page using `html5-qrcode`. Supports camera scanning and image upload. Calls `POST /api/attendance/check-in`. |
| `/_auth/profile` | `src/routes/_auth/profile.tsx` | Profile view/edit. Admins can edit `division`; regular users can edit `full_name` and `nim`. |
| `/_auth/attendance/history` | `src/routes/_auth/attendance/history.tsx` | Attendance history. Admins see all; students see their own. |

---

## 5. Server vs Client Boundaries

### 5.1 Server-side
- **API Routes**: All `src/routes/api/**` files use `server.handlers` (GET/POST/PATCH/DELETE). These run exclusively on the server (Nitro).
- **Data Loaders**: `createServerFn` functions in `src/server/data/**` and `src/server/auth.ts`. Called via route `loader` functions. They run on the server and can use `createAdminClient()`.
- **Auth Callback**: `src/routes/auth/callback.ts` has only `server.handlers` — no client component.
- **Server Utilities**:
  - `src/server/supabase-context.ts` — `createAdminClient()` (service role), `createServerSupabase()`, `createRequestSupabase()`.
  - `src/server/request-auth.ts` — User/admin extraction from request.
  - `src/server/api-middleware.ts` — `withAdminApi()` guard.
  - `src/lib/supabase/env.ts` — Server-side env var access (`process.env`).

### 5.2 Client-side
- **Route Components**: All `.tsx` files under `src/routes/_auth/**` and public pages are React components rendered on the client (with SSR shell).
- **Client Utilities**:
  - `src/lib/supabase/client.ts` — `createClient()` singleton browser client using `createBrowserClient`.
  - `src/components/attendance/QRScanner.tsx` — Lazy-loaded (`lazy(() => import('...'))`) camera scanner.
  - `src/components/app-shell.tsx` — Navigation shell with client-side sign-out.
- **Client-side Navigation**: Uses `useNavigate`, `Link`, `useRouterState` from TanStack Router.

### 5.3 Data Loading Pattern
Routes use **deferred streaming** for progressive rendering:

```typescript
loader: () => ({ data: defer(getDashboardData()) }),
component: () => (
  <Suspense fallback={<StatsPending />}>
    <Await promise={data} fallback={<StatsPending />}>
      {(resolved) => <Stats stats={resolved.stats} />}
    </Await>
  </Suspense>
)
```

This allows the shell to render immediately while server data loads asynchronously.

---

## 6. Data Flow for Attendance, Events, Profiles

### 6.1 Events Data Flow
**Read**:
1. Route loader calls `getEventsData()` / `getEventDetailData()` / `getQrData()` (server functions).
2. Server function calls `requireActiveAuth()` to get auth context.
3. Uses `createAdminClient()` to query `events` table.
4. Non-admin queries are filtered to `status = 'active'`.
5. Results are cached (`cached('events:<role>', TTL.events, ...)`) for 5 seconds.

**Write**:
1. Admin submits event creation form (`POST /api/events`) or status update (`PATCH /api/events/$id`).
2. `withAdminApi()` middleware validates admin role and same-origin.
3. Admin client inserts/updates the `events` table.
4. Cache is invalidated: `invalidate('events')`, `invalidate('dashboard')`.

### 6.2 Attendance Data Flow
**Check-in (Student)**:
1. Student opens `/scan`, camera reads QR token.
2. `handleScan(rawToken)` extracts token via `extractQrToken()` and calls `POST /api/attendance/check-in`.
3. Server handler:
   - Validates same-origin (`isSameOrigin`).
   - Validates user session via request Supabase client.
   - Checks profile is active via admin client.
   - Looks up `attendance_sessions` by `qr_token` and `is_open = true`.
   - Validates event is `active` and within schedule window (`getSchedulePosition()`).
   - Checks for duplicate attendance.
   - Inserts attendance record with status `hadir` or `terlambat`.
   - Invalidates caches: `dashboard`, `history`, `events`.
4. Response returns `{ success: true, status, eventName }`.

**QR Session (Admin)**:
1. Admin opens event detail, clicks "Buka sesi absensi".
2. `POST /api/events/$id/session/open` creates an `attendance_sessions` row with a random `qr_token` (24 bytes base64url).
3. Admin is redirected to `/events/$id/qr` which lazy-loads `qrcode` to generate a QR image from `session.qr_token`.
4. Admin can close the session via `POST /api/events/$id/session/close`.
5. Session state is read via `GET /api/events/$id/session`.

### 6.3 Profiles Data Flow
**Read**:
- `getCurrentAuth()` reads `profiles` via admin client, cached per user for 10s.
- `getProfileData()` / `getOnboardingData()` read profile + auth for specific routes.

**Write**:
- `PATCH /api/profile`:
  - Validates same-origin, user session, and profile state.
  - Prevents editing if profile has generated NIM (`AUTH-`) unless `account_status === 'invited'`.
  - Updates `full_name`, `nim`, `division` (admin only).
  - Auto-activates invited accounts on successful update.
  - Invalidates `auth-profile:<user.id>` cache.

### 6.4 Members Data Flow
- **List**: `GET /_auth/members` → `getMembersData()` → `requireAdminAuth()` → admin client queries `profiles` (cached 30s).
- **Manual Create/Update**: `POST /api/members/manual` → validates input, creates Auth user if needed, upserts profile.
- **CSV Import**: `POST /api/members/import` → parses CSV (max 2MB, 500 rows), creates/updates users in parallel (8 workers).
- **Toggle Status**: `PATCH /api/members/$id` → toggles between `active` and `disabled`. Prevents disabling self or other admins.

---

## 7. Middleware and Security Layers

### 7.1 Global Request Middleware
**File**: `src/start.ts`

- **Security Headers** (added to all responses):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), microphone=()` (camera allowed for same-origin)
  - `Cross-Origin-Resource-Policy: same-origin`
  - `X-XSS-Protection: 0`
  - `Strict-Transport-Security` (production only, 2 years)
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; media-src 'self' blob:; frame-ancestors 'none'`
  - `Cache-Control: no-store` for `/api/*` paths.

- **API Method Validation**: Enforces allowed HTTP methods per endpoint:
  - GET: `/api/health`, `/api/events`, `/api/events/$id`, `/api/events/$id/session`
  - POST: `/api/events`, `/api/events/$id/session/open`, `/api/events/$id/session/close`, `/api/members/manual`, `/api/members/import`, `/api/attendance/check-in`
  - PATCH: `/api/events/$id`, `/api/members/$id`, `/api/profile`
  - DELETE: `/api/events/$id`
  - Returns `405 Method Not Allowed` with `Allow` header if method is not allowed.

### 7.2 API Middleware
**File**: `src/server/api-middleware.ts`

- `withAdminApi(request, options)`:
  1. Checks same-origin (unless `requireSameOrigin: false`).
  2. Extracts user and verifies admin role via `getRequestAdmin()`.
  3. Optionally parses JSON body.
  4. Returns `Response` on failure (403/400) or `AdminApiContext` on success.

### 7.3 Request Security
**File**: `src/lib/http/request-security.ts`

- `isSameOrigin(request)`: Checks `Origin` header matches the request URL origin. Used on all mutation endpoints (POST, PATCH, DELETE) to prevent CSRF. Relies on browser behavior where `fetch()` from JavaScript always sends `Origin`.

### 7.4 Cookie Handling
**File**: `src/lib/http/cookies.ts`

- `readCookies(request)`: Parses `Cookie` header into name/value pairs.
- `serializeCookie(name, value, options)`: Serializes with `Path=/`, `SameSite=Lax`, `HttpOnly`, `Secure` (in production), and optional `Domain`, `Max-Age`, `Priority`, `Partitioned`.
- Used by server Supabase clients to propagate session cookies.

### 7.5 Cache Layer
**File**: `src/lib/cache.ts`

- In-memory TTL cache with LRU eviction (max 500 entries).
- Inflight deduplication: concurrent requests with the same key share a single promise.
- TTLs:
  - Dashboard: 5s
  - Events: 5s
  - Members: 30s
  - Auth profile: 10s
  - History: 20s
- `invalidate(prefix)`: Bulk deletes keys by prefix (used after mutations).

### 7.6 Authorization Guards
- `requireActiveAuth()` — Ensures user is logged in, profile exists, and account is active.
- `requireAdminAuth()` — Ensures active auth + admin role.
- `isAdminRole(role)` — Checks for `admin` or `admin_bem`.
- `normalizeProfileAccess(profile)` — Safely extracts `role`, `account_status`, `is_active` from raw DB row. Rejects unknown status values.

### 7.7 Identity Validation
**File**: `src/lib/auth/identity.ts`

- `STUDENT_NIM_PATTERN`: `/^I\.[0-9]{7}$/`
- `STAFF_IDENTIFIER_PATTERN`: `/^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$/`
- `GENERATED_IDENTIFIER_PATTERN`: `/^AUTH-/i`
- Validates NIM/NIP formats and detects auto-generated placeholders.

---

## 8. Notable Design Patterns

### 8.1 Deep Module Pattern
Server code is organized into "deep modules":
- `src/server/auth.ts` — Auth snapshot and guards.
- `src/server/data.ts` — Re-exports from `src/server/data/*`.
- `src/server/data/dashboard.ts`, `events.ts`, `members.ts`, `attendance.ts`, `onboarding.ts` — Pure fetch functions with injected Supabase clients, exported as `createServerFn` handlers.

### 8.2 Admin Client vs User Client
- **User client** (`createServerSupabase`): Used for reading the session JWT. Subject to RLS.
- **Admin client** (`createAdminClient`): Uses `SUPABASE_SECRET_KEY` (service role). Bypasses RLS. Used for all data queries to avoid stale JWT propagation issues during/after login.

### 8.3 Self-Registration Flow
New users via Google OAuth:
1. No profile → auto-create with generated NIM (`AUTH-<uuid>`) and `account_status: 'invited'`.
2. Redirected to `/complete-profile` to enter real NIM/NIP.
3. On save, profile is updated and `account_status` flips to `active`.
4. Campus emails (`I.########@unida.ac.id`) bypass onboarding and go straight to `/mahasiswa`.

### 8.4 Cache Invalidation Strategy
After mutations, specific cache prefixes are invalidated:
- Event mutations → `invalidate('events')`, `invalidate('dashboard')`
- Attendance check-in → `invalidate('dashboard')`, `invalidate('history')`, `invalidate('events')`
- Profile update → `invalidate('auth-profile:<user.id>')`
- Member changes → `invalidate('members')`, `invalidate('dashboard')`

---

## 9. File Reference Summary

| Path | Role |
|---|---|
| `src/start.ts` | TanStack Start instance, request middleware, security headers |
| `src/router.tsx` | Router creation with preload/stale/gc tuning |
| `src/routeTree.gen.ts` | Auto-generated route tree |
| `src/routes/__root.tsx` | HTML shell, meta tags, global CSS |
| `src/routes/index.tsx` | Public landing page |
| `src/routes/login.tsx` | Google OAuth login page |
| `src/routes/auth/callback.ts` | Server-only OAuth callback handler |
| `src/routes/_auth.tsx` | Auth layout guard and AppShell wrapper |
| `src/routes/_auth/dashboard.tsx` | Admin dashboard |
| `src/routes/_auth/mahasiswa.tsx` | Student home |
| `src/routes/_auth/events/index.tsx` | Events listing |
| `src/routes/_auth/events/new.tsx` | Event creation |
| `src/routes/_auth/events/$id/index.tsx` | Event detail + actions |
| `src/routes/_auth/events/$id/qr.tsx` | QR display for session |
| `src/routes/_auth/members.tsx` | Member management |
| `src/routes/_auth/scan.tsx` | QR scanner |
| `src/routes/_auth/profile.tsx` | Profile edit |
| `src/routes/_auth/attendance/history.tsx` | Attendance history |
| `src/routes/complete-profile.tsx` | Onboarding form |
| `src/routes/waiting-approval.tsx` | Awaiting activation page |
| `src/routes/account-disabled.tsx` | Disabled account page |
| `src/server/auth.ts` | Auth snapshot, guards (`getCurrentAuth`, `requireActiveAuth`, `requireAdminAuth`) |
| `src/server/auth-guard.ts` | Re-export of guards for backward compat |
| `src/server/supabase-context.ts` | Admin, server, and request Supabase clients |
| `src/server/request-auth.ts` | Request user/admin extraction, cookie-aware responses |
| `src/server/api-middleware.ts` | `withAdminApi` middleware for protected API routes |
| `src/server/data.ts` | Barrel export for data loaders |
| `src/server/data/dashboard.ts` | Dashboard data loader |
| `src/server/data/events.ts` | Events list/detail/QR data loaders |
| `src/server/data/members.ts` | Members data loader |
| `src/server/data/attendance.ts` | Attendance history loader |
| `src/server/data/onboarding.ts` | Onboarding, student home, profile data loaders |
| `src/lib/supabase/client.ts` | Browser Supabase client singleton |
| `src/lib/supabase/env.ts` | Supabase URL/key env helpers (client + server) |
| `src/lib/auth/identity.ts` | NIM/NIP validation, generated identifier pattern |
| `src/lib/auth/roles.ts` | Admin role checks |
| `src/lib/auth/profile-access.ts` | Safe profile field normalization |
| `src/lib/auth/account-status.ts` | Mutable account status types |
| `src/lib/cache.ts` | In-memory TTL cache with inflight dedup |
| `src/lib/events/schedule.ts` | Event schedule position calculations |
| `src/lib/events/time-utils.ts` | Time string to minutes conversion |
| `src/lib/http/cookies.ts` | Cookie read/serialize helpers |
| `src/lib/http/navigation.ts` | Safe next-path and QR token extraction |
| `src/lib/http/request-security.ts` | Same-origin (CSRF) check |
| `src/components/app-shell.tsx` | Dashboard layout with sidebar, nav, sign-out |
| `src/components/attendance/QRScanner.tsx` | Camera/QR scanner component |
| `src/components/member-import-form.tsx` | CSV import + manual member creation form |
| `src/routes/api/health.ts` | Health check endpoint |
| `src/routes/api/events.ts` | Events CRUD (admin) |
| `src/routes/api/events/$id.ts` | Single event GET/PATCH/DELETE (admin) |
| `src/routes/api/events/$id/session.ts` | Get active session with attendance |
| `src/routes/api/events/$id/session/open.ts` | Open attendance session (admin) |
| `src/routes/api/events/$id/session/close.ts` | Close attendance session (admin) |
| `src/routes/api/attendance/check-in.ts` | Student check-in endpoint |
| `src/routes/api/profile.ts` | Profile update endpoint |
| `src/routes/api/members/manual.ts` | Manual member creation (admin) |
| `src/routes/api/members/import.ts` | CSV member import (admin) |
| `src/routes/api/members/$id.ts` | Toggle member active/disabled (admin) |
