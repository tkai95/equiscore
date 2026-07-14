# EquiScore Consumer Workspace - Navigation and Readiness Roadmap

Date: 2026-07-13

## Direction

The consumer app should organise around plain-language user jobs:

1. Home - what is happening now, and what should the user care about.
2. Trust Profile - what EquiScore says about the user, and why.
3. Goals - what the user is trying to do, and whether they are ready.
4. My Money - how the user manages money over time.
5. To do - what needs completing, fixing or responding to.
6. Sharing - how the user creates, controls and tracks access.

Compass remains the guidance/data engine, but it should not be the primary
navigation label. Its outputs can appear as recommendations inside Goals,
My Money, To do and Sharing.

## Built In First Slice

- Consumer sidebar simplified to Home, Trust Profile, Goals, My Money, To do and Sharing.
- Trust Profile now has canonical routes:
  - `/dashboard/trust-profile/assessment`
  - `/dashboard/trust-profile/financial-profile`
- Legacy routes redirect:
  - `/dashboard/trust-score` -> `/dashboard/trust-profile/assessment`
  - `/dashboard/analytics` -> `/dashboard/trust-profile/financial-profile`
  - `/dashboard/actions` -> `/dashboard/to-do`
  - `/dashboard/compass` -> `/dashboard/my-money`
- Action Centre copy and route changed to To do.
- Financial Insights copy changed to Financial Profile.
- Compass UI repackaged as My Money with four tabs:
  - Overview
  - Income & spending
  - Bills & calendar
  - Savings & resilience
- Goals page introduced with first Rental Readiness view using existing insight data.

## Built In Persistence Slice

- Added a persistent `consumer_goals` table for user-scoped readiness goals.
- Added authenticated `/api/v1/goals/primary` read/write endpoints.
- Rental Readiness now saves target monthly rent, move date, application type,
  deposit available and notes.
- Saved target rent now feeds the readiness logic and target rent-to-income
  metrics.
- Production database migration `20260713203000_consumer_goals` has been
  applied.

## Built In Multi-Goal Slice

- Goals now behave as a goal portfolio rather than a single rental-readiness
  page.
- Consumers can save multiple active goals:
  - rent a home
  - open or recover banking access
  - set up utilities or a phone contract
  - prepare for future credit
  - prove income clearly
  - strengthen the overall Trust Profile
- One active goal can be marked as the focus goal.
- The Goals API now supports listing saved goals, updating a specific goal
  type, and setting the focus goal.
- The Goals UI now shows a selectable goal library, active/focus status, saved
  notes, and goal-specific readiness signals.
- Existing financial evidence is interpreted differently per goal, instead of
  forcing every outcome through the rental-readiness lens.

## Built In Goal Action Slice

- Added a first deterministic Goal Plan layer inside Goals.
- Goals now surface practical inferred actions such as:
  - close a target-rent affordability gap
  - review flexible bills and subscriptions
  - build a visible buffer from available monthly surplus
  - create a clean-payment streak after returned payments or overdraft reliance
  - strengthen identity or document evidence
  - extend evidence history
  - prepare a rental share pack when ready
- Money-related cards show planning estimates, not provider recommendations.
- This creates the future slot for comparison/affiliate offers and AI strategy
  explainers without making the current product depend on marketplace data or
  regulated advice.

## Built In Goals Portfolio Slice

- Reworked the Goals landing experience from a permanent template grid into a
  portfolio-first view.
- Active saved goals now appear as individual rows with:
  - goal title
  - target and deadline metadata
  - feasibility status
  - progress or evidence signal
  - estimated monthly requirement
  - main blocker
  - next action
- Moved goal templates into an Add goal drawer so templates are creation inputs,
  not the main navigation model.
- Added first deterministic portfolio intelligence:
  - estimated monthly requirement across active goals
  - estimated sustainable monthly goal capacity
  - estimated shortfall
  - simple conflict count when monthly requirements exceed capacity
- Rental goals now estimate upfront cash required, remaining gap and monthly
  funding requirement based on the saved target rent, deposit available and move
  date.
- The selected goal workspace now shows monthly need, progress and current
  blocker before the longer evidence and action sections.
- Draft goal details now feed the readiness calculation immediately, so a typed
  but unsaved target no longer contradicts the on-page guidance.
- Removed visible Focus controls from the consumer UI. Primary goal support
  remains in the backend for later prioritisation logic.

## Built In Goal Instances Slice

- Migrated `consumer_goals` from one row per user/type to true goal instances by
  removing the user/type uniqueness constraint.
- Added instance-level planning fields:
  - `title`
  - `priority`
  - `targetDate`
  - `targetAmount`
  - `currentAmount`
  - `monthlyContribution`
  - `reservedFunds`
  - `assumptions`
  - `completedAt`
- Backfilled existing saved goal titles from the previous `label` field.
- Added `POST /goals`, `PUT /goals/:goalId` and `POST /goals/:goalId/primary`
  so the consumer app can create and update specific goal instances.
- Kept the previous type-based goal endpoints as compatibility shims.
- Updated the Goals UI to create new goal instances from the Add goal drawer,
  select saved goals by id, and support multiple active goals from the same
  template.
- Added goal name and priority controls to the detail workspace so duplicate
  goals can be distinguished by purpose.

## Built In Rental Readiness Depth Slice

- Added a rental-specific detail section inside the selected goal workspace.
- Rental goals now show deeper planning figures:
  - estimated upfront cash need
  - deposit or upfront cash gap
  - monthly funding required before the move date
  - target rent to verified income
  - target rent headroom against estimated sustainable rent
- Added a required vs optional rental evidence checklist covering:
  - target rent
  - move date
  - application type
  - income evidence
  - affordability
  - upfront cash
  - rent-payment history
  - identity confidence
  - supporting documents
- Added "how a letting agent may view this" guidance with recipient-facing
  watchouts.
- Added explicit calculation assumptions so rental readiness is presented as a
  planning estimate, not a guarantee of acceptance.

## Product Boundaries

Assessment is the formal EquiScore conclusion.

Financial Profile is the factual financial behaviour behind the conclusion:
income sources, affordability, rent-to-income, payment consistency, overdraft
use, failed payments, data coverage and important anomalies.

Goals is outcome-led. It translates the Trust Profile into a use case such as
renting a home, recovering banking access, setting up utilities, or preparing
for future credit.

My Money is ongoing and behaviour-led. It helps the user understand income,
spending, bills, calendar, savings and resilience.

To do is the action queue. Evidence uploaded through To do should appear
contextually in Assessment, Financial Profile, Goals and Sharing rather than
living as a top-level "Evidence" destination.

Sharing is a core product workflow. It should support generic shares, goal-
specific share packs, partner-requested shares, active access, requests and
history.

## Next Build Slices

1. Connect Goals to Sharing:
   - Create a rental share-pack mode.
   - Create a generic goal share-pack structure that can later support banking,
     utilities, phone, income-proof and credit-readiness use cases.
   - Preview what the recipient sees.
   - Show limitations and evidence confidence before sharing.

2. Add solution opportunities:
   - Add a provider/comparison abstraction for non-regulated switching first:
     subscriptions, mobile, broadband and energy.
   - Keep affiliate/commercial disclosure visible on any monetised action.
   - Add click/referral tracking without changing EquiScore readiness itself.
   - Add AI explanations on top of deterministic calculations, not instead of
     them.

3. Add contextual supporting information:
   - Keep bank connections and documents as functional routes.
   - Surface them from Financial Profile, Goals and To do instead of top-level navigation.

4. Refine Home:
   - Show current goal status.
   - Show one money insight.
   - Show only genuinely actionable To do items.
   - Show recent activity such as share created, recipient viewed, assessment updated.

5. Later:
   - Scenario planning for rental goals.
   - Banking access readiness.
   - Utilities or phone contract readiness.
   - Future credit readiness.
   - Optional traditional credit-file module, subject to compliance and provider choice.
