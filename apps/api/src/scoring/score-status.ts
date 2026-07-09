/**
 * Score freshness and recipient-facing display status.
 *
 * Two rules drive everything here:
 *
 *   1. Validity is anchored to the latest date the *evidence covers*, never to
 *      when it was uploaded or computed. A statement uploaded today that ends
 *      six months ago buys no freshness.
 *
 *   2. A recipient view is never served from a frozen snapshot. It resolves the
 *      applicant's latest score and evaluates its evidence live. Because
 *      removing evidence always triggers a recompute, a withdrawn bank cannot
 *      back the latest score — the arithmetic closes the hole, not a banner.
 *
 * `evidence_withdrawn` therefore exists as a *safety net*: it only fires when a
 * manifest references a source that has since vanished, i.e. when a recompute
 * failed or never ran. It should be rare, and it is deliberately worded without
 * implying wrongdoing — withdrawing consent is a right, not a red flag.
 */

export const SCORE_VALIDITY_MONTHS = 3
export const EXPIRING_SOON_DAYS = 14

export type ScoreDisplayStatus =
  | 'current'
  | 'expiring_soon'
  | 'expired'
  | 'evidence_withdrawn'
  | 'insufficient_evidence'

export type EvidenceSourceType = 'open_banking' | 'pdf_statement' | 'document'

export interface EvidenceManifestEntry {
  evidenceSourceId: string
  type: EvidenceSourceType
  /** Latest date this source's data covers. Null for non-financial evidence. */
  coverageEnd: string | null
  statusAtComputation: 'active'
}

/** Financial evidence is what anchors freshness; identity documents do not. */
export function isFinancialEvidence(type: EvidenceSourceType): boolean {
  return type === 'open_banking' || type === 'pdf_statement'
}

/**
 * Add whole calendar months, clamping to the last valid day of the target month
 * so 30 Nov + 3 lands on 28/29 Feb rather than spilling into March.
 */
export function addMonths(date: Date, months: number): Date {
  const day = date.getUTCDate()
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0)
  )
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target
}

/**
 * The score stays current through the *whole* of its final day: evidence up to
 * 30 Jun is current on 30 Sep and expired on 1 Oct.
 */
export function computeValidUntil(financialDataAsOf: Date | null): Date | null {
  if (!financialDataAsOf) return null
  const end = addMonths(financialDataAsOf, SCORE_VALIDITY_MONTHS)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

/** Latest coverage date across the financial evidence backing a score. */
export function computeFinancialDataAsOf(manifest: EvidenceManifestEntry[]): Date | null {
  const dates = manifest
    .filter((e) => isFinancialEvidence(e.type) && e.coverageEnd)
    .map((e) => new Date(e.coverageEnd as string).getTime())
  if (dates.length === 0) return null
  return new Date(Math.max(...dates))
}

export interface StatusInput {
  financialDataAsOf: Date | null
  validUntil: Date | null
  /** False when a source named in the manifest no longer exists. */
  manifestIntact: boolean
  now: Date
}

export function deriveScoreStatus(input: StatusInput): ScoreDisplayStatus {
  // Safety net first: a score referencing evidence that has vanished must never
  // be presented as current, whatever its dates say.
  if (!input.manifestIntact) return 'evidence_withdrawn'

  if (!input.financialDataAsOf || !input.validUntil) return 'insufficient_evidence'

  if (input.now.getTime() > input.validUntil.getTime()) return 'expired'

  const msLeft = input.validUntil.getTime() - input.now.getTime()
  const daysLeft = msLeft / (1000 * 60 * 60 * 24)
  if (daysLeft <= EXPIRING_SOON_DAYS) return 'expiring_soon'

  return 'current'
}

/** "Expiring soon" is still current — it is a warning, not an expiry. */
export function isCurrent(status: ScoreDisplayStatus): boolean {
  return status === 'current' || status === 'expiring_soon'
}

const MESSAGES: Record<ScoreDisplayStatus, string> = {
  current: 'Current Equiscore profile.',
  expiring_soon:
    'This profile is still current but will expire soon. Ask the applicant to refresh their financial evidence.',
  expired:
    'This score has expired. It was based on financial evidence up to the date shown. Ask the applicant to refresh their Equiscore.',
  evidence_withdrawn:
    'This profile is no longer current because evidence used to calculate it is no longer available. You may request an updated profile.',
  insufficient_evidence:
    'This profile is not backed by financial evidence. Ask the applicant to connect a bank account or upload a statement.',
}

export function statusMessage(status: ScoreDisplayStatus): string {
  return MESSAGES[status]
}
