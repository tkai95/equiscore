// ─── Site modes ──────────────────────────────────────────────────────────────
// One Next.js build is deployed to multiple hosts. Behaviour differs by mode:
//
//   public      — pure marketing site, no auth. The legacy "equiscore.app" build.
//   open        — full product: marketing + waitlist + open Clerk sign-up.
//                 This is the production main site (equiscore.app).
//   invitation  — full product UI, but sign-up/sign-in are gated to users with a
//                 valid dev invite. This is the dev site (dev.equiscore.app).
//
// `NEXT_PUBLIC_SITE_MODE` selects the mode. When no Clerk publishable key is
// present the site always falls back to `public` (no auth surfaces render).

export const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

export type SiteMode = 'public' | 'open' | 'invitation'

export const siteMode: SiteMode = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_MODE
  if (raw === 'open' || raw === 'invitation' || raw === 'public') return raw
  // Unset: auth-less marketing build (no Clerk key) stays public; an authed
  // build with no explicit mode is treated as open for safety.
  return hasClerkPublishableKey ? 'open' : 'public'
})()

/** Pure marketing build — no auth, waitlist only. */
export const isPublicSite = siteMode === 'public' || !hasClerkPublishableKey
/** Production main — auth enabled, sign-up open to anyone. */
export const isOpenSite = siteMode === 'open'
/** Dev / staging — auth enabled but gated to invited users only. */
export const isInvitationSite = siteMode === 'invitation'

/** Auth (Clerk) surfaces render on open + invitation builds. */
export const hasAuth = hasClerkPublishableKey
/** Waitlist surfaces render on public + open, never on dev (invitation). */
export const showWaitlist = !isInvitationSite

// ─── Dev-only features ───────────────────────────────────────────────────────
// Some features are not yet ready for the public main site and are surfaced
// only on the invitation (dev) site while they're refined. The API + data
// layers stay always-on; gating is purely in the UI.
/**
 * Goals — hidden on the main/open site, shown only on dev (invitation) while
 * being refined. Do not delete the feature; flip this when ready for launch.
 */
export const showGoals = isInvitationSite
