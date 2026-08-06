# Deployment

One Next.js build is deployed to multiple hosts. Behaviour is selected by env
vars at build/runtime, not by branches or separate apps. Read
[ARCHITECTURE.md](./ARCHITECTURE.md) §3–5 for *why*; this doc is the *how*.

---

## Hosts and modes

| Host | `NEXT_PUBLIC_SITE_MODE` | Clerk instance | Notes |
|---|---|---|---|
| `equiscore.app` | `open` | **Production** | Open sign-up. Marketing + waitlist + dashboard. |
| `dev.equiscore.app` | `invitation` | **Dev (separate)** | Invite-only. Same build; sign-up + dashboard gated. |
| `admin.equiscore.app` | (host-routed) | shared with consumer | Rewrites to `/admin`; `InternalAdminGuard` enforces access. |
| `partners.equiscore.app` | (host-routed) | shared with consumer | Rewrites to `/workspace`; org membership enforces access. |

`admin` and `partners` are host rewrites in `apps/web/src/middleware.ts`; they do
**not** need their own `NEXT_PUBLIC_SITE_MODE`. Pick the consumer mode that
matches their Clerk instance (usually `open`).

---

## Web environment (`apps/web`)

Copy `apps/web/.env.example` and set:

| Var | Required | Example |
|---|---|---|
| `NEXT_PUBLIC_SITE_MODE` | yes | `open` (main) / `invitation` (dev) / `public` (marketing-only) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes (auth builds) | `pk_live_...` / `pk_test_...` |
| `CLERK_SECRET_KEY` | yes (server routes) | `sk_live_...` / `sk_test_...` |
| `NEXT_PUBLIC_API_URL` | yes | `https://api.equiscore.app/api/v1` |
| `NEXT_PUBLIC_CONSUMER_APP_URL` | yes (partners host) | `https://equiscore.app` (prod) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | optional | `G-...` |

> **main vs dev use different Clerk instances.** Each deploy gets that instance's
> publishable + secret keys.

## API environment (`apps/api`)

See `apps/api/.env.example`. The deploy-critical ones:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection |
| `CLERK_SECRET_KEY` | Verify Clerk JWTs + backend user lookup |
| `CLERK_ISSUER` | JWT `iss` claim → JWKS endpoint |
| `ADMIN_APP_URL` | Internal-admin invite email CTA |
| `PARTNER_APP_URL` | Partner invite email CTA |
| `DEV_APP_URL` | Dev-access invite sign-up link (`https://dev.equiscore.app`) |
| `RESEND_API_KEY` + `INVITE_EMAIL_FROM` | Invite email delivery (optional; if unset, invite links are returned for manual copy) |

---

## Clerk Dashboard settings (NOT in code)

These are the things the repo cannot fix for you. Get them right per instance.

### 1. Allowed Origins / Redirect URLs
Add **every host** that uses the instance to **Allowed Origins** (and to the
sign-in/sign-up redirect allow-list):
- Production instance: `https://equiscore.app`, plus `admin.equiscore.app` and
  `partners.equiscore.app` if they share the prod instance.
- Dev instance: `https://dev.equiscore.app`.

### 2. Email verification strategy (fixes the duplicate code email)
Under **User & Authentication → Email → Email verification**, set **exactly one**
strategy. Having two enabled (e.g. email code *and* email link) is what causes
the duplicate verification email. The `<SignUp>`/`<SignIn>` components in this
repo are bare on purpose — do **not** add verification props to the components to
"fix" this; fix it here.

### 3. Two instances for main vs dev
`equiscore.app` (open) and `dev.equiscore.app` (invite-only) use separate Clerk
instances. This is intentional: dev stays closed to the public regardless of
sign-up config, because the dev gate (§5 of ARCHITECTURE) blocks uninvited
sign-ups at the app layer too.

---

## Database

Migrations are in `packages/database/prisma/migrations/`. On each deploy that
points at its own DB, run:

```bash
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npx prisma generate   --schema packages/database/prisma/schema.prisma
```

`nixpacks.toml` already runs `prisma generate` during the API build. If you add a
migration, it applies on the next deploy that runs `migrate deploy`.

> If main and dev share a DB, a migration applied once covers both. If they use
> separate DBs, run `migrate deploy` against each. Never delete an applied
migration.

---

## Deploy checklist (new environment)

- [ ] Web env set, with the correct `NEXT_PUBLIC_SITE_MODE` + Clerk instance keys.
- [ ] API env set, including `DEV_APP_URL` if dev-access invites will be sent.
- [ ] Clerk instance: host added to **Allowed Origins**.
- [ ] Clerk instance: **single** email verification strategy configured.
- [ ] DB reachable from API; `prisma migrate deploy` run.
- [ ] `RESEND_API_KEY` + `INVITE_EMAIL_FROM` set, OR accept that invite emails
      won't send (links are still returned for manual copy in the admin UI).
- [ ] Smoke test: sign-up path matches the site mode (open = anyone; dev =
      invite link required).
