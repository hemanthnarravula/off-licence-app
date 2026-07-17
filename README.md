# Off-licence App

Multi-store UK off-licence stack: Expo mobile + Next.js API/dashboard on Vercel + Neon Postgres.

See [PLAN.md](./PLAN.md) for the full product and technical plan.

## Monorepo

```
apps/mobile   Expo Router (staff / customer / owner light)
apps/api      Next.js App Router (REST API + owner dashboard)
packages/db   Drizzle schema + migrations + seed
packages/shared  Zod contracts / shared enums
```

## Prerequisites

- Node 22+
- pnpm 10+
- Postgres (local for now; Neon via Vercel when linked)

## Setup

```bash
pnpm install
cp .env.example apps/api/.env.local
# set DATABASE_URL + BETTER_AUTH_SECRET in apps/api/.env.local
# also set packages/db/.env DATABASE_URL for migrate/seed

pnpm db:generate   # after schema changes
pnpm db:migrate
pnpm db:seed
```

Local Postgres example:

```bash
DATABASE_URL=postgresql://offlicence:offlicence@127.0.0.1:5432/offlicence
```

## Develop

```bash
pnpm dev:api      # http://localhost:3000
pnpm dev:mobile
```

Useful routes:

- `GET /api/health` — liveness
- `/login` — email/password (Better Auth)
- `/dashboard` — owner dashboard (session required)
- `GET /api/me` — session + membership
- `/api/auth/*` — Better Auth handler

After first sign-up, re-run `pnpm db:seed` (or attach membership manually) so the user becomes org **owner**.

## Status

Scaffold + migrations + Better Auth + authz + **dashboard Products CRUD / CSV import / Blob image endpoints**. Fulfil board and staff scan flows next.

Products import template: `apps/api/public/sample-products.csv`.
Image uploads require `BLOB_READ_WRITE_TOKEN` (Vercel Blob).
