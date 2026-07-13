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

1. Build goal-specific depth:
   - Add clearer readiness explanations for each active goal.
   - Add required vs optional evidence checklists per goal.
   - Add "how the recipient may view this" summaries per goal type.
   - Keep Rental Readiness as the first deep implementation.
   - Compare target rent against income, current commitments and detected headroom.
   - Add "how a letting agent may view this" summary.

2. Connect Goals to Sharing:
   - Create a rental share-pack mode.
   - Create a generic goal share-pack structure that can later support banking,
     utilities, phone, income-proof and credit-readiness use cases.
   - Preview what the recipient sees.
   - Show limitations and evidence confidence before sharing.

3. Add contextual supporting information:
   - Keep bank connections and documents as functional routes.
   - Surface them from Financial Profile, Goals and To do instead of top-level navigation.

4. Refine Home:
   - Show current goal status.
   - Show one money insight.
   - Show only genuinely actionable To do items.
   - Show recent activity such as share created, recipient viewed, assessment updated.

5. Later:
   - Banking access readiness.
   - Utilities or phone contract readiness.
   - Future credit readiness.
   - Optional traditional credit-file module, subject to compliance and provider choice.
