# Data Layer Deepening — Design

**Date:** 2026-09-02  
**Status:** Approved for implementation  
**Decision:** Approach A — full deepening sweep

## Goal

Turn the shallow `src/server/data.ts` god module into a deep data layer with small interfaces, shared auth seam, and consolidated Supabase client wiring. Reduce duplication across API handlers and server functions, and prepare the codebase for reliable role-based expansion.

## Architecture

The data layer is split by domain: events, attendance/history, members, dashboard, onboarding, and student home. Each domain module owns its server functions and query construction. A shared auth seam validates the active session and exposes `isAdmin`. All Supabase client creation and cookie serialization is centralized in `src/server/supabase-context.ts`, so auth, request-auth, and API routes all use the same cookie contract.

## Module Responsibilities

### `src/server/supabase-context.ts`

Owns Supabase client creation and cookie handling for both server functions and request-scoped API handlers.  
Provides:
- `createAdminClient()` — service-role client
- `createServerSupabase()` — anon client for `getCurrentAuth`, reads cookies from the current request via `getRequest()`
- `createRequestSupabase(request, responseCookies)` — anon client for raw API requests
- `readCookies(request)` / `serializeCookie(...)` — shared utilities

### `src/server/auth.ts`

Reads the current auth snapshot from the incoming request.  
Provides:
- `getCurrentAuth()` — returns `AuthSnapshot`
- `AuthSnapshot` / `AuthProfile` types

### `src/server/data.ts`

No longer exports domain functions. Becomes a thin barrel that re-exports from domain modules for backward compatibility during migration, then is removed once all imports are updated.

### `src/server/data/events.ts`

Event-related server functions:
- `getEventsData()`
- `getEventDetailData({ id })`
- `getQrData({ id })`

Each function calls the shared auth seam, builds its query, and returns typed response data.

### `src/server/data/members.ts`

Member-related server functions:
- `getMembersData()`

### `src/server/data/attendance.ts`

Attendance-related server functions:
- `getHistoryData()`

### `src/server/data/dashboard.ts`

Dashboard server function:
- `getDashboardData()`

### `src/server/data/onboarding.ts`

Onboarding-related server functions:
- `getOnboardingData()`
- `getStudentHomeData()`

## Auth Seam

All domain modules use the same active-auth guard instead of reimplementing `requireActiveAuth()`:
- Returns `{ user, profile }` or throws `Unauthorized`
- `isAdminRole(profile.role)` is computed at the seam, not inside every query builder

## API Handler Middleware

A `withAdminApi(request)` wrapper in `src/server/api-middleware.ts` provides:
- Same-origin guard
- Admin auth
- Typed body parse
- Cookie response helper

## Time Utilities Consolidation

`src/lib/events/time-utils.ts` owns:
- `toMinutes(time)`
- `isValidEventTimeRange(start, end)`

Both `src/lib/events/validation.ts` and `src/lib/events/schedule.ts` import from this single seam.

## Migration Order

1. Create `supabase-context.ts` and update `auth.ts`, `request-auth.ts`, and `check-in.ts` to use it
2. Create `src/server/data/` package with domain modules
3. Update all route imports from `~/server/data` to `~/server/data/<domain>`
4. Replace `data.ts` barrel exports with re-exports, then remove the file once no imports remain
5. Extract `withAdminApi` wrapper and update API routes
6. Extract `time-utils.ts` and update `validation.ts` and `schedule.ts`

## Success Criteria

- `src/server/data.ts` no longer contains domain logic
- All route loaders import from domain modules, not the old god file
- `createServerClient` cookie wiring exists in exactly one place
- Every API route uses `withAdminApi` or equivalent shared wrapper
- `toMinutes` and `isValidEventTimeRange` are each defined once
- `npm run build` passes
- Local production smoke test confirms `/dashboard` and `/mahasiswa` still return `200` for authenticated users
