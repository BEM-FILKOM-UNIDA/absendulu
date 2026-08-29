# CI/CD

Absendulu uses GitHub Actions for validation and controlled deployment. Vercel remains the Next.js runtime and Supabase remains the database/Auth/Realtime provider.

## Release flow

1. Create a feature branch from `develop`.
2. Open a pull request into `develop`.
3. `CI` runs `npm ci` and `npm run check` with non-production placeholder Supabase values.
4. Merge only after CI passes and the PR is reviewed.
5. For a database change, run **Actions → Apply Supabase migrations → Run workflow**, type `APPLY`, and wait for the protected `production` environment approval.
6. Push/merge to `develop` triggers **Deploy production**, which checks out that exact commit, runs the full `npm run check` gate, pulls Vercel production environment variables, builds a prebuilt artifact, deploys it, and smoke-tests `/` and `/login`.

The production deploy and migration workflows are restricted to `develop`, including manual runs. This prevents a feature branch from deploying application code or applying schema changes directly to production.

## GitHub configuration

Create a GitHub Environment named `production` and enable required reviewers if the repository plan supports environment protection. Add these secrets:

| Secret | Used by | Value |
| --- | --- | --- |
| `VERCEL_TOKEN` | Deploy production | Vercel access token with access to this project |
| `VERCEL_ORG_ID` | Deploy production | Vercel team/org ID, or account ID for a personal project |
| `VERCEL_PROJECT_ID` | Deploy production | Vercel project ID |
| `PRODUCTION_URL` | Deploy production | Full public URL, e.g. `https://absendulu.example.com` |
| `SUPABASE_DB_URL` | Apply Supabase migrations | Production Postgres connection URL; keep it environment-protected |

Set these variables in the Vercel **Production** environment, not in GitHub Actions:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

`SUPABASE_SERVICE_ROLE_KEY` must never be used in client code, GitHub logs, or public repository files. The CI workflow uses placeholders and cannot access production data.

## Vercel setup

Link the repository/project in Vercel and ensure the production project ID matches `VERCEL_PROJECT_ID`. The deploy workflow uses the Vercel CLI to:

```text
vercel pull --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

The Vercel CLI is pinned in the workflow. Keep the repository's normal Vercel project settings for the framework preset and build output.

## Supabase migration setup

The migration workflow expects all production migrations to be committed under `supabase/migrations/` and the database URL to be stored only as the protected `SUPABASE_DB_URL` secret. It does not use the service-role key.

Before applying a migration:

- review the SQL and its impact on RLS, grants, indexes, and existing rows;
- confirm the migration is backward-compatible with the currently deployed app when possible;
- verify Supabase backups/point-in-time recovery are available for the project;
- run the workflow with the `APPLY` confirmation;
- check the workflow log and then smoke-test login, profile update, QR session, and check-in.

If a deployment fails, use Vercel's deployment rollback/previous deployment controls. Do not reset the production database or delete migration history to recover an application deployment.

## Local equivalent

Run the same application gate before opening a PR:

```bash
npm ci
npm run check
```

For a production-like local check:

```bash
npm run build
npm run start
```
