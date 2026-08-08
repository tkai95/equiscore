// Centralised PostHog event tracking. One import, consistent naming, type-safe
// event names. If PostHog isn't loaded (no key / SSR), capture is a no-op.
//
// Event taxonomy follows the PRDs (CONSUMER_WORKSPACE_ROADMAP +
// PROFILE_ACCOUNT_SETTINGS_REDESIGN). Never send sensitive field values (PII,
// emails, financial figures) — only event names + non-sensitive properties.

type AnalyticsEvent =
  // Marketing / acquisition funnel
  | 'waitlist_started'
  | 'waitlist_submitted'
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  // Product activation
  | 'statement_uploaded'
  | 'score_generated'
  | 'share_link_created'
  // Account menu + settings
  | 'account_menu_opened'
  | 'account_menu_profile_clicked'
  | 'account_menu_settings_clicked'
  | 'account_menu_signout_clicked'
  | 'settings_section_viewed'
  | 'profile_edit_started'
  | 'profile_edit_saved'
  | 'profile_edit_failed'
  | 'security_change_started'
  | 'security_change_completed'
  // Privacy
  | 'data_export_requested'
  | 'account_delete_started'
  | 'account_delete_completed'

type EventProperties = Record<string, string | number | boolean | null | undefined>

export function track(event: AnalyticsEvent, properties?: EventProperties): void {
  if (typeof window === 'undefined') return
  try {
    // posthog is loaded by PostHogProvider on the client. Use the global to
    // avoid a hard dependency on the posthog-js import in every file.
    const posthog = (window as unknown as { posthog?: { capture: (e: string, p?: EventProperties) => void } }).posthog
    posthog?.capture(event, properties)
  } catch {
    // Never let analytics break the app
  }
}
