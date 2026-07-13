# EquiScore Company Assessment Workspace - Integration Analysis

Date: 2026-07-11
Repo inspected: `/Users/mtk/Documents/Codex/2026-07-11/tkai95-equiscore-git-https-github-com/work/equiscore`
Feature brief inspected: attached pasted text, "EquiScore Company Assessment Workspace"

## Executive Summary

This feature is feasible, and the current product already has several strong building blocks: consumer identity, Open Banking and statement ingestion, document evidence, deterministic insight profiles, Trust Score snapshots, recipient-safe public share links, audit logging, and a modern dashboard UI system.

However, the Company Assessment Workspace is not a thin extension of the current share-link feature. It introduces a new primary domain object: the company assessment case. To implement it correctly, EquiScore needs new tenant, consent, immutable snapshot, policy, criteria-result, usage-ledger, and workflow models.

The safest product shape is three clearly separated product surfaces:

1. Consumer app: the individual/applicant-facing EquiScore experience.
2. Partner workspace: the company-facing assessment, case, policy, and usage experience.
3. EquiScore internal admin: the EquiScore-operated control layer for creating partners, monitoring usage, managing access, and supporting accounts.

Those surfaces can live in the same Next/Nest monorepo, but they must not be treated as one navigation system or one permission boundary.

Implementation principles:

1. Keep the current consumer app and one-off share experience.
2. Add a new multi-tenant company workspace surface for partner organisations.
3. Add a separate internal admin surface for EquiScore operators.
4. Reuse the existing insight/scoring/evidence engines to generate immutable `ProfileSnapshot` records.
5. Build a new deterministic `AssessmentCase` and `PolicyEvaluation` layer on top.
6. Charge via an append-only usage ledger only after a delivered assessment case is successfully created.
7. Defer Policy Builder and Reviewer Copilot until the underlying case, snapshot, policy, and evidence-reference structures are reliable.

The foundational work should not be skipped: tenant isolation, consent records, immutable snapshots, usage idempotency, and audit logging are part of the product, not nice-to-have plumbing.

## Implementation Progress - 2026-07-12

The first foundation slices have now been implemented in the repo, applied to the configured Postgres database, pushed to GitHub, and deployed through the existing Railway/Vercel pipeline.

Built:

- Prisma migration workflow introduced with a baseline migration and a company workspace foundation migration.
- Company workspace schema added for organisations, memberships, assessment requests, company consent, immutable assessment snapshots, policies, policy versions, policy rules, assessment cases, criterion results, case notes, information requests, decisions, usage events, and organisation audit events.
- Internal admin schema added for internal admin access, internal admin invitations, admin roles/statuses, and internal admin audit events.
- Remote database migrated successfully; `prisma migrate status` reports the database schema is up to date.
- NestJS organisation module added with organisation creation/listing, role-to-permission mapping, active membership resolution, and an `OrganisationAccessGuard`.
- Organisation overview endpoint added under `/organisations/:organisationSlug/overview`.
- Organisation-scoped read endpoints added for assessment cases, assessment requests, policies, usage events, and audit events.
- NestJS internal admin module added with `InternalAdminGuard`, `/admin/me`, overview, organisations, consumers, internal admins, usage, activity, audit, organisation creation, and partner invitation endpoints.
- Partner organisation creation is now managed from internal admin rather than partner workspace self-service.
- Admin-created partner invitations can be claimed when the invited email signs in, creating the active organisation membership.
- Next.js `/workspace` surface added with a company workspace shell and separate navigation from the consumer dashboard.
- Next.js `/admin` surface added with a separate internal admin shell, overview, organisations, organisation detail, consumers, usage, activity, internal admins, and admin audit views.
- `/workspace` route protection added to middleware. In production mode, it is Clerk-protected; in public marketing mode, it redirects away from protected workspace routes.
- `/admin` route protection added to middleware. `admin.equiscore.app` rewrites to `/admin`; `partners.equiscore.app` rewrites partner workspace routes to `/workspace`.
- Workspace home lists organisations for the authenticated user and shows a clear no-access/switch-account state when the signed-in email is not an active partner member.
- Organisation overview, assessments, requests, policies, usage, and audit pages now render real org-scoped data tables from the API. Shared-with-us and settings remain placeholders for the next slices.
- Company-initiated assessment requests can now be created by partner users, opened by applicants, completed through the consumer onboarding flow, and delivered back as assessment cases with consent, immutable snapshots, criterion results, usage events, and audit events.
- Partner request/onboarding routes redirect to the consumer surface so applicants build profiles on `dev.equiscore.app`, not `partners.equiscore.app`.
- Public share links now render correctly from server-side backend fetches.
- Browser API calls use same-origin `/api/backend` proxying so `admin.equiscore.app`, `partners.equiscore.app`, and `dev.equiscore.app` do not depend on fragile browser CORS behaviour.
- Admin access clarity added: an authenticated but unauthorised email sees an "Admin access required" screen before any admin sidebar or admin data renders.
- Internal admin and partner organisation invitations now have database-backed copy-link, resend, revoke, accepted, pending, expired, and revoked management states in the admin UI.
- Invite email delivery has been wired through Resend for internal admin and partner organisation create/resend flows, with safe fallback messaging when live email variables are not configured.
- Partner workspace team management is now available under Team & settings: members can be invited, invitation emails can be resent, invitations can be revoked, member roles can be updated, and members can be removed by roles with `members:manage`.
- The product URL decision is reflected in UI copy and middleware as `partners.equiscore.app/o/{organisationSlug}/...` while the app route group remains `/workspace` for the monorepo implementation.
- The workspace shell has been aligned with the existing consumer dashboard styling so the partner layer feels like part of EquiScore while remaining a distinct product surface.

Verified:

- `npx prisma validate --schema packages/database/prisma/schema.prisma`
- `npx prisma migrate status --schema packages/database/prisma/schema.prisma`
- `npm run type-check --workspace=@equiscore/shared`
- `npm run type-check --workspace=@equiscore/api`
- `npm run type-check --workspace=@equiscore/web`
- `npm run build --workspace=@equiscore/api`
- `npm run build --workspace=@equiscore/web`
- GitHub deployment checks for Railway, `equiscore-web-dev`, and `equiscore-web-public`

Known remaining setup:

- Environment variables must remain deployment/local-only and must not be committed. Clerk, database, API, and domain values should be managed per environment.
- Invite email delivery is code-wired through Resend. Live deployment requires `RESEND_API_KEY` and `INVITE_EMAIL_FROM=EquiScore <noreply@equiscore.app>` in the API service environment.
- Waitlist confirmation email delivery is wired through the existing public website endpoint, `/api/register-interest`. Because that endpoint runs on the web deployment for `equiscore.app`, it also needs `RESEND_API_KEY` plus `WAITLIST_EMAIL_FROM=EquiScore <noreply@equiscore.app>` or the existing sender fallback in the public web environment.
- Partner team management has a first workspace-owned implementation for invite, resend, revoke, role update, and remove actions. More granular suspension/reactivation and notification analytics remain future hardening.
- Case detail, reviewer workflow depth, policy builder, missing-information workflows, billing exports, and tenant-isolation tests remain to be built.
- Tests/CI still need to be introduced; current verification is schema validation, TypeScript, and production build.

## Product Surface and Navigation Model

EquiScore should have three navigation points. They can share the same codebase and identity provider, but they need distinct URLs, layouts, entry points, and permission rules.

### 1. Consumer App

Current MVP URL:

```text
dev.equiscore.app/dashboard
dev.equiscore.app/evidence
dev.equiscore.app/trust-score
dev.equiscore.app/share
```

Likely final URL:

```text
app.equiscore.app
```

Purpose:

- Individual/applicant-facing EquiScore experience.
- Lets a person build and manage their Trust Portfolio.
- Handles onboarding, Open Banking, documents, evidence, Trust Score, Compass, and sharing.
- Shows the user what they have shared and who has access.
- Does not show company case queues, partner usage, partner policies, or internal admin tools.

Primary users:

- Consumers, tenants, applicants, employees, borrowers, or anyone being assessed.

Access rule:

- Requires the authenticated consumer user.
- User can only access their own profile, evidence, assessments, and sharing controls.

### 2. Partner Workspace

Current MVP URL:

```text
dev.equiscore.app/workspace
dev.equiscore.app/workspace/o/{organisationSlug}
```

Final URL:

```text
partners.equiscore.app
partners.equiscore.app/o/{organisationSlug}
```

Purpose:

- Company-facing operational workspace for organisations using EquiScore.
- Lets partner companies manage assessment requests, received applicant shares, assessment cases, policies, reviewer workflows, usage, and their own audit trail.
- Each organisation is tenant-isolated.
- A partner can only see its own organisation data.
- This is not the place where EquiScore creates all partners or monitors the whole platform.
- Partner self-service organisation creation should be treated as a later go-to-market decision. The default controlled flow is: EquiScore creates the partner in `/admin`, invites the first partner owner/admin, and that partner then manages its own team inside `/workspace`.

Primary users:

- Letting agents, employers, lenders, councils, recruiters, or other customer organisations.
- Partner owners, admins, reviewers, policy admins, billing admins, and auditors.

Access rule:

- Requires authentication plus active membership in the partner organisation.
- A consumer account by itself must not be enough to enter this layer.
- If someone signs in at `partners.equiscore.app` without a valid partner membership, they should land on an access-denied/request-invite screen.
- Partner roles control what the user can do inside that organisation.

### 3. EquiScore Internal Admin

Current MVP URL to build:

```text
dev.equiscore.app/admin
```

Final URL:

```text
admin.equiscore.app
```

Purpose:

- EquiScore-operated control layer across the whole platform.
- Lets internal EquiScore admins create and manage partner organisations.
- Supports partner onboarding, owner/admin invitations, account status, plan/allowance management, usage monitoring, login/activity rates, billing signals, support diagnostics, and platform-level audit review.
- Provides a global view across all partners that no normal partner user should have.

Primary users:

- EquiScore founders, operators, support, finance, compliance, and platform admins.

Access rule:

- Requires authentication plus a global EquiScore internal role such as `equiscore_admin`, `support_admin`, `billing_admin`, or `compliance_admin`.
- Partner organisation membership must not grant access to this layer.
- Internal admin access should be checked separately from partner workspace access.

## Login and Permission Strategy

Do not create three disconnected login systems at MVP. Use one identity foundation, but enforce three separate authorisation boundaries.

Recommended approach:

- Same auth provider, currently Clerk.
- Separate URL entry points and post-login routing for consumer, partner, and internal admin users.
- Separate backend guards for consumer user access, partner organisation access, and EquiScore internal admin access.
- EquiScore's database remains the source of truth for partner organisation membership, partner roles, and internal admin privileges unless intentionally moved into Clerk metadata later.

Expected behaviour:

```text
Consumer signs in at dev.equiscore.app
-> allowed into /dashboard
-> not allowed into /workspace unless they also have partner membership
-> not allowed into /admin unless they have an internal EquiScore role

Partner user signs in at partners.equiscore.app
-> allowed into the partner workspace only for organisations they belong to
-> denied or request-invite screen if they have no partner membership
-> not allowed into /admin

EquiScore admin signs in at admin.equiscore.app
-> allowed into internal admin only with a global internal role
-> can create/manage partners and inspect platform-wide operational metrics
```

This gives users the feeling of separate products without forcing EquiScore to maintain separate authentication stacks too early.

## Product URL Strategy

Default company portal URL:

```text
partners.equiscore.app
```

Recommended product surfaces:

```text
equiscore.app                        Marketing site
app.equiscore.app                    Consumer app
partners.equiscore.app               Partner/company workspace
admin.equiscore.app                  EquiScore internal admin
verify.equiscore.app/share/{token}   One-off public share view
api.equiscore.app                    API
```

For MVP, organisation identity should live inside the authenticated company app context rather than in customer subdomains:

```text
partners.equiscore.app/o/{organisationSlug}/assessments
partners.equiscore.app/o/{organisationSlug}/requests
partners.equiscore.app/o/{organisationSlug}/cases/{caseId}
```

Do not start with `{company}.equiscore.app` as the default. Customer subdomains add wildcard DNS, wildcard TLS, Clerk redirect/cookie complexity, reserved-name handling, organisation rename handling, and public exposure of customer names. They are better treated as a later enterprise feature:

```text
acme.equiscore.app
assessments.acme.com
```

The initial implementation can live in the same Next app and use an internal route group such as `/workspace`; deployment or middleware can map `partners.equiscore.app/...` to that company workspace surface.

The internal admin implementation can also live in the same Next app as `/admin` during MVP, then be mapped to `admin.equiscore.app` when the domain is ready.

## Non-Negotiable Implementation Principle

Extend and compose. Do not rebuild.

The Company Assessment Workspace must be a new B2B workflow and presentation layer over EquiScore's existing consumer profile, banking, document, insight, scoring, evidence, sharing, audit, authentication, and UI capabilities.

The company portal must reuse the existing services as the authoritative source for:

- identity and profile information
- bank and statement data
- transaction classification
- income analysis
- expense and commitment analysis
- income stability
- affordability calculations
- Trust Score and tier
- evidence manifests
- data freshness
- document verification

New company functionality should orchestrate, select, freeze, evaluate, and present these existing outputs according to the assessment purpose and the individual's permission.

A new assessment snapshot is required only to preserve exactly what information was delivered to the company at a specific point in time. It must not become a second profile system, a duplicate financial database, or a parallel calculation engine.

Engineers should not create parallel implementations of scoring, insights, financial analysis, document processing, transaction categorisation, identity verification, public sharing, or UI primitives. When an existing capability is insufficient, extend its interface or add a thin adapter before introducing a new independent system.

## Current Codebase Findings

### App Structure

The repo is an npm workspaces monorepo:

- `apps/web`: Next.js 14 frontend.
- `apps/api`: NestJS API.
- `packages/database`: Prisma client and schema.
- `packages/shared`: shared scoring/types/schemas.

The API module graph currently imports consumer-focused modules only: auth, profile, banking, documents, scoring, sharing, audit, analytics, insights, and Compass. There is no organisation/company module yet.

Relevant files:

- `apps/api/src/app.module.ts`
- `apps/web/src/middleware.ts`
- `packages/database/prisma/schema.prisma`

### Current Data Model

The existing schema is consumer-first. Key existing models:

- `User`, `UserProfile`, `UserAddress`, `EmploymentProfile`, `RentalProfile`
- `BankConnection`, `BankAccount`, `BankTransaction`, `DirectDebit`, `StandingOrder`
- `UploadedDocument`
- `TrustFeature`, `TrustScore`
- `SharedProfile`
- `StatementImportJob`
- `InsightQuestionAnswer`
- `AuditEvent`
- Compass models for commitments, reminders, goals, dismissals

Important existing strengths:

- `TrustScore` already stores freshness fields, an evidence manifest, and a feature snapshot.
- `SharedProfile` already stores a frozen `insightSnapshot`.
- `BankTransaction` has unique transaction IDs by account, categories, raw payloads, and date indexes.
- Documents store extracted metadata and verification status.

Main missing models for the first build:

- Organisation and membership.
- Organisation-level roles and permissions.
- Assessment requests.
- Consent records scoped by organisation and purpose.
- Immutable profile snapshots independent of TrustScore.
- Assessment cases.
- Policy versions and policy rules.
- Criterion results.
- Case notes, tasks, messages, information requests.
- Decision records.
- Append-only usage ledger.
- Organisation-scoped audit events.
- AI interaction records.

Workspace, team, task, SLA, queue, and advanced workflow tables can come later once a customer needs multiple divisions, products, or operating teams. The MVP should not become a generic enterprise workflow platform before the assessment workflow itself is proven.

There are also no Prisma migration files in the repo, only `schema.prisma`. Before adding this feature, decide whether to adopt Prisma migrations formally or continue using `db push` in dev only. For a B2B audit/billing feature, migrations should be introduced.

### Auth and Authorisation

Current auth verifies a Clerk JWT and attaches only:

```ts
request.user = {
  clerkId: payload.sub,
  email: ...
}
```

`AuthService.syncUser` maps Clerk identity to one `User` row. This is fine for consumer use, but the full product needs three separate authorisation checks:

- User is authenticated by Clerk.
- Consumer routes check that the user can only access their own consumer data.
- Partner routes check that the user has active membership in the requested organisation/workspace.
- Internal admin routes check that the user has a global EquiScore internal role.

Partner request context should include `organisationId`, optional `workspaceId`, role, and permissions. Every company query must be constrained by that organisation/workspace context.

Internal admin request context should include the EquiScore admin role and allowed admin permissions. It must not be inferred from partner membership.

The current consumer guard is insufficient for B2B and internal-admin endpoints. Add:

- `OrganisationAccessGuard` or `PartnerAuthGuard` after `ClerkAuthGuard` for partner workspace APIs.
- `InternalAdminGuard` after `ClerkAuthGuard` for EquiScore admin APIs.

### Sharing

The current sharing service is the most reusable part of the feature:

- It builds a curated recipient-safe insight slice.
- It freezes the insight at share time.
- It has explicit freshness/expiry/revocation handling.
- It avoids exposing raw transactions by default.
- It records share creation, revocation, and view audit events.

Existing `SharedProfile` should stay as the one-off share-link mechanism. Do not turn it directly into the company case model. Instead:

- For user-initiated company sharing, create or reuse a `SharedProfile` as the applicant-facing grant/intent.
- Add a company intake model, such as `OrganisationSharedProfile`, that references `SharedProfile` and tracks organisation acceptance state.
- When accepted, create a formal `AssessmentCase`, `ConsentRecord`, `ProfileSnapshot`, `CriterionResult` rows, and a `UsageEvent`.
- Add a partner workspace intake action where an authorised partner pastes a share link/code. The API resolves the share token, verifies it is active and unrevoked, creates the organisation intake row, and keeps the item visible under "Shared with us" until accepted, declined, or assessed.
- Do not rely on a generic public share view as the system of record for partner workflows. Public share links remain viewer links; partner intake turns the share into a logged, organisation-scoped workflow item.
- At share creation, the applicant should choose between a generic share and a partner share. A generic share creates a public recipient link only. A partner share creates a link/code explicitly intended for partner workspace intake, with copy that tells the applicant to give it to the partner so they can import it inside their EquiScore workspace.
- Naming or selecting a partner at share creation must not by itself consume partner allowance or create a billable event. Partner usage starts only when an authorised partner imports/accepts the share inside their workspace and an assessment is delivered through the organisation-scoped case flow.

This preserves the public share product while giving company customers proper case management.

### Scoring and Insights

The scoring layer is reusable but should not be overloaded.

Existing capabilities:

- `FeatureEngineeringService.computeFeatures(userId)` reads profile, banking, documents, and insight answers.
- `ScoringService.recompute(userId, scorecardType)` creates `TrustScore`.
- `ScoringService` builds evidence manifests and freshness windows.
- `InsightsService` builds a deterministic `InsightProfile` from transactions.
- `InsightProfile` already contains income, expenses, commitments, payment behaviour, unusual transactions, follow-up questions, stability signals, affordability, external accounts, internal transfers, summary, and data period.

Recommendation:

- Keep `TrustScore` as the consumer trust portfolio score.
- Add `AssessmentSnapshotService` that creates immutable company-safe snapshots using `InsightsService.getProfileForUser`, latest `TrustScore`, profile identity fields, document summary, and evidence metadata.
- Add `PolicyEvaluationService` that evaluates company policy rules against a `ProfileSnapshot`.
- Store per-rule outputs as `CriterionResult`; do not try to squeeze them into Trust Score reason codes.

### Web Frontend

At initial inspection, the web app had:

- Consumer dashboard under `/dashboard`.
- Public share viewer under `/share/[token]`.
- Marketing pages including `/partners`.
- Clerk-protected middleware for `/dashboard`, `/onboarding`, and `/trust-score`.
- A reusable UI system with `PageLayout`, `PageHeader`, `Card`, `Section`, `Metric`, `StatusPill`, etc.

Since then, the first `/workspace` surface has been added and styled to match the existing dashboard shell. The missing third surface is the internal EquiScore admin layer.

Recommendation:

- Keep `/dashboard` for the consumer app.
- Keep `/workspace` as the current internal route group for the partner workspace.
- Add `/admin` as the current internal route group for the EquiScore admin layer.
- Keep `/partners` as marketing unless intentionally repurposed.
- Route or rewrite `partners.equiscore.app` to `/workspace`.
- Route or rewrite `admin.equiscore.app` to `/admin`.
- Keep consumer, partner, and internal admin navigation separate even if they reuse the same visual design system.

### Testing and Tooling

There are currently no test files, no CI workflows, and no usable ESLint config. `next lint` prompts to configure ESLint. Plain ESLint finds no config.

For this feature, test infrastructure is a prerequisite. Minimum:

- Unit tests for policy evaluation, snapshot creation, consent state, and usage idempotency.
- API integration tests with a test database for tenant isolation.
- E2E tests for share acceptance and company-requested assessment flows.
- Regression tests that prove internal notes are never visible to applicants.

## Product-to-Code Mapping

### What Can Be Reused

1. Consumer account/profile data:
   - Applicant identity, profile, addresses, employment, rental profile.

2. Evidence ingestion:
   - Open Banking providers.
   - Uploaded statement import.
   - Document upload/extraction/verification.

3. Deterministic financial analysis:
   - `InsightProfile` is already close to the financial summary needed by the company workspace.

4. Trust Score:
   - Use as part of the snapshot and case header, but not as the full company decision engine.

5. Public share:
   - Reuse patterns for minimised recipient data, frozen snapshots, link expiry, and revocation.

6. UI primitives:
   - Use existing report-like UI primitives for case summaries and financial assessment screens.

7. Audit service:
   - Keep the pattern, but extend the data model to organisation/case scoped audit events.

### What Must Be Built New

1. Multi-tenant organisation model.
2. RBAC and organisation-scoped API guard.
3. Assessment request lifecycle.
4. Consent records.
5. Immutable profile snapshots.
6. Assessment cases and case repository.
7. Policy model, policy versions, rules, and evaluator.
8. Criterion results with evidence references.
9. Notes, statuses, assignment, decisions.
10. Append-only usage ledger with idempotency.
11. Usage dashboard.
12. Organisation audit log.
13. Applicant-facing request/consent flow.
14. Company workspace layout and pages.
15. EquiScore internal admin layer for global partner management and monitoring.
16. Tests and migrations.

## Recommended Domain Model

The core durable model should be:

```text
Organisation
  -> OrganisationMember
  -> Policy
  -> PolicyVersion
  -> PolicyRule
  -> AssessmentRequest
  -> CompanyConsent
  -> AssessmentSnapshot
  -> AssessmentCase
  -> CriterionResult
  -> CaseNote
  -> InformationRequest
  -> CaseDecision
  -> UsageEvent
  -> OrganisationAuditEvent
```

The internal admin surface should sit above this organisation model rather than inside a single organisation. It needs global read/control permissions across organisations, but normal partner users must never inherit those permissions.

Add later, or implement using existing user metadata/roles first:

```text
InternalAdminRole
  -> InternalAdminPermission
  -> InternalAdminAuditEvent
```

### Organisation and Access

Add:

- `Organisation`
- `OrganisationMember`
- `Role` or initially an enum-backed role field
- Optional `OrganisationInvitation`

Do not add `Workspace` or `Team` in the first version unless a specific customer workflow needs multiple divisions, brands, or products. Start with one organisation-level workspace and evolve from there.

Suggested initial roles:

- `OWNER`
- `ADMIN`
- `POLICY_ADMIN`
- `REVIEWER`
- `MANAGER`
- `BILLING_ADMIN`
- `AUDITOR`

Start with role-to-permission mapping in code, then normalise into DB later if needed.

### Consent

Add `CompanyConsent` with:

- applicant user ID
- organisation ID
- assessment purpose/type
- permitted data categories
- consent text version
- granted/revoked/expired timestamps
- request/share reference
- profile version/snapshot reference after assessment creation

Consent is distinct from Open Banking provider consent. `BankConnection.consentId` is provider-level. `ConsentRecord` is EquiScore-to-company access permission.

### Assessment Snapshot

Add immutable `AssessmentSnapshot`.

It should contain:

- applicant ID
- snapshot version
- source data period
- source freshness
- permitted data scope
- trust score summary
- insight summary
- income summary
- affordability summary
- commitments summary
- verification summary
- evidence manifest
- evidence references
- integrity hash
- created timestamp

Important rule: once used by an `AssessmentCase`, it must not mutate. Corrections should create either:

- a new snapshot version, or
- a correction layer that is itself immutable/audited.

### Assessment Case

Add `AssessmentCase` as the central company object.

It should link:

- organisation
- applicant
- assessment request or shared-profile intake
- consent
- profile snapshot
- policy version
- assessment source
- case status
- EquiScore outcome and confidence
- reviewer assignment
- company decision summary
- dates, expiry, credit consumed flag

Avoid storing the company decision only on the case. Keep a separate `CaseDecision` history table so overrides and changed decisions are auditable.

### Policy and Criteria

Add:

- `Policy`
- `PolicyVersion`
- `PolicyRule`
- `CriterionResult`

For MVP, store rule logic as structured JSON plus indexed metadata fields. Example:

```json
{
  "inputField": "affordability.ratios.proposedCommitmentToIncome",
  "operator": "lte",
  "threshold": 0.4,
  "missingDataBehaviour": "review",
  "confidenceRequirement": "medium",
  "passOutcome": "pass",
  "failOutcome": "review",
  "evidenceRefs": ["snapshot.affordability.monthlyIncome"]
}
```

Start with a whitelist of allowed input fields. Do not allow arbitrary JSON paths or executable expressions from AI-generated policy drafts.

### Usage Ledger

Add append-only `UsageEvent`.

Key requirements:

- Unique idempotency key.
- Never delete usage events.
- Reversals create new reversal events.
- Create credit usage only after assessment delivery succeeds.
- Do not count assessment rows for billing.

Recommended unique key:

```text
organisationId:assessmentCaseId:profileSnapshotId:eventType
```

The acceptance/delivery flow must run in one transaction where possible:

1. Verify consent.
2. Verify data sufficiency.
3. Create snapshot.
4. Evaluate policy.
5. Create assessment case.
6. Create criterion results.
7. Create usage event with idempotency key.
8. Create audit event.

If background processing is introduced, the job must be idempotent and recoverable.

## Recommended Backend Modules

Add these modules to `apps/api/src`:

```text
organisations/
assessments/
policies/
usage/
admin/
partner-ai/   later
```

Suggested services:

- `OrganisationService`
- `OrganisationAccessGuard`
- `PermissionService`
- `AssessmentService`
- `AssessmentSnapshotService`
- `PolicyEvaluationService`
- `UsageLedgerService`
- `InternalAdminService`
- `InternalAdminGuard`

Keep consent, cases, notes, decisions, and information requests inside the initial `assessments/` module until the code becomes large enough to justify splitting them.

### Guard Pattern

Use identity plus the correct surface-specific guard.

For partner workspace APIs:

```ts
@UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
```

The organisation guard should:

- resolve user by Clerk ID
- resolve organisation from route slug, route id, or future `partners.equiscore.app` host mapping
- verify active membership
- attach `request.orgContext`
- expose permissions

All company service methods should take `orgContext` explicitly. Do not rely on frontend filtering.

For EquiScore internal admin APIs:

```ts
@UseGuards(ClerkAuthGuard, InternalAdminGuard)
```

The internal admin guard should:

- resolve user by Clerk ID
- verify a global EquiScore internal role
- attach `request.adminContext`
- expose admin permissions
- deny access for normal consumers and partner-only users

All internal admin service methods should take `adminContext` explicitly and audit material actions.

## Recommended Frontend Structure

Add:

```text
apps/web/src/app/workspace/layout.tsx
apps/web/src/app/workspace/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/assessments/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/assessments/[caseId]/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/requests/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/shared/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/policies/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/usage/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/settings/page.tsx
apps/web/src/app/workspace/o/[organisationSlug]/audit/page.tsx
```

Add:

```text
apps/web/src/components/workspace/
apps/web/src/lib/workspace-api.ts
apps/web/src/lib/workspace-types.ts
```

Keep company navigation separate from consumer navigation. The company workspace should feel like an operational tool: dense, scan-friendly tables; clear statuses; minimal decorative content. In production, route or rewrite `partners.equiscore.app/o/{organisationSlug}/...` to this workspace route group.

Also add a separate internal admin route group:

```text
apps/web/src/app/admin/layout.tsx
apps/web/src/app/admin/page.tsx
apps/web/src/app/admin/organisations/page.tsx
apps/web/src/app/admin/organisations/[organisationSlug]/page.tsx
apps/web/src/app/admin/usage/page.tsx
apps/web/src/app/admin/activity/page.tsx
apps/web/src/app/admin/audit/page.tsx
apps/web/src/components/admin/
apps/web/src/lib/admin-api.ts
apps/web/src/lib/admin-types.ts
```

The admin navigation should be visibly distinct in information architecture, but visually aligned with the same EquiScore dashboard/sidebar system. It should not appear inside partner organisations as a menu item.

### MVP Company Pages

1. Overview
   - awaiting review
   - applicant responses
   - requests incomplete
   - credits remaining
   - assigned cases

2. Assessments
   - table with applicant, type, reference, tier, outcome, commitment, ratio, freshness, status, reviewer, last assessed

3. Assessment detail
   - header
   - assessment summary
   - criteria results
   - financial summary
   - evidence references
   - notes
   - activity
   - decision

4. Applicant intake
   - expandable navigation group containing Requests and Shared links
   - request assessment drawer/form
   - list request statuses
   - resend/cancel
   - import consumer share links
   - template setup for partner-branded invite/request messages

5. Policies
   - policy list
   - draft/approve/activate/retire policies
   - criteria preview

6. Settings
   - Team
   - Usage
   - Audit log

Settings: Usage

- allowance
- used/remaining/overage
- usage ledger table

Settings: Team

- invite members
- role assignment

Settings: Audit log

- initially read-only list

### MVP Internal Admin Pages

The internal admin layer is for EquiScore staff, not partner users. MVP pages should focus on partner setup, usage visibility, and operational support.

1. Admin overview
   - total partner organisations
   - active organisations
   - assessments delivered
   - usage this month
   - login/activity trend
   - partners needing attention

2. Organisations
   - all partner organisations
   - status, plan, allowance, usage, owner, last active
   - create organisation
   - suspend/reactivate organisation

3. Organisation detail
   - partner profile
   - owners/admins
   - usage summary
   - recent logins/activity
   - recent assessment volume
   - current plan/allowance
   - support notes

4. Invitations and access
   - invite partner owner/admin
   - resend/cancel invites
   - view partner members
   - remove/suspend partner access

5. Platform usage
   - usage by organisation
   - usage event ledger
   - overage/billing signals
   - export later

6. Activity and login rates
   - last login by organisation/member
   - active users by period
   - inactive partner warnings
   - failed or blocked access attempts

7. Admin audit log
   - internal admin actions
   - partner access changes
   - billing/allowance changes
   - support actions

## Applicant Flow Changes

Add an applicant-facing route for company requests:

```text
/requests/[token]
```

Flow:

1. Applicant opens request.
2. Signs in or signs up.
3. Sees company, purpose, requested data categories, proposed commitment, deadline.
4. Completes missing profile/evidence steps.
5. Reviews exact sharing scope.
6. Grants consent.
7. Backend creates/delivers assessment.
8. Applicant sees completion and later can view/revoke active access where permitted.

Add consumer dashboard surface:

```text
/dashboard/access
```

This should list organisations with active or historic access, consent expiry, and revocation controls.

## Workflow Design

### User-Initiated Company Share

Recommended implementation:

1. Applicant starts from the consumer share screen and chooses share type: generic recipient share or partner workspace share.
2. Generic recipient share creates the current one-off public link for landlords, agents, banks, or individuals who are not using the partner workspace.
3. Partner workspace share creates a share code/link with instructions: give this to the partner so they can import it inside their EquiScore workspace.
4. Optional later enhancement: applicant can search/select a known partner. That may create a non-billable pending intake or notification, but it must not consume partner allowance until the partner accepts/imports and an assessment is delivered.
5. Applicant sends the link/code to a partner outside EquiScore, or chooses a partner destination inside EquiScore once partner discovery exists.
6. Authorised partner opens `Shared with us` and pastes the share link/code into an intake form.
7. API resolves the `SharedProfile`, verifies expiry/revocation/freshness, and creates an `OrganisationSharedProfile` intake row scoped to that organisation.
8. If the share has not already granted explicit company consent for this organisation and purpose, the applicant is prompted to authorise the partner before an assessment case can be delivered.
9. Applicant sees company name, purpose, requested data categories, proposed commitment where relevant, consent expiry, and can approve or decline.
10. Company sees the row in "Shared with us" with status such as awaiting applicant authorisation, ready to assess, declined, duplicate, expired, or assessed.
11. Company chooses "Accept and assess".
12. API validates active consent and data sufficiency.
13. Create `ProfileSnapshot`.
14. Evaluate active `PolicyVersion`.
15. Create `AssessmentCase`.
16. Create `CriterionResult` rows.
17. Append `UsageEvent`.
18. Audit all material actions.

Credit is consumed only at step 17.

### Company-Initiated Request

Recommended implementation:

1. Company creates `AssessmentRequest`.
2. Generate secure request token.
3. Send request invitation email/link to the applicant.
4. Applicant opens request on the consumer surface, not the partner surface.
5. If the applicant already has an EquiScore account, they sign in with the requested email and see an explicit authorisation step: approve or decline this partner's access for the stated purpose.
6. If the applicant does not have an account, they sign up, complete the required onboarding/profile/evidence steps, then land on the same explicit authorisation step.
7. Applicant sees company name, purpose, requested data categories, proposed commitment, deadline, consent expiry, and can approve or decline.
8. If approved, backend creates/delivers the assessment exactly as above.
9. If declined, the request is closed as applicant declined and no assessment case or usage event is created.
10. Request status changes to `ASSESSMENT_DELIVERED` only after consent, snapshot, case, criteria, and usage event are created.
11. Company receives case in repository.

Both flows must converge on the same consent, snapshot, policy evaluation, case, usage, and audit services so that user-initiated shares and company-initiated requests produce the same kind of partner case.

## Recalculation vs Refresh

Implement this explicitly in API:

- `POST /assessment-cases/:id/recalculate`
- `POST /assessment-cases/:id/refresh`

Recalculate:

- uses existing `ProfileSnapshot`
- can apply changed proposed commitment or newer policy
- creates new `AssessmentCaseVersion` or new `CriterionResult` set
- consumes 0 credits

Refresh:

- requires valid active consent
- pulls/uses newer financial data
- creates a new `ProfileSnapshot`
- creates a new assessment version
- consumes 1 credit after delivery

Do not hide this behind one ambiguous "rerun" button.

## AI Rollout

### Company Policy Builder

Do not start here. First build:

- policy schema
- rule validation
- policy versioning
- policy approval
- deterministic evaluator
- sample-case testing

Then add AI as a draft generator only.

AI output must be validated against:

- allowed input fields
- available evidence sources
- supported operators
- prohibited criteria
- missing thresholds

All AI-created policies must remain draft until approved.

### Reviewer Copilot

Do not ship until case data has stable evidence references.

The copilot should retrieve only:

- active case
- selected profile snapshot
- policy version
- criterion results
- permitted evidence references
- notes the user can access

Every answer should cite evidence references. Store every material interaction in `AIInteraction`.

## Security and Privacy Requirements

Critical implementation rules:

1. Every company-owned row must include `organisationId`.
2. Every company query must filter by `organisationId`.
3. Never depend only on frontend filtering.
4. Field-level minimisation must happen in backend serializers.
5. Internal notes and applicant-visible messages should be separate by visibility and enforced in service methods.
6. Evidence expansion must be permission checked and audit logged.
7. Raw transactions should not appear in default company views.
8. Snapshot access must be scoped by consent purpose and company role.
9. AI retrieval must include organisation, workspace, case, and permission filters.
10. Billing events need idempotency keys and unique constraints.
11. Internal admin access must be guarded by a global EquiScore role, not partner organisation membership.
12. Every internal admin action that changes partner status, access, plan, allowance, or billing-relevant data must be audit logged.

## Implementation Phases

### Phase 0 - Platform Hardening

Purpose: make the repo ready for a high-trust B2B feature.

Build:

- Prisma migrations.
- ESLint config.
- API unit/integration test setup.
- Web test setup.
- Seed/test factories.
- Transaction/idempotency helper.
- Expanded audit event model design.

Exit criteria:

- `npm run type-check`, `npm run build`, and tests all run locally.
- There is a test database path.
- Migrations can be reviewed and applied safely.

### Phase 1 - Tenant and RBAC Foundation

Build:

- `Organisation`
- `OrganisationMember`
- roles/permissions
- organisation invites
- `OrganisationAccessGuard`
- company workspace shell
- team/settings MVP

Exit criteria:

- A Clerk user can belong to an organisation.
- Company routes require membership.
- Cross-tenant API access is denied by automated tests.

### Phase 1A - Internal Admin Foundation

Build:

- `InternalAdminGuard`
- global internal admin role/permission check
- `/admin` protected route group
- internal admin shell
- organisation list
- create/manage partner organisation
- invite partner owner/admin
- admin audit events for partner setup and access changes

Exit criteria:

- Only EquiScore internal admins can access `/admin`.
- Partner-only users and consumer-only users are denied.
- EquiScore admin can create a partner organisation and invite the first partner owner/admin.
- Admin actions are audit logged.

### Phase 2 - Core Assessment Case MVP

Build:

- `AssessmentRequest`
- `ConsentRecord`
- `ProfileSnapshot`
- `AssessmentCase`
- `CriterionResult`
- basic deterministic policy version and rules
- usage ledger
- audit events
- shared-profile intake

Exit criteria:

- Company can accept a user share and create a delivered assessment case.
- Company can create a request; applicant can consent; case is delivered.
- One and only one usage event is created for delivery.
- Case preserves snapshot and policy version.

### Phase 3 - Company Workspace UI

Build:

- Overview
- Assessments table
- Case detail
- Requests
- Shared with us
- Notes
- Assignment
- Status changes
- Decision recording
- Usage screen
- Audit log

Exit criteria:

- Reviewer can handle a case end to end.
- Decision is recorded separately from EquiScore outcome.
- Usage and audit reflect actions.

### Phase 4 - Policy Builder Foundation

Build:

- policy draft/version states
- policy approvals
- rule editor
- rule validation
- test policy against snapshots/sample cases
- recalculation against policy versions

Exit criteria:

- Policy admin can create, test, submit, approve, activate, and retire policy versions.
- Existing cases retain their original policy version.

### Phase 5 - AI Features

Build:

- Policy Builder draft generation
- ambiguity and unsupported-rule detection
- Reviewer Copilot retrieval over case/snapshot/policy
- evidence citations
- AI interaction audit
- draft note/request flows

Exit criteria:

- AI cannot activate policies.
- AI cannot read cross-tenant data.
- AI answers include evidence references.
- Reviewer approval is required before outbound/saved actions.

### Phase 6 - Workflow, Portfolio, Enterprise

Build:

- tasks
- queues
- escalations
- SLA timers
- saved views
- portfolio intelligence
- webhooks
- bulk requests
- SSO
- custom domains
- enterprise exports

## Current Active Roadmap

Immediate next slices, in order:

1. **Invite delivery and management**
   - Done: admin UI can copy invite links, resend invitations, revoke invitations, show accepted, pending, expired, and revoked states consistently, and send invite emails through Resend when API environment variables are configured.
   - Remaining: add branded email analytics/bounce visibility after the first real invite traffic.

2. **Partner team management**
   - Done: partner owners/admins with `members:manage` can invite members, resend/revoke invitations, update roles, and remove members inside their own organisation.
   - Done: membership and invitation actions are organisation-audited.
   - Remaining: add suspend/reactivate flows, owner transfer polish, and notification analytics.

3. **Partner intake and applicant consent pairing**
   - Done (`58f62ae`): added "Shared with us" intake where partners paste a consumer share link/code and convert it into an organisation-scoped, audited intake row without consuming usage credits.
   - Done: simplified partner navigation so Applicant intake expands into Requests and Shared links, while Usage, Audit log, and Team live under Settings.
   - Add partner-branded request templates: logo/name fields, editable message content, preview, approval/sign-off state, active/inactive versions, and audit trail for who approved a template.
   - Add applicant authorisation states for both flows: partner-requested assessment and user-initiated share intake.
   - Ensure existing users sign in and approve/decline the partner access request; new users complete signup/onboarding and then approve/decline.
   - Keep generic public share links separate from partner workspace case intake.
   - Deliver a case only after explicit active consent for the organisation, purpose, and data scope.

4. **Assessment case detail and reviewer workflow**
   - Done: added an organisation-scoped assessment case detail API and first partner-facing case detail page with snapshot, consent/request context, financial summaries, criteria results, review activity, and audit trail.
   - Done: added case detail reviewer actions for recording company decisions and requesting more information, with organisation audit events.
   - Done: added applicant response handling on the secure request link for open information requests, including partner-visible responses and audit events.
   - Add partner-side resolve/reopen controls for information requests.
   - Keep company decisions separate from EquiScore outcome.

5. **Policy builder foundation**
   - Draft, approve, activate, and retire policy versions.
   - Add criteria editor and policy preview against existing snapshots.

6. **Tests and CI hardening**
   - Add tenant-isolation tests.
   - Add duplicate-billing/idempotency tests.
   - Add invite-claiming and access-denial tests for admin and partner flows.

## First Engineering Tickets

1. Add a real test harness and Prisma migration workflow.
2. Add organisation/member schema and generated Prisma client.
3. Add `OrganisationAccessGuard` and permission mapping.
4. Add `/workspace` route protection in Next middleware.
5. Add company workspace layout shell and navigation.
6. Add `ProfileSnapshotService.createSnapshot(applicantId, scope)`.
7. Add MVP policy schema and `PolicyEvaluationService`.
8. Add assessment request, consent, assessment case, and criterion result schema.
9. Add usage ledger with unique idempotency key.
10. Implement user-share accept-and-assess backend flow.
11. Implement company-requested assessment backend flow.
12. Build assessments table and case detail UI.
13. Add audit-event expansion for organisation/case actions.
14. Add tenant-isolation integration tests.
15. Add duplicate-billing tests.
16. Add `/admin` route protection and `InternalAdminGuard`.
17. Build internal admin organisation list/create/detail screens.
18. Add admin audit events for partner creation, invites, status changes, and allowance changes.

## Main Risks

1. Overloading `SharedProfile` or `TrustScore`.
   - Risk: public sharing, consumer scoring, and company case logic become tangled.
   - Mitigation: introduce separate company case/snapshot/policy models.

2. Tenant isolation added late.
   - Risk: cross-company data leaks.
   - Mitigation: build organisation guard and tests before company endpoints.

3. Billing from row counts.
   - Risk: incorrect invoices and duplicate charging.
   - Mitigation: append-only usage ledger with idempotency from day one.

4. Mutable snapshots.
   - Risk: historical assessments change after decisions.
   - Mitigation: immutable `ProfileSnapshot` plus correction/versioning model.

5. AI before structure.
   - Risk: unsupported claims, weak evidence citations, unsafe policy changes.
   - Mitigation: deterministic policy/case/evidence layer first; AI later.

6. No test/CI foundation.
   - Risk: regressions in consent, billing, and access control.
   - Mitigation: Phase 0 hardening before broad feature build.

7. Partner workspace used as internal admin.
   - Risk: partner users see global controls or EquiScore operators manage partners from the wrong permission boundary.
   - Mitigation: keep `/workspace` partner-scoped and add `/admin` with a separate internal admin guard.

## Recommended Next Step

Start with Phase 0, Phase 1, and Phase 1A together:

- Add migrations/tests.
- Add organisation/member schema.
- Add company auth context and tenant isolation tests.
- Add a minimal `/workspace` shell.
- Add an internal admin guard and minimal `/admin` shell.
- Let EquiScore internal admins create partner organisations and invite first partner owners/admins from `/admin`.

Then build the first real vertical slice:

> Continue the partner-share vertical slice: let a partner accept an imported share into an explicit applicant authorisation flow, create an immutable snapshot after consent, evaluate one default rental policy, create an assessment case, append exactly one usage event, and show the case in the company assessment table.

That slice proves the core product model without needing every role, AI feature, portfolio chart, or workflow automation on day one.
