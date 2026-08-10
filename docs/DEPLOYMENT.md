# Deployment

One Next.js build is deployed to multiple hosts. Behaviour is selected by env
vars at build/runtime, not by branches or separate apps. Read
[ARCHITECTURE.md](./ARCHITECTURE.md) §3–5 for *why*; this doc is the *how*.

---

## Hosts and modes

| Host | `NEXT_PUBLIC_SITE_MODE` | Clerk instance | Notes |
|---|---|---|---|
| `equiscore.app` | `open` | **Production** | Open sign-up. Marketing + waitlist + dashboard. |
| `staged.equiscore.app` | `open` | **Production** | Pre-prod preview of the real site. Same build/mode as main; not invite-gated. |
| `dev.equiscore.app` | `invitation` | **Dev (separate)** | Invite-only. Same build; sign-up + dashboard gated. |
| `admin.equiscore.app` | (host-routed) | shared with consumer | Rewrites to `/admin`; `InternalAdminGuard` enforces access. |
| `partners.equiscore.app` | (host-routed) | shared with consumer | Rewrites to `/workspace`; org membership enforces access. |

`staged` and the main site run the **same** build and mode (`open`) — staged is
just an extra deploy for previewing production before it ships. It needs no code
or middleware changes; only Clerk configuration (below) + its own env/DB as you
see fit (point it at a staging DB, or at prod read-only — your call).

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
- Production instance: `https://equiscore.app`, `https://staged.equiscore.app`,
  plus `admin.equiscore.app` and `partners.equiscore.app` if they share the prod
  instance.
- Dev instance: `https://dev.equiscore.app`.

### 2. Email verification strategy (fixes the duplicate code email)
Under **User & Authentication → Email → Email verification**, set **exactly one**
strategy. Having two enabled (e.g. email code *and* email link) is what causes
the duplicate verification email. The `<SignUp>`/`<SignIn>` components in this
repo are bare on purpose — do **not** add verification props to the components to
"fix" this; fix it here.

### 3. Two instances for main vs dev
`equiscore.app` (open) and `dev.equiscore.app` (invite-only) use separate Clerk
instances. `staged.equiscore.app` shares the **production** instance (it's a
preview of prod). This is intentional: dev stays closed to the public regardless
of sign-up config, because the dev gate (§5 of ARCHITECTURE) blocks uninvited
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
- [ ] **Email deliverability — verified by inspecting a junked email's headers.**
      Resend authenticates correctly: SPF/DKIM/DMARC all `pass` (Resend uses
      `send.equiscore.app` as the envelope domain with its own SPF covering
      amazonses.com, and DKIM signs with `d=equiscore.app`). If mail still lands
      in Outlook/Hotmail junk, the cause is **SCL (content/reputation) filtering,
      NOT auth failure** — visible in the header as `X-MS-Exchange-Organization-SCL: 5`
      and `RF:JunkEmail`. Fixes are reputation/content, not DNS:
        1. Register the sending IP/domain with Microsoft's
           [SNDS](https://sendersupport.olc.protection.outlook.com/snds/) and
           JMRP to see reputation data and complaint rates.
        2. Warm the domain — send to engaged recipients first; reputation builds
           from opens/replies/"not spam" clicks over time.
        3. Deploy the email code fixes (PNG logo, reply-to, no `dev.` CTA links
           — broken images and dev-subdomain links are negative spam signals).
        4. `noreply@` From is a mild negative; set `EMAIL_REPLY_TO` to a
           monitored mailbox where possible.
      Do NOT change the apex SPF record — it is not the cause.
- [ ] `PUBLIC_APP_URL` set to the production consumer origin
      (e.g. `https://equiscore.app`) so email CTAs don't point to `dev.*`.
- [ ] Smoke test: sign-up path matches the site mode (open = anyone; dev =
      invite link required).

---

## Debugging production: how to review Railway logs

When something breaks in production (500 errors, sign-in failures, onboarding
not saving), the root cause is almost always in the **Railway API logs**. The
API runs on Railway (project `vigilant-vision`, service `equiscore`). Here's
how to read them.

### Method 1 — Railway Dashboard (visual)

1. Go to **railway.com** → open the **`vigilant-vision`** project.
2. Click the **`equiscore`** service.
3. Click the **Deployments** tab → the latest deployment → **View Logs**, OR
   use the **Logs** tab directly on the service for live runtime output.
4. Reproduce the error in your browser (e.g. trigger the failing onboarding
   save), then watch the Railway log panel — errors appear within ~1 second.
5. Look for red `[ERROR]` lines or stack traces (e.g. `PrismaClientKnownRequestError`,
   `Unhandled exception on PUT /api/v1/...`).

### Method 2 — Railway GraphQL API (automated / programmatic)

If you have a Railway API token (generate at railway.com → Account Settings →
API Tokens), you can pull logs programmatically. The endpoint is:

```
https://backboard.railway.app/graphql/v2
```

**Step-by-step:**

```bash
# 1. Find the service ID (the equiscore service inside the vigilant-vision project)
TOKEN="your-railway-token"
curl -s "https://backboard.railway.app/graphql/v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"query":"{ projects { edges { node { id name services { edges { node { id name } } } } } } }"}'

# 2. Get the latest deployment ID for the service
SERVICE_ID="19a26434-c84d-42cc-893d-7ca624b4bea6"
curl -s "https://backboard.railway.app/graphql/v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"query\":\"{ deployments(input: {serviceId: \\\"$SERVICE_ID\\\"}) { edges { node { id status createdAt } } } }\"}"

# 3. Fetch the runtime logs (use the deployment ID from step 2)
DEPLOYMENT_ID="the-deployment-id"
curl -s "https://backboard.railway.app/graphql/v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"query\":\"{ environmentLogs(environmentId: \\\"226056ad-c585-4b99-b2d4-af2277d49058\\\", afterLimit: 200, filter: \\\"\\\") { severity message timestamp } }\"}"
```

**Key IDs for the equiscore project:**
- Project: `vigilant-vision` (`a9237cdd-f741-4bb9-9d30-1cd20d65ce0f`)
- Service: `equiscore` (`19a26434-c84d-42cc-893d-7ca624b4bea6`)
- Production environment: `226056ad-c585-4b99-b2d4-af2277d49058`

**Two log endpoints exist:**
- `deploymentLogs(deploymentId, limit)` — boot/build logs (NestJS route
  mapping, startup). Capped at the boot sequence.
- `environmentLogs(environmentId, afterLimit, filter)` — **live runtime logs**
  (actual errors, API requests, Prisma errors). This is where production 500s
  show up. Use this for debugging.

### Method 3 — From the browser (Network tab)

If you can't access Railway, open DevTools (F12) → **Network** tab → trigger
the error → click the red request → **Response** tab. The JSON response body
often contains the error message (e.g. `{"message":"Invalid or expired token"}`).
Less detailed than Railway logs, but immediate.

### What to look for

| Error pattern | Likely cause |
|---|---|
| `PrismaClientKnownRequestError: Unique constraint` | Email/ID collision (shared DB + multi-instance) |
| `Unhandled exception on PUT /api/v1/profile/onboarding` | Look at the stack trace line — usually a DB constraint or type error |
| `Invalid or expired token` | Clerk instance mismatch (frontend mints prod tokens, API verifies dev JWKS) |
| `CORS: origin ... not allowed` | Missing host in the API CORS allow-list (`main.ts`) |
| `Statement reading is not available` | Missing `ANTHROPIC_API_KEY` on the API service |
| `Timed out while reading the statement` | PDF extraction exceeded the staleness ceiling |

### Important: the GlobalExceptionFilter

The API has a `GlobalExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`)
that **logs the full stack trace** of non-HTTP exceptions to the Railway logs.
This was added specifically because 500s were previously swallowed silently.
If you see a 500 but no log detail, check that the filter is registered in
`main.ts` via `app.useGlobalFilters(new GlobalExceptionFilter())`.

