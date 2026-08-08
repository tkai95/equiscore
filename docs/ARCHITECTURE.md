# EquiScore — Architecture

This document describes how the system is put together and, more importantly,
the **invariants** that must not be silently changed. If you are about to touch
auth, site-mode logic, the dev gate, the evidence path, or scoring — read the
relevant section here first.

> Last updated: 2026-08. If the code and this document disagree, **the code is
> the source of truth — then update this document in the same PR.**

---

## 1. High-level shape

A Turborepo monorepo, TypeScript end-to-end, Node 20+.

- **`apps/api`** — NestJS 10 REST API under `/api/v1`. Postgres via Prisma.
  Houses the deterministic scoring engine's *consumers* and the insights engine
  (transaction → feature derivation).
- **`apps/web`** — Next.js 14 app. One build serves four surfaces (marketing,
  consumer dashboard, admin portal, partner workspace), selected by **host +
  site mode** (see §3).
- **`packages/shared`** — Zod schemas + the **deterministic scoring engine**
  itself (scorecards, reason codes, feature types). Shared by web and api so the
  score can never drift between them.
- **`packages/database`** — Prisma schema + generated client. Single source of
  truth for the data model. Workspace package, imported as `@equiscore/database`.

Infra: Postgres 16 + Redis 7 (`docker-compose.yml`). Deploys to Railway via
Nixpacks (`nixpacks.toml`). Storage is Supabase Storage. Auth is Clerk.

---

## 2. The Trust Score (and the philosophy you must not break)

The Trust Score is the core product. It is **deterministic and explainable**, by
design — there is deliberately no black-box ML in the score itself.

- **7 sub-scores** → weighted → overall 0–100 + A–E tier + fraud-risk flag.
  Implemented in `packages/shared/src/scoring/scorecards.ts`.
- Every result carries **reason codes** (`reason-codes.ts`) so a score is always
  answerable to the consumer *and* the recipient.
- **INVARIANT: never reward the absence of evidence.** Every scorecard guards
  positive signals with `hasBankData` / `hasIncomeData` so an empty profile
  cannot score well by default. A zeroed feature is "no evidence", not "good". Do
  not remove these guards when adding features.
- **INVARIANT: the scoring logic lives in `packages/shared`, not in the API or
  web.** Both read it from there. Do not reimplement scoring inline.
- The AI (Anthropic) is used for **statement PDF reading** and the in-app
  assistant — never to compute the score. Keep it that way.

Scores carry freshness metadata: `financialDataAsOf`, `validUntil`,
`evidenceManifest`, `featureSnapshot`. Freshness is anchored to the latest date
the **evidence** covers, never the upload/compute time. A statement is an
attestation about a period; an old statement uploaded today buys no freshness.

---

## 3. One build, many sites (the host + mode model)

A single Next.js build is deployed to multiple hosts. Behaviour differs by
**host** (middleware routing) and **site mode** (env var). Do not split this into
separate codebases or apps.

### Site mode (`apps/web/src/lib/site.ts`)

`NEXT_PUBLIC_SITE_MODE` selects:

| Mode | `hasAuth` | `showWaitlist` | Used by |
|---|---|---|---|
| `public` | no | yes | Legacy marketing-only build (no Clerk key) |
| `open` | yes | yes | **`equiscore.app`** — production, open sign-up |
| `invitation` | yes | no | **`dev.equiscore.app`** — invite-only |

Rules (`site.ts`):

- `hasAuth = hasClerkPublishableKey` — auth surfaces render only on authed builds.
- `showWaitlist = !isInvitationSite` — the waitlist never appears on dev.

**INVARIANT: marketing CTA ternaries key on `showWaitlist`, not `isPublicSite`.**
On the `open` site the waitlist shows *and* the nav offers sign-in/sign-up.
Gate auth-presence (`hasAuth`), not waitlist-presence.

When unset, the mode falls back to `public` (no Clerk key) or `open` (key
present) — be explicit in deploy env regardless.

### Host routing (`apps/web/src/middleware.ts`)

Host-based, before Clerk:

- `partners.equiscore.app` → rewrites `/` → `/workspace`, `/o/...` → `/workspace/o/...`; consumer routes on this host redirect to the consumer app.
- `admin.equiscore.app` → rewrites to `/admin/...`.
- Otherwise (incl. `equiscore.app`, `dev.equiscore.app`) → consumer/marketing.

`NEXT_PUBLIC_CONSUMER_APP_URL` (default `https://dev.equiscore.app`) is the
redirect target for consumer routes hit on the partners host — update it per
deploy so partners links point at the right consumer site.

---

## 4. Auth model (Clerk)

- **Provider**: Clerk. Consumer + partner + admin all authenticate through Clerk.
- **`<ClerkProvider>`** (`apps/web/src/app/layout.tsx`) wraps the tree only when
  a publishable key is present; otherwise the public marketing build renders
  with no Clerk at all.
- Redirects are **provider props**, not env: `afterSignUpUrl=/onboarding`,
  `afterSignInUrl=/dashboard`.
- **User rows are created lazily**, not by a webhook. `AuthService.syncUser`
  (`apps/api/src/auth/auth.service.ts`) upserts a `User` by `authProviderId`
  (Clerk `sub`) on first authenticated API call; a `UserProfile` is nested with
  `profileStage: created`. There is **no Clerk webhook** in this repo — if you
  add one, do not duplicate the lazy-sync path.

### Two separate Clerk instances (main vs dev)

Per the product decision: `equiscore.app` and `dev.equiscore.app` use
**different Clerk instances** with their own keys. Each host's domain must be in
its instance's **Allowed Origins** (Clerk Dashboard, not code).

### The verification-email invariant (Dashboard, not code)

The duplicate verification code email is a **Clerk Dashboard** setting, not
something fixable in this repo. Under *User & Authentication → Email → Email
verification*, there must be **exactly one** strategy configured. The
`<SignUp>` / `<SignIn>` components are intentionally bare (no props) — do not
add appearance/verification props to "fix" it; fix it in the Dashboard.

### The onboarding funnel is enforced (INVARIANT)

Clerk's `afterSignUpUrl=/onboarding` is only a *suggestion* — a user who
navigates away could otherwise reach `/dashboard` directly with an empty
profile. `OnboardingGate` (`apps/web/src/components/layout/onboarding-gate.tsx`)
wraps the dashboard layout and redirects any signed-in user whose
`profileStage` is still `created` (or has no profile) back to `/onboarding`.
`completeOnboarding` advances the stage to `profile_building`, which releases
the gate. **Do not remove this gate** — without it, new sign-ups see a broken
dashboard. If you add a new entry route into the dashboard, it inherits this
gate automatically because it lives in the layout.


---

## 5. Dev site access (invite-only)

`dev.equiscore.app` is fully functional but closed. Only emails invited from
`admin.equiscore.app` can create a profile there.

**Flow:**
1. An internal admin invites an email from the **Dev access** admin page
   (`/admin/dev-access`). This creates a `DevAccessInvite` (token =
   `crypto.randomBytes(24).base64url`, 30-day expiry) and emails a link:
   `https://dev.equiscore.app/sign-up?invite=<token>`.
2. The invitee opens the link. The `/sign-up` page (invitation site only)
   validates the token against `GET /auth/dev-invite`, stashes it in a
   `dev_invite_token` cookie (so Clerk's multi-step sign-up keeps it), and
   pre-fills the invited email. Invalid/missing/expired → `DevAccessRequired`.
3. On the invitee's first authenticated dashboard load, `DevAccessGate`
   (`apps/web/src/components/layout/dev-access-gate.tsx`) calls
   `GET /auth/dev-access`, which **claims** the pending invite by email match
   and creates a `DevAccess` (status `active`) row. Subsequent loads just check
   the grant.

**INVARIANTS:**
- The sign-up gate (`apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`) only
  enforces on `isInvitationSite`. Do not gate `/sign-up` on the `open` site.
- `DevAccessGate` is a **no-op** on `open`/`public` — it must render children
  unchanged there. Don't make it always-active.
- Access checks happen **client-side after auth resolves** (mirroring
  `AdminShell`), not in edge middleware — edge cannot reach the DB reliably.
- This mirrors the older `InternalAdminInvitation` pattern
  (`apps/api/src/admin/admin.service.ts`). When extending, copy that pattern;
  don't invent a third invitation system.

---

## 6. The evidence path: statements now, Open Banking coming

The consumer builds a Trust Profile by **uploading bank statements** (PDF or
CSV). **Open Banking (live, read-only bank connection) is a planned future
product, not yet launched.** Where it used to appear in the UI, surfaces now say
"Open Banking is coming soon" so users and reviewers know it's planned, not
missing.

**How statement ingestion works:**
- Web uploads to `/dashboard/connections` (titled **"Bank statements"**) via
  `api.insights.importPdf` / `api.insights.importCsv`.
- CSV parses synchronously; PDF runs as a **background job** read by Claude
  (30–90s). `import-jobs-chip` announces completion globally; the user may leave
  the page.
- Ingestion lives in the API **insights** module (`apps/api/src/insights/`),
  *not* `banking/`. The `banking/` module is the live-OB provider integration,
  present but not wired into consumer CTAs until Open Banking launches.

**INVARIANTS:**
- The primary "get started" CTA everywhere points at **statement upload**, not
  bank connect. If you add a new empty-state, say "upload a statement".
- Do **not** delete `/dashboard/connections/[accountId]` or
  `account-transactions-view` — they browse transactions for accounts the user
  already has. Removing them orphans data.
- Until Open Banking launches, keep the **"coming soon"** framing wherever it
  was removed — don't silently omit it. When it launches, wire the existing
  `banking/` module into a connect UI and replace the coming-soon notes; do not
  build a second live-connect path.

---

## 7. Features dev-gated or upcoming (do not silently change visibility)

- **Goals** (consumer feature) — **hidden on the main/open site, shown only on
  the invitation (dev) site** while being refined. It is **not** deleted: the
  API module, the `ConsumerGoal` table + enums, the two migrations, the goals UI,
  and the rental share-pack branches are all present and always-on at the data
  layer. Gating is purely UI, via `showGoals` (`apps/web/src/lib/site.ts`) = true
  only on the invitation site. The `/dashboard/goals` route redirects to
  `/dashboard` when hidden. **Flip `showGoals` when Goals is ready for the main
  site; do not delete it.**
- **Compass `SavingsGoal`** is a **different, separate** premium feature
  (`My Money`, gated behind `User.compassEnabled`). Do not confuse it with the
  dev-gated consumer Goals.
- **Open Banking** — see §6. Coming-soon; live-connect API code is present in
  `apps/api/src/banking/` and the schema (`BankConnection`, `BankAccount`,
  `TrueLayer`/`Enable Banking` services) but not wired into consumer CTAs.

---

## 8. Data model essentials

`packages/database/prisma/schema.prisma` is authoritative. A few things to know:

- **Freshness on scores** (`TrustScore`): `financialDataAsOf`, `validUntil`,
  `evidenceManifest`, `featureSnapshot` — see §2. The snapshot is captured at
  compute time because raw evidence may later be deleted.
- **Shares are point-in-time** (`SharedProfile.insightSnapshot`): a share link
  freezes the recipient view at creation. It must not change as the applicant's
  later evidence changes.
- **Assessment snapshots** (`AssessmentSnapshot`) carry an `integrityHash` and
  evidence references — fintech-grade audit.
- **Usage metering** (`UsageEvent`) supports reversals and idempotency keys.

Migrations live in `packages/database/prisma/migrations/`. **Never delete an
applied migration.** Create new ones with `npm run db:migrate` (which needs a
shadow DB); if you can't run one, hand-write the SQL to match the schema
(formatting convention: see an existing migration).

---

## 9. Testing (and the current gap)

There is **no automated test suite** today. `turbo type-check` is the only gate.
The deterministic scoring engine (`packages/shared/src/scoring/`) is the highest-
value place to add golden-file tests — please do, and don't change a scorecard
without one.

---

## 10. Where things live (quick index)

| Concern | Location |
|---|---|
| Site modes | `apps/web/src/lib/site.ts` |
| Host routing | `apps/web/src/middleware.ts` |
| Clerk provider + redirects | `apps/web/src/app/layout.tsx` |
| Sign-up (incl. dev gate) | `apps/web/src/app/sign-up/[[...sign-up]]/` |
| Dev access gate | `apps/web/src/components/layout/dev-access-gate.tsx` |
| Dev access admin page | `apps/web/src/app/admin/dev-access/` + `components/admin/admin-dev-access.tsx` |
| Dev invite endpoints | `apps/api/src/admin/admin.controller.ts` (`/admin/dev-access/*`) |
| Dev invite validate/check | `apps/api/src/auth/auth.controller.ts` (`/auth/dev-invite`, `/auth/dev-access`) |
| Scoring engine | `packages/shared/src/scoring/` |
| Insights engine | `apps/api/src/insights/engine/` |
| Statement upload UI | `apps/web/src/components/banking/bank-connections-view.tsx` |
| Statement ingestion API | `apps/api/src/insights/` |
| Trust score UI | `apps/web/src/components/trust-score/trust-score-view.tsx` |
| Prisma schema | `packages/database/prisma/schema.prisma` |
