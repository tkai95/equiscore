/**
 * Status model — one source of truth for meaning → presentation.
 *
 * The dashboard distinguishes three separate concepts that were previously
 * conflated (see the redesign brief §2.2):
 *   - Portfolio status: how far through building the profile the user is.
 *   - Assessment confidence: how much EquiScore trusts the assessment.
 *   - Sharing status: whether the portfolio can technically be shared.
 *
 * Each dimension of the assessment also carries a status that is distinct from
 * its numeric score, so a missing value is never rendered as a zero (§10).
 *
 * Class strings are written in full (never concatenated) so Tailwind's content
 * scanner keeps them. Colours map to the semantic tokens in tailwind.config.ts.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type PortfolioStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'needs_updating'
  | 'expired'

export type AssessmentConfidence = 'high' | 'moderate' | 'limited' | 'insufficient'

export type SharingStatus =
  | 'unavailable'
  | 'available'
  | 'available_with_warning'
  | 'actively_shared'
  | 'expired'

export type DimensionStatus =
  | 'strong'
  | 'good'
  | 'moderate'
  | 'weak'
  | 'at_risk'
  | 'action_required'
  | 'not_assessed'
  | 'insufficient_evidence'
  | 'pending'

/** How a status should be dressed: text + colour classes + a bar tone. */
export interface StatusPresentation {
  label: string
  /** Badge/pill classes (bg + text + ring) — full literals for Tailwind. */
  badge: string
  /** Progress-bar fill colour. */
  bar: string
  /** Small dot colour (for legends / inline markers). */
  dot: string
  /** Semantic tone, for callers that pick their own treatment. */
  tone: 'success' | 'warn' | 'danger' | 'neutral' | 'brand'
}

// ── Shared tone → classes ────────────────────────────────────────────────────

const TONE: Record<StatusPresentation['tone'], Omit<StatusPresentation, 'label' | 'tone'>> = {
  success: {
    badge: 'bg-success-bg text-success-fg ring-success-border',
    bar: 'bg-success',
    dot: 'bg-success',
  },
  brand: {
    badge: 'bg-brand-100 text-brand ring-brand/20',
    bar: 'bg-brand',
    dot: 'bg-brand',
  },
  warn: {
    badge: 'bg-warn-bg text-warn-fg ring-warn-border',
    bar: 'bg-warn',
    dot: 'bg-warn',
  },
  danger: {
    badge: 'bg-danger-bg text-danger-fg ring-danger-border',
    bar: 'bg-danger',
    dot: 'bg-danger',
  },
  neutral: {
    badge: 'bg-gray-100 text-gray-500 ring-gray-200',
    bar: 'bg-gray-300',
    dot: 'bg-gray-300',
  },
}

function present(tone: StatusPresentation['tone'], label: string): StatusPresentation {
  return { label, tone, ...TONE[tone] }
}

// ── Presentation maps ────────────────────────────────────────────────────────

export const PORTFOLIO_STATUS: Record<PortfolioStatus, StatusPresentation> = {
  not_started: present('neutral', 'Not started'),
  in_progress: present('warn', 'In progress'),
  complete: present('success', 'Complete'),
  needs_updating: present('warn', 'Needs updating'),
  expired: present('danger', 'Expired'),
}

export const ASSESSMENT_CONFIDENCE: Record<AssessmentConfidence, StatusPresentation> = {
  high: present('success', 'High confidence'),
  moderate: present('brand', 'Moderate confidence'),
  limited: present('warn', 'Limited confidence'),
  insufficient: present('neutral', 'Insufficient evidence'),
}

export const SHARING_STATUS: Record<SharingStatus, StatusPresentation> = {
  unavailable: present('neutral', 'Not available to share'),
  available: present('success', 'Available to share'),
  available_with_warning: present('warn', 'Available with warning'),
  actively_shared: present('brand', 'Access active'),
  expired: present('neutral', 'Access expired'),
}

export const DIMENSION_STATUS: Record<DimensionStatus, StatusPresentation> = {
  strong: present('success', 'Strong'),
  good: present('brand', 'Good'),
  moderate: present('warn', 'Moderate'),
  weak: present('warn', 'Needs attention'),
  at_risk: present('danger', 'At risk'),
  action_required: present('warn', 'Action required'),
  not_assessed: present('neutral', 'Not assessed'),
  insufficient_evidence: present('neutral', 'Insufficient evidence'),
  pending: present('neutral', 'Pending analysis'),
}

// ── Derivations ──────────────────────────────────────────────────────────────

/**
 * Map a numeric dimension score to a status. Callers pass `assessed: false`
 * when the dimension could not be evaluated (no evidence) so a genuine zero is
 * never confused with "not assessed".
 */
export function dimensionStatusFor(
  score: number | null,
  opts: { assessed?: boolean; adverse?: boolean } = {},
): DimensionStatus {
  const { assessed = true, adverse = false } = opts
  if (!assessed || score === null) return 'not_assessed'
  if (adverse) return 'at_risk'
  if (score >= 75) return 'strong'
  if (score >= 55) return 'good'
  if (score >= 40) return 'moderate'
  return 'action_required'
}

/** Confidence in the overall assessment, from the weakest verification signals. */
export function confidenceFor(opts: {
  hasScore: boolean
  identityVerified: boolean
  incomeConfirmed: boolean
  verificationScore: number
}): AssessmentConfidence {
  if (!opts.hasScore) return 'insufficient'
  if (opts.identityVerified && opts.incomeConfirmed && opts.verificationScore >= 70) return 'high'
  if (opts.identityVerified && opts.verificationScore >= 55) return 'moderate'
  if (opts.verificationScore >= 30) return 'limited'
  return 'insufficient'
}
