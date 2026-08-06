# AGENTS.md — guidance for AI agents and contributors working in this repo

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before non-trivial changes. A
short version of the rules that matter most:

## Non-negotiable invariants

1. **Scoring is deterministic and evidence-anchored.** The scoring logic lives in
   `packages/shared/src/scoring/`. Never reimplement it inline in the API or web.
   Never let a positive signal fire without a `hasBankData` / `hasIncomeData`
   guard — a zeroed feature is "no evidence", not "good".
2. **One build, many sites.** Behaviour differs by `NEXT_PUBLIC_SITE_MODE`
   (`public` / `open` / `invitation`) and host. Do not split into separate apps.
   Marketing CTAs key on `showWaitlist`; auth surfaces on `hasAuth` — see
   `apps/web/src/lib/site.ts`.
3. **Dev (`invitation`) is invite-only.** `/sign-up` and the dashboard gate only
   on the invitation site; they are no-ops on `open`/`public`. The dev gate
   checks access **client-side after auth**, not in edge middleware.
4. **Statements, not live bank connect, are the consumer evidence path.** "Get
   started" CTAs say "upload a statement". Live open-banking API code is dormant
   — do not rewire it into consumer UI without a product decision.
5. **Goals (consumer) are removed.** The `ConsumerGoal` table + migrations are
   intentionally kept (existing rental share links render from them). Don't drop
   the table; don't re-add the UI without a decision. (Compass `SavingsGoal` is a
   *different* feature — leave it alone.)

## Things that are NOT code (fix in the relevant console, not here)

- **Duplicate Clerk verification email** → Clerk Dashboard → Email verification
  strategy (set exactly one). The components are bare on purpose.
- **Clerk Allowed Origins / redirect URLs** → Clerk Dashboard, per instance.

## Working conventions

- **Run `npx turbo type-check` before committing.** There is no test suite yet;
  type-check is the gate. (Adding tests — especially golden-file tests for the
  scoring engine — is very welcome.)
- **`packages/database/prisma/schema.prisma` is the data-model source of truth.**
  Change it, then add a migration. Never delete an applied migration.
- **Match the surrounding code**: conventional commits (`feat(scope): …`),
  `@map` snake_case tables, reason codes for any new scorecard signal.
- **Shares and scores are point-in-time.** Don't make a share link reflect the
  applicant's *current* evidence; it freezes at creation. Don't recompute
  freshness from upload time.
- **Document architecture changes** in `docs/ARCHITECTURE.md` in the same PR. If
  the doc and code disagree, the code wins — then fix the doc.

## Quick orientation

| If you're working on… | Start in… |
|---|---|
| Site modes / which CTAs show | `apps/web/src/lib/site.ts` |
| Host routing | `apps/web/src/middleware.ts` |
| Sign-up / dev gate | `apps/web/src/app/sign-up/[[...sign-up]]/` |
| Dev access admin + gating | `apps/web/src/app/admin/dev-access/`, `components/layout/dev-access-gate.tsx` |
| Scoring | `packages/shared/src/scoring/` |
| Insights / statement ingestion | `apps/api/src/insights/` |
| Statement upload UI | `apps/web/src/components/banking/bank-connections-view.tsx` |
| Schema | `packages/database/prisma/schema.prisma` |
