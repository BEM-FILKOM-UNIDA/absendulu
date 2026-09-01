# CI/CD

Absendulu uses GitHub Actions for validation and controlled deployment. TanStack Start runs on Vite/Nitro, Vercel remains the deployment target, and Supabase remains the database/Auth/Realtime provider.

## Release flow

1. Create a feature branch from `develop`.
2. Open a pull request into `develop`.
3. `CI` runs `bun install --frozen-lockfile` and `bun run check` with non-production placeholder Supabase values.
4. Merge only after CI passes and the PR is reviewed.
5. For a database change, run **Actions → Apply Supabase migrations → Run workflow** from `develop`, type `APPLY`, verify migration history, and wait for the protected `production` environment approval.
6. After the migration succeeds, run **Actions → Deploy production → Run workflow** from `develop`, type `DEPLOY`, and wait for the protected `production` environment approval. The workflow checks out that exact commit, runs the full `bun run check` gate, builds the Vite/Nitro artifact, deploys it, and smoke-tests the health endpoint, headers, protected redirects, and anonymous mutation rejection.

Both production workflows are manual and restricted to `develop`; a feature branch cannot apply schema changes or deploy directly. Before applying database migrations, verify migration history with `supabase migration list --db-url "$SUPABASE_DB_URL"`. The migration workflow includes a dry-run, but it cannot repair a remote history mismatch automatically.

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

Link the repository/project in Vercel and ensure the production project ID matches `VERCEL_PROJECT_ID`. The deploy workflow uses the Vercel CLI to pull production variables, build the TanStack Start/Vite artifact, and deploy the prebuilt output:

```text
vercel pull --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Keep the repository's Vercel project settings aligned with the Vite/Nitro build output.

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
bun install --frozen-lockfile
bun run check
```

For a production-like local check:

```bash
bun run build
bun run start
```
