# Absendulu

Absensi acara organisasi FILKOM UNIDA berbasis Next.js dan Supabase. Mahasiswa masuk dengan Magic Link atau Google OAuth, lalu melakukan check-in melalui QR code acara.

## CI/CD

The repository uses GitHub Actions for PR validation, controlled Vercel production deploys, and manually approved Supabase migrations. See [`docs/ci-cd.md`](docs/ci-cd.md) for the required secrets and release flow.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Create `.env.local` with these server/runtime variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser or committed to Git. Only the two `NEXT_PUBLIC_*` values may be used by client code.

## Supabase setup

1. Create or select the Supabase project.
2. Apply the migrations in `supabase/migrations/` using the linked Supabase CLI project:

   ```bash
   supabase db push
   ```

3. Configure Auth providers in Supabase. Enable Email/Magic Link and, if used, Google OAuth.
4. Add the deployed callback URL to Supabase Auth URL Configuration:
   `https://<production-domain>/auth/callback`
5. Add the same callback URL to the Google OAuth client, together with the Supabase provider callback URL shown in the Supabase dashboard.
6. Confirm the production project has the required `profiles`, `events`, `attendance_sessions`, and `attendances` tables and that the production hardening migration is applied.

Events are intentionally readable as public event metadata. Session records, QR tokens, profiles, and attendance details remain protected by RLS and server-side authorization.

## Pre-deploy validation

Run the full local gate before deploying:

```bash
npm run check
```

The command runs ESLint, TypeScript checking, and the production build. For a production-like local smoke test:

```bash
npm run build
npm run start
```

Then verify:

- `/` and `/login` load at mobile widths (320px and 375px) without horizontal overflow.
- Protected pages redirect unauthenticated users to `/login`.
- `GET /api/events` returns only event metadata.
- Mutating/admin endpoints reject unauthenticated or non-admin requests.
- Magic Link and Google callbacks return to `/dashboard` for active accounts.
- An active event can open one QR session, accept one check-in per user, update the live counter, and close the session.
- The production response includes `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.

## Deploy to Vercel

1. Import the repository and the intended branch into Vercel.
2. Set all three environment variables for the Production environment. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Use the default Next.js build settings; the build command is `npm run build`.
4. Deploy only after `npm run check` passes and the Supabase migrations are applied.
5. After deployment, open the production URL and perform the smoke checks above, especially login, QR check-in, and session close.

Do not deploy `.env.local`, service-role keys, or local Supabase `.temp` files.

## Useful commands

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript without emitting files
npm run build      # Production build
npm run check      # lint + typecheck + build
```
