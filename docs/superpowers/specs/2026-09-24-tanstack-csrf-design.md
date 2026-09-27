# TanStack Start CSRF Middleware Design

**Date:** 2026-09-24  
**Status:** Approved  
**Scope:** Protect TanStack Start server functions with the framework-provided CSRF middleware.

## Problem

`src/start.ts` registers a custom `requestMiddleware` array. When an application supplies that array, TanStack Start does not automatically add its default server-function CSRF middleware. The current middleware adds API method restrictions and security headers, but it does not protect requests handled by `createServerFn`.

The existing REST API mutations already perform same-origin validation. This change closes the remaining server-function request path and prevents future server functions from being added without CSRF protection.

## Design

Use TanStack Start's `createCsrfMiddleware` directly.

- Create one middleware with a filter that selects only `handlerType === 'serverFn'`.
- Keep the current request middleware unchanged.
- Register the current security-header middleware before the CSRF middleware so a CSRF rejection passes through the existing response-header wrapper.
- Use the middleware defaults. It accepts same-origin `Sec-Fetch-Site`, checks `Origin` when present, falls back to `Referer`, and rejects requests without an origin check.
- Do not disable `disableCsrfMiddlewareWarning`; the warning should disappear because real protection is registered.

## Files

- `src/start.ts`: import and register the official CSRF middleware.
- `scripts/test-auth.mjs`: add regression assertions for the server-function filter and middleware registration.

No REST route, database, authentication, or deployment configuration changes are required.

## Verification

1. Add the regression assertions before implementation and confirm they fail against the current source.
2. Run `bun run test:auth` after the change.
3. Run `bun run check` for regression tests, lint, typecheck, and build.
4. Start the development server, invoke a server function, and confirm the missing-CSRF warning is absent.
5. Confirm `git diff --check` passes.

## Non-Goals

- Replacing framework CSRF behavior with custom `Origin` or `Referer` logic.
- Changing the existing REST API same-origin checks.
- Adding CSRF configuration for edge cases that the installed TanStack Start middleware already handles.
