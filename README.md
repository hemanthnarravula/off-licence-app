# Off-licence App

Multi-store UK off-licence stack: Expo mobile + Next.js API/dashboard on Vercel + Neon Postgres.

See [PLAN.md](./PLAN.md) for the full product and technical plan.

## Monorepo

```
apps/mobile   Expo Router (staff / customer / owner light)
apps/api      Next.js App Router (REST API + owner dashboard)
packages/db   Drizzle schema + client
packages/shared  Zod contracts / shared enums
```

## Prerequisites

- Node 22+
- pnpm 10+

## Setup

```bash
pnpm install
cp .env.example apps/api/.env.local
```

Fill `DATABASE_URL` when Neon is linked (migrations not run in this scaffold step).

## Develop

```bash
# API + dashboard (http://localhost:3000)
pnpm dev:api

# Expo
pnpm dev:mobile
```

Useful endpoints:

- `GET /api/health` — liveness JSON
- `/dashboard` — owner dashboard stub

## Status

Bare minimum scaffold: monorepo wiring, shared types, draft Drizzle schema, API health route, dashboard/mobile stubs. Auth, DB migrations, and domain APIs come next.
