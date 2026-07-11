# EquiScore Compass — Roadmap

Compass is the financial-clarity/coaching layer of EquiScore. It is a
read/derive layer over the deterministic insight engine (`apps/api/src/insights/engine`)
plus its own persisted state, gated behind `User.compassEnabled`.

## Shipped

- **MVP 1 — Foundation** (`aae905b`): Overview, Money Map, Income, Spending
  (drawers), Bills & Commitments, Resilience (savings rate, emergency-buffer
  runway, best/tightest month), Monthly Review, EquiScore Impact, derived
  Savings Opportunities.
- **MVP 2 — Renewals & Reminders** (`40eb592`): confirm/deactivate a detected
  commitment, set a renewal date → reminders at 60/30/7 days, surfaced in-app.
- **MVP 3 — Monthly Review depth** (`40eb592`): month-over-month category
  drivers ("what moved").
- **MVP 4 — Savings Plan** (`40eb592`): emergency-buffer + custom goals with
  gap, timeline, and a what-if contribution; opportunity dismissal.

Models: `CommitmentSetting`, `Reminder`, `SavingsGoal`, `CompassDismissal`
(all user-scoped, cascade). Every endpoint is behind the `compassEnabled` gate
and scoped to the authed user.

## Deferred — come back to these

### 1. Provider Comparison / Marketplace (MVP 5) — biggest piece
Turn Compass's detected bills into a privacy-preserving "you could switch and
save" flow. **The inputs already exist**: each commitment carries a category,
`monthlyEquivalent`, and (via `CommitmentSetting`) a renewal date; the
opportunities engine already emits `review_mobile_broadband`, `review_energy`,
`review_subscriptions` with a `linkedKey`. Those are the entry points.

The genuinely hard parts are **not** the software — they are offer sourcing
(partner/affiliate feeds or a maintained catalog), consent/compliance, and
affiliate revenue plumbing. See the detailed plan below.

Non-negotiable boundaries:
- Never share bank transactions. Only derived fields (current provider name,
  monthly amount, renewal date, category), and only with explicit consent.
- Affiliate/referral relationships disclosed on every offer.
- Comparison and referrals must NOT affect the EquiScore. Dismissing an offer
  must not affect the score.
- Regulated verticals (loans, credit cards, insurance advice, investments,
  mortgages, pensions) need FCA consideration — avoid at MVP or route through an
  FCA-authorised partner. Start with energy / mobile / broadband / subscriptions,
  and language stays "compare options", never "you should switch".

Build sequence:
- **Phase A (validate UX, no partners):** static curated offer catalog for ONE
  vertical (mobile), `MarketplaceConsent` model, `GET /compass/compare/:vertical`,
  UI entry from the existing mobile opportunity, disclosure copy.
- **Phase B:** add energy + broadband; `ComparisonReferral` click tracking;
  wire the renewal reminder to "compare before it renews".
- **Phase C:** real aggregator/partner API behind a `ComparisonProvider`
  interface (swap the static catalog out).
- **Phase D (separate track):** regulated verticals via an FCA-authorised
  partner.

Proposed models: `ProviderOffer` (vertical, providerName, planName,
monthlyPrice, terms, url, isAffiliate, disclosure), `MarketplaceConsent`
(userId, vertical, scope, grantedAt, revokedAt), `ComparisonReferral` (userId,
offerId, vertical, clickedAt, status, referralFee?).

#### Where the offer data comes from (existing rails)
Two sourcing models, behind the same `ComparisonProvider` interface:

**A. Affiliate product feeds — cheapest, DIY, we own the ranking.**
Join an affiliate network as a *publisher* (free / small refundable deposit),
pull their product feed, ingest into `ProviderOffer`, deep-link with our
affiliate ID, earn commission per sale.
- **Awin** — dominant UK network; carries BT, Virgin Media, Vodafone, ID Mobile,
  Carphone Warehouse etc. Has an **enhanced telco data feed** you can filter by
  contract type (SIM-only, PAYG, mobile broadband) and deal type
  (consumer/upgrade/business) + a product-feed API. Best fit for **mobile/SIM
  and broadband**.
- Also Impact, CJ, Rakuten, Webgains, Tradedoubler.
- Caveat: an affiliate panel is a *subset* of the market, not whole-of-market —
  so "cheapest" = "cheapest we can see"; must be disclosed honestly.

**B. White-label / comparison-as-a-service APIs — turnkey, revenue-share, whole-of-market.**
They own the data + ranking + switching journey + much of the compliance; they
pay us commission per switch. Less engineering, a commercial deal instead.
- **Uswitch Energy Partners API** (`api-docs.partners.uswitch.com`) — energy
  plans, whole-of-market data, self-hosted comparison + switching journey.
- **Switchcraft** — energy + broadband API and white-label; panel of supplier
  relationships, pays commission per switch.
- **Decision Tech** — MoneySuperMarket's platform (also powers MSE) offered to
  partners via white-label/API.
- **Grid53** — energy tariff APIs + live pricing.
- **Stickee Comparison** — broadband + mobile deals APIs.

**Recommended split:**
- **Broadband / mobile / SIM →** Awin affiliate feed (cheapest, we rank by
  price vs the user's detected monthly spend, which Compass already knows).
- **Energy →** a white-label API (Uswitch / Switchcraft / Decision Tech).
  Energy "cheapest" depends on the user's kWh usage and switching is regulated,
  so a real API beats a static feed.
- **Insurance / regulated →** defer; route via an FCA-authorised partner.
- **Validate the UX first →** a free hand-maintained static catalog for one
  vertical before signing up to anything.

### 2. Reminder delivery: email / push
Reminders are in-app only today (they surface when their window opens; no
scheduler needed for that). Email/push needs an email/notification provider and
a cron/worker to send at each offset. Model support (`Reminder.offsetDays`,
`triggerAt`, `status`) is already there.

### 3. Per-transaction user corrections (category / merchant reclassification)
The vision's general `UserCorrection`. Today, reclassification runs through the
Insights **question** mechanism (`InsightQuestionAnswer` + `ProfileContext.answers`)
— confirm/deactivate a commitment and "who is this transfer to?" already work.
A general per-transaction category override needs the engine to consume a new
correction source; overlaps with the question mechanism, so design them together.

### 4. Per-goal earmarked-balance tracking
Custom savings goals currently track from contributions only (`currentSaved = 0`);
only the emergency-buffer goal maps to the live liquid balance. Real per-goal
progress needs either a linked savings pot/account or a running contributed-amount
ledger.

### 5. Monthly Review — deeper drivers
Category drivers are month-over-month on a single consistent basis. A "vs your
usual" driver (against a trailing average) needs the engine to expose a
per-month, per-category series on the same netted/answer-adjusted basis the
profile uses (a new `InsightsService` method) so the two operands reconcile.
