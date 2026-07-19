# AGENTS.md

## Cursor Cloud specific instructions

This is a pnpm + Turborepo monorepo for a multi-store off-licence platform. Standard setup/run/lint/test commands live in `README.md` and each package's `package.json`. Node 22+ and pnpm 10+ are required.

### Services
- `apps/api` (`@offlicence/api`): Next.js 16 App Router — REST API **and** owner/manager web dashboard. Runs on `http://localhost:3000` via `pnpm dev:api`. This is the main runnable/testable service.
- `apps/mobile` (`@offlicence/mobile`): Expo (React Native) app — `pnpm dev:mobile`. Talks to the API via `EXPO_PUBLIC_API_URL`.
- `packages/db` (`@offlicence/db`): Drizzle schema + migrations + seed. `packages/shared`: shared Zod contracts. Both are internal libraries.

### Environment / database (non-obvious)
- The only required external service is **PostgreSQL**. A local instance is used in dev; connect string in dev: `postgresql://offlicence:offlicence@127.0.0.1:5432/offlicence`. On a fresh Cloud VM, start it with `sudo pg_ctlcluster 16 main start` (Postgres is installed but not auto-started; the `offlicence` role/db persist in the VM snapshot).
- Env files are git-ignored and must exist locally: `apps/api/.env.local` (needs `DATABASE_URL` + `BETTER_AUTH_SECRET`) and `packages/db/.env` (needs `DATABASE_URL`).
- `drizzle-kit` (used by `pnpm db:migrate`) auto-loads `packages/db/.env`. **But `pnpm db:seed` runs via `tsx` which does NOT auto-load `.env`** — you must pass the var inline, e.g. `DATABASE_URL=postgresql://offlicence:offlicence@127.0.0.1:5432/offlicence pnpm db:seed`, otherwise it throws `DATABASE_URL is required`.
- Order: `pnpm db:migrate` then `pnpm db:seed`. The seed only attaches an **owner** membership to existing users, so the flow is: sign up first (via `/login` or `POST /api/auth/sign-up/email`), then re-run `pnpm db:seed` to make that user the org owner.

### Lint / typecheck notes
- `pnpm typecheck` passes across all packages. `pnpm lint` currently reports pre-existing `react-hooks/set-state-in-effect` errors in `apps/api` dashboard pages — these are unrelated to environment setup.
- Only `apps/api` has real ESLint; other packages' `lint` scripts are no-op stubs and there is no test framework configured in the repo.

### Useful routes
- `GET /api/health` (liveness), `GET /api/me` (session + membership), `/login`, `/dashboard`, `/api/auth/*` (Better Auth).
