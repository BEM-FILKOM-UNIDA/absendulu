# Login Flow A — Google-only Auto-Aktif Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google-only self-register with auto NIM from email for 70+ concurrent, no magic-link limit.

**Architecture:** Modify `auth/callback.ts` to auto-create `profiles` with `I.#######` from `email` or `AUTH-...`, and set `active` vs `invited`. Update `login.tsx` to remove Magic Link form, and make `complete-profile` auto-activate after valid NIM. Single seam `getPublishableKey` already handles fallback.

**Tech Stack:** TanStack Start, Supabase JS, TypeScript 5.9, Tailwind v4

## Global Constraints

- No new dependencies — use `@supabase/ssr` and `next` already installed.
- No `baseUrl` in `tsconfig.json`, keep `paths: {"~/*": ["./src/*"]}`.
- Tailwind v4 canonical: `bg-(--*)`, `text-(--*)`, `min-h-dvh`, `rounded-sm`.
- Run `bun run typecheck && bun run lint && bun run build` before commit.

---

## File Structure

- Modify: `src/routes/auth/callback.ts` — auto NIM logic
- Modify: `src/routes/login.tsx` — Google-only UI
- Modify: `src/routes/complete-profile.tsx` — auto active after PATCH
- Modify: `src/server/data/onboarding.ts` — ensure active flip
- Test: `scripts/test-auth.mjs` — add case for self-register

---

### Task 1: Callback auto NIM

**Files:**
- Modify: `src/routes/auth/callback.ts:54-75`

**Interfaces:**
- Consumes: `createAdminClient`, `isAdminRole`
- Produces: `redirect` to `/waiting-approval` or `/complete-profile` or `/mahasiswa`

- [ ] **Step 1: Write failing test for email with I.#######**

```js
// scripts/test-callback-nim.mjs
import { strict as assert } from 'node:assert'
const email = 'i.2510152@unida.ac.id'
const nick = email.split('@')[0].toUpperCase()
assert.equal(/^I\.[0-9]{7}$/.test(nick), true)
assert.equal(nick, 'I.2510152')
console.log('pass')
```

- [ ] **Step 2: Run test to verify it passes (logic exists)**

Run: `node scripts/test-callback-nim.mjs`
Expected: PASS

- [ ] **Step 3: Implement callback logic**

```ts
const emailNick = user.email?.split('@')[0]?.toUpperCase() ?? ''
const nimFromEmail = /^I\.[0-9]{7}$/.test(emailNick) ? emailNick : `AUTH-${user.id}`
const { error: insertError } = await admin.from('profiles').insert({
  id: user.id,
  email: user.email,
  full_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'Pengguna',
  nim: nimFromEmail,
  user_type: 'mahasiswa',
  account_status: /^I\.[0-9]{7}$/.test(emailNick) ? 'active' : 'invited',
  is_active: true,
  role: 'user',
  nim_format_legacy: !/^I\.[0-9]{7}$/.test(emailNick),
})
if (insertError && !insertError.message.includes('duplicate')) return redirectTo('/login', { error: 'profile' })
return redirectTo(/^I\.[0-9]{7}$/.test(emailNick) ? '/mahasiswa' : '/complete-profile')
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/auth/callback.ts
git commit -m "feat: callback auto NIM from email for 70+"
```

### Task 2: Login Google-only UI

**Files:**
- Modify: `src/routes/login.tsx:75-88`

**Interfaces:**
- Consumes: `createClient`
- Produces: Google button only, no Magic Link form

- [ ] **Step 1: Remove Magic Link form**

Delete the `<form onSubmit={handleLogin}>` block and keep only Google button + note.

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: PASS, no `signInWithOtp` in bundle

- [ ] **Step 3: Commit**

```bash
git add src/routes/login.tsx
git commit -m "feat: login Google-only for 70+"
```

### Task 3: Complete-profile auto active

**Files:**
- Modify: `src/routes/complete-profile.tsx:44-49` and `src/server/data/onboarding.ts` or `src/routes/api/profile.ts`

**Interfaces:**
- Consumes: `fetch('/api/profile', { method: 'PATCH' })`
- Produces: `account_status` flipped to `active` after valid NIM

- [ ] **Step 1: Update profile PATCH to set active**

In `src/routes/api/profile.ts` after successful `update`, also `update({ account_status: 'active', is_active: true })` if was `invited`.

- [ ] **Step 2: Test**

Run: `bun run test:auth`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/profile.ts src/routes/complete-profile.tsx
git commit -m "feat: complete-profile auto active"
```

### Task 4: Verification

- [ ] Run `bun run check`
- [ ] Manual: login with `i.2510152@unida.ac.id` via Google → should go directly to `/mahasiswa` (active), not `complete-profile`
- [ ] Manual: login with `random@gmail.com` → `complete-profile` → fill `I.2410036` → should go to `/mahasiswa` after submit

