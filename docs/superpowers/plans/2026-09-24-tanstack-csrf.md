# TanStack Start CSRF Middleware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect every TanStack Start server function with the framework-provided CSRF middleware while preserving existing security headers and REST API validation.

**Architecture:** Keep the existing request middleware as the outer layer, then add `createCsrfMiddleware` filtered to `handlerType === 'serverFn'`. The installed TanStack Start implementation owns browser-origin validation; this project only registers the middleware and protects the registration with a regression assertion.

**Tech Stack:** TypeScript 5.9, TanStack Start 1.168.49, Bun 1.3, Node assert-based regression scripts.

## Global Constraints

- Use `createCsrfMiddleware` from the installed `@tanstack/react-start` package.
- Do not add a dependency or custom CSRF implementation.
- Do not set `disableCsrfMiddlewareWarning`.
- Do not change REST API same-origin checks.
- Preserve security headers on rejected server-function requests by registering the existing request middleware before the CSRF middleware.
- Do not add code comments.

---

### Task 1: Register and regression-test server-function CSRF protection

**Files:**
- Modify: `scripts/test-auth.mjs:7-67`
- Modify: `src/start.ts:1-69`

**Interfaces:**
- Consumes: `createCsrfMiddleware`, `createMiddleware`, and `createStart` from `@tanstack/react-start`.
- Produces: `csrfMiddleware`, a request middleware that validates only requests whose `handlerType` is `serverFn`.

- [ ] **Step 1: Write the failing registration test**

In `scripts/test-auth.mjs`, read `src/start.ts` and assert that the official middleware is imported, filtered to server functions, and registered after the security-header middleware:

```js
const startPath = path.join(directory, '..', 'src', 'start.ts')
const startSource = fs.readFileSync(startPath, 'utf8')

assert.match(startSource, /createCsrfMiddleware/)
assert.match(startSource, /filter:\s*\(ctx\)\s*=>\s*ctx\.handlerType\s*===\s*['"]serverFn['"]/)
assert.match(startSource, /requestMiddleware:\s*\[requestMiddleware,\s*csrfMiddleware\]/)
```

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
bun run test:auth
```

Expected: FAIL on the missing `createCsrfMiddleware` registration.

- [ ] **Step 3: Register the official CSRF middleware**

Update the import in `src/start.ts`:

```ts
import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
```

Create the middleware before `startInstance`:

```ts
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})
```

Register it after the existing middleware:

```ts
export const startInstance = createStart(() => ({
  requestMiddleware: [requestMiddleware, csrfMiddleware],
}))
```

- [ ] **Step 4: Run the focused regression test and verify GREEN**

Run:

```bash
bun run test:auth
```

Expected: `auth regression: PASS` with CSRF registration included in the checked behavior.

- [ ] **Step 5: Run the full project gate**

Run:

```bash
bun run check
git diff --check
```

Expected: schedule/auth regressions, ESLint, TypeScript, client build, SSR build, and Nitro build all pass; `git diff --check` prints no output.

- [ ] **Step 6: Reproduce the development warning path**

Start the development server, request a synthetic `/_serverFn/regression-check` path so TanStack classifies it as a server-function request, stop the server, and inspect its log. The response status is irrelevant; only the warning matters:

```bash
log_file="$(mktemp)"
bun run dev >"$log_file" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true; rm -f "$log_file"' EXIT
for attempt in {1..30}; do
  curl --silent --output /dev/null http://localhost:3000/_serverFn/regression-check && break
  sleep 1
done
kill "$server_pid" 2>/dev/null || true
wait "$server_pid" 2>/dev/null || true
! grep -q "server functions are not protected by the CSRF middleware" "$log_file"
```

Expected: exit 0 because the warning is absent.

- [ ] **Step 7: Review and commit**

Run:

```bash
git status --short
git diff -- scripts/test-auth.mjs src/start.ts
git log --oneline -10
git add scripts/test-auth.mjs src/start.ts
git commit -m "fix: protect server functions from CSRF"
```

Expected: only the regression test and middleware registration are committed.
