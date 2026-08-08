# EquiScore

EquiScore is an alternative-to-credit-scoring platform. A consumer builds a
**verified, evidence-backed Trust Profile** — from identity documents and bank
statements — and shares it with decision-makers (landlords, lenders, utility and
telecom providers). The score is deterministic, explainable, and deliberately
rewards **evidence**, not the absence of it.

This is a Turborepo monorepo. One build is deployed to several hosts, each
behaving differently by site mode (see [Deployment](#deployment) and
[Architecture](docs/ARCHITECTURE.md)).

## What's in here

```
apps/
  api/      NestJS 10 REST API (Postgres + Prisma). Scoring engine, insights
            engine, auth, banking/statement ingestion, sharing, assessments.
  web/      Next.js 14 app. Marketing site + consumer dashboard + admin portal
            + partner workspace (all one build, routed by host/mode).
packages/
  database/ Prisma schema + client (single source of truth for the data model).
  shared/   Zod schemas + the deterministic scoring engine (scorecards, reason
            codes). Shared by web and api so scoring stays in one place.
docs/       Architecture, deployment, and product roadmaps. Read these.
```

## Quick start (local)

**Prerequisites:** Node 20+, Docker (for Postgres + Redis), npm 11+.

```powershell
# Windows (PowerShell) — one-time setup
.\scripts\setup.ps1

# Start everything (Postgres/Redis via docker-compose, then api + web)
.\scripts\dev.ps1
```

Manual setup:

```bash
npm install
docker compose up -d postgres redis        # Postgres + Redis
cp .env.example .env                       # then fill in DATABASE_URL + Clerk keys
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npx prisma generate   --schema packages/database/prisma/schema.prisma
npx turbo dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- Prisma Studio: `npm run db:studio`

## Common commands

```bash
npx turbo build          # build all packages
npx turbo type-check     # type-check all packages (run before committing)
npx turbo dev            # run api + web in watch mode
npm run db:migrate       # prisma migrate dev (create/apply migrations)
npm run db:push          # prisma db push (prototype schema changes)
npm run format           # prettier across the repo
```

> There is no test suite yet. `turbo type-check` is the safety net — run it
> after non-trivial changes.

## Deployment

One build, multiple hosts. The host's `NEXT_PUBLIC_SITE_MODE` selects behaviour:

| Host | Mode | Auth | Who can sign up |
|---|---|---|---|
| `equiscore.app` | `open` | Clerk (prod instance) | Anyone |
| `staged.equiscore.app` | `open` | Clerk (prod instance) | Anyone — preview of production |
| `dev.equiscore.app` | `invitation` | Clerk (dev instance) | Invited emails only |
| `admin.equiscore.app` | (host-routed to `/admin`) | Clerk + InternalAdmin | Internal admins |
| `partners.equiscore.app` | (host-routed to `/workspace`) | Clerk + org membership | Org members |

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full env matrix and the
**Clerk Dashboard settings** that are not in code (including the email
verification strategy fix).

## Architecture

The product has several load-bearing invariants. **Read
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** before changing auth, site mode
logic, the dev gate, the evidence path, or the scoring engine.

## Product roadmaps

- [docs/CONSUMER_WORKSPACE_ROADMAP.md](docs/CONSUMER_WORKSPACE_ROADMAP.md) — the
  consumer dashboard (what's built, what's deferred).
- [docs/COMPASS_ROADMAP.md](docs/COMPASS_ROADMAP.md) — the financial-coaching
  layer (gated behind `User.compassEnabled`).

## Working in this repo (for humans and AI agents)

See [AGENTS.md](AGENTS.md) for the rules that keep this codebase coherent — in
particular the invariants that must not be silently changed.
