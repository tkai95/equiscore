# EquiScore — Profile, Account Menu & Settings Redesign PRD

**Status:** Ready for engineering
**Priority:** High
**Source:** Full PRD drafted 2026-08; captured here so the design intent and
decisions are durable.

## Primary objective

Make Profile and Settings feel like **one coherent EquiScore experience**
rather than a combination of product screens, duplicated information, and
third-party (Clerk) account management.

> Every piece of information must have **one canonical home.**

## Desired mental model

| Area | User question it answers |
|---|---|
| Home | What should I do next? |
| Trust Profile | How am I being assessed? |
| My Money | What financial data have I connected? |
| To do | What needs my attention? |
| Sharing | Who can access my information? |
| **My Profile** | What information does EquiScore know about me? |
| **Settings** | How does my EquiScore account behave? |

The distinction between **Profile** (the consumer's EquiScore information) and
**Account** (authentication and account administration) must be unambiguous
and consistent across UI, routes, and the data model.

## Naming discipline (critical)

- **"Profile"** = the consumer's EquiScore information (name, DOB, address…)
- **"Account"** = authentication & account administration (email, password, sessions)
- **"Trust Profile"** = EquiScore's assessment/profile output (score, evidence)

These three must never be used interchangeably.

---

## Architecture decisions (resolved)

These were the open forks in the PRD review. Resolved as follows:

1. **Name sync** — EquiScore Profile is the source of truth for the user's
   display name (`firstName`/`lastName`). Clerk holds authentication identity
   only; its name field is set once at sign-up and not surfaced for editing.
   No continuous sync for now.
2. **Clerk integration depth** — Phase 4 uses Option B (heavily customised
   Clerk components, not the raw `<UserProfile />` popup) as the interim.
   Full Clerk-API-built UI (Option A) is a later refinement.
3. **Notifications** — Deferred beyond Phase 3. No notification model in the
   schema yet; add a `NotificationPreferences` table when notification
   delivery is actually wired (email/push). Phase 3 leaves a placeholder nav
   item.
4. **Route renames** — Keep existing routes (`/dashboard/my-money`,
   `/dashboard/to-do`, `/dashboard/share`). Avoid renaming during this
   redesign (bookmark/redirect risk); revisit separately.
5. **Analytics events** — Instrumented as part of each phase (e.g.
   `account_menu_opened` lands with Phase 1), not as a separate batch.

---

## Implementation phases

### Phase 0 — Cleanup (pre-phase)

Pure removals, zero risk:
- Remove **Profile Progress** from Settings (it's not a setting).
- Remove **Manage share links** from Settings (Sharing owns that).
- Remove **Edit profile information** from Settings (Profile owns that).

### Phase 1 — Account menu + navigation

- Replace Clerk's `<UserButton>` with a custom `<AccountMenu />`.
- Menu items: **Profile**, **Settings**, **Help & support**, **Sign out**.
- Opens above the identity chip; closes on outside-click / Escape.
- Desktop: bottom-left sidebar chip. Mobile: accessible from the nav drawer.
- Sign out calls `useClerk().signOut()`.
- Analytics: `account_menu_opened`, `account_menu_*_clicked`,
  `account_menu_signout_clicked`.

### Phase 2 — Profile redesign

- `/dashboard/profile` becomes section cards: Personal, Address, Employment &
  income, (Identity where appropriate).
- Every editable section uses the same right-side **EditDrawer** (Cancel/Save,
  dirty-state warn, Escape closes, success toast).
- Header: "Information used to build your Trust Profile." + completeness as
  secondary, not dominant.
- Empty states: "Not added" + Add affordance, not bare em-dashes.
- Address becomes editable (currently created at onboarding, never editable).
- Analytics: `profile_edit_started`, `profile_edit_saved`, `profile_edit_failed`.

### Phase 3 — Settings rebuild

- Internal secondary nav: Account · Security · Notifications · Privacy & data ·
  Preferences.
- **Account:** sign-in email, member since, connected sign-in methods
  (read-only summary; management lives in Security).
- **Security:** password, 2-step verification, connected sign-in methods,
  active sessions. Surfaced via customised Clerk elements (Option B), not the
  raw `<UserProfile />`.
- **Privacy & data:** download my data, delete account (destructive flow with
  reauth + confirmation).
- Notifications/Preferences: placeholder until the notification model exists.
- All setting rows use one shared `<SettingsRow />` component.
- Analytics: `settings_section_viewed`, `security_change_*`, `data_export_*`,
  `account_delete_*`.

### Phase 4 — Clerk de-branding / integration

- No full Clerk `<UserProfile />` / account modal in standard journeys.
- Expose Clerk capabilities (password change, email change, OAuth connect,
  MFA, sessions) through EquiScore-styled UI.
- Test: password change, email change, OAuth connect/disconnect, MFA,
  session revoke, deletion/reauth.
- Retain Clerk's underlying security controls (reauth on sensitive ops).

---

## Explicit removals from current product

| Current | Action |
|---|---|
| Settings → Profile Progress | Remove (move high-level state to Home; actions to To do) |
| Settings → Edit profile information | Remove (Profile owns edits) |
| Settings → Manage share links | Remove (Sharing owns links) |
| Full Clerk account popup in standard journeys | Remove from standard flows |
| Duplicated name/profile data | Resolve: Profile is canonical |

## Acceptance criteria (summary)

- Clicking the bottom-left chip opens the EquiScore-owned account menu.
- Menu shows Profile, Settings, Help, Sign out — and Clerk UI does NOT appear
  merely by opening Profile or Settings.
- Profile contains grouped, consistently-editable sections with drawers.
- Settings contains only account configuration; no profile progress, no share
  management, no inline profile editing.
- All setting rows share one design system; no full Clerk interface appears.
- Direct routes (`/dashboard/settings/security` etc.) work from bookmarks.
- Mobile has an appropriate settings nav pattern.
- **UX test:** a user can answer "where do I change my address / password /
  connect my bank / see what's incomplete / manage sharing / change
  notifications / sign out" without needing two possible locations explained.

## Analytics events (per phase)

| Event | Purpose | Phase |
|---|---|---|
| `account_menu_opened` | discoverability | 1 |
| `account_menu_profile_clicked` | profile entry | 1 |
| `account_menu_settings_clicked` | settings entry | 1 |
| `account_menu_signout_clicked` | session | 1 |
| `settings_section_viewed` | navigation usage | 3 |
| `profile_edit_started` | edit intent | 2 |
| `profile_edit_saved` | completion | 2 |
| `profile_edit_failed` | errors | 2 |
| `security_change_started` | security flow | 3/4 |
| `security_change_completed` | completion | 3/4 |
| `data_export_requested` | privacy | 3 |
| `account_delete_started` | risk | 3 |
| `account_delete_completed` | closure | 3 |

Never send sensitive field values into analytics.

## Shared components (engineering)

`<AccountMenu />`, `<SettingsLayout />`, `<SettingsSidebar />`,
`<SettingsSection />`, `<SettingsRow />`, `<ProfileSectionCard />`,
`<ProfileField />`, `<EditDrawer />`, `<StatusBadge />`, `<ConfirmDialog />`,
`<EmptyField />`, `<DestructiveAction />`.

## Data ownership mapping

| Field | Source of truth |
|---|---|
| Sign-in email | Clerk |
| Authentication methods | Clerk |
| Password | Clerk |
| Sessions | Clerk |
| Full legal name | EquiScore profile (firstName/lastName) |
| DOB | EquiScore profile |
| Address | EquiScore profile |
| Residency | EquiScore profile |
| Income | EquiScore profile / financial engine |
| Bank connections | EquiScore (statements) |
| Sharing links | EquiScore sharing |
| Notifications | EquiScore preferences (future) |

## Related docs

- [CONSUMER_WORKSPACE_ROADMAP.md](./CONSUMER_WORKSPACE_ROADMAP.md) — overall
  consumer navigation + readiness roadmap.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — auth model, site modes, invariants.
