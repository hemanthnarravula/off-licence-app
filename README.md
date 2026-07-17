# Off-licence App

Multi-store UK off-licence mobile app (Expo) with a Next.js API and Postgres.

See [PLAN.md](./PLAN.md) for the full product and technical plan.

## Stack

- **Mobile:** Expo (iOS + Android) — `apps/mobile`
- **Backend:** Next.js App Router API — `apps/api`
- **Database:** Postgres + Drizzle — `packages/db`
- **Shared types:** Zod — `packages/shared`
- **Auth:** Better Auth

## Prerequisites

- Node.js 22+ (`nvm use` reads `.nvmrc`)
- pnpm 9+
- Postgres 15+ (Homebrew `postgresql@15` works)
- Optional for product photos: Vercel Blob token (`BLOB_READ_WRITE_TOKEN`)
- Optional for label extraction: Vercel AI Gateway (`AI_GATEWAY_API_KEY`, or `vercel env pull` for OIDC)

## Local setup

```bash
nvm use
cp .env.example .env

# Start Postgres if needed, then create the DB once:
#   brew services start postgresql@15
#   createdb off_licence

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Run locally

```bash
# API on http://localhost:3000
pnpm dev:api

# Expo (separate terminal)
pnpm dev:mobile
```

Or run both: `pnpm dev`

### Quick checks

- Health: http://localhost:3000/api/health
- Sample barcode: http://localhost:3000/api/products/by-barcode?barcode=5012345678900

Seed barcodes: `5012345678900` … `5012345678904`
