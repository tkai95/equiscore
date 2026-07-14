import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { formatDate, TIER_COLORS } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TIER_LABELS } from '@equiscore/shared'
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  Home,
  Info,
  ShieldCheck,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react'
import { EquiScoreLogo } from '@/components/brand/logo'
import { Card, StatusPill, type StatusTone } from '@/components/ui'

type AffordabilityRating = 'comfortable' | 'manageable' | 'stretched' | 'at_risk'

interface RecipientInsight {
  monthsOfHistory: number
  income: {
    monthlyAverage: number
    character: string
    consistency: string
    recurringSalaryDetected: boolean
  }
  affordability: {
    rating: AffordabilityRating
    currentRent: number | null
    rentToIncome: number | null
    disposableIncome: number
    surplusAfterAll: number
    maxAffordableRent: number
    stressTest: {
      incomeDropPct: number
      surplusUnderStress: number
      stillPositive: boolean
      essentialsCovered: boolean
    }
    notes: string[]
  }
  reliability: {
    rentPaidConsistently: boolean
    onTimeRatio: number
    returnedPayments: number
    missedPayments: number
  }
  strengths: string[]
  contextClear: boolean
  clearedTypologies: string[]
  sharePack?: RentalSharePack | null
}

interface RentalSharePack {
  type: 'rental'
  createdFromGoalId: string
  goal: {
    title: string
    targetMonthlyRent: number | null
    moveDate: string | null
    applicationMode: 'alone' | 'joint' | 'unknown'
    depositAvailable: number
    notes: string | null
  }
  readiness: {
    status: 'ready' | 'ready_with_conditions' | 'needs_detail'
    headline: string
    strengths: string[]
    watchouts: string[]
    missing: string[]
  }
  metrics: {
    targetRentToIncome: number | null
    maxAffordableRent: number | null
    affordabilityHeadroom: number | null
    estimatedUpfrontCash: number | null
    upfrontCashGap: number | null
    monthsRemaining: number | null
    monthlyFundingRequired: number | null
  }
  assumptions: string[]
}

/** Two-tone semantics: green = comfortable coverage, amber = stretched, danger = at risk. */
const AFFORDABILITY_RATING: Record<AffordabilityRating, { label: string; tone: StatusTone }> = {
  comfortable: { label: 'Comfortable', tone: 'success' },
  manageable: { label: 'Manageable', tone: 'success' },
  stretched: { label: 'Stretched', tone: 'warning' },
  at_risk: { label: 'At risk', tone: 'danger' },
}

const CHARACTER_LABEL: Record<string, string> = {
  employment: 'employment',
  self_employed: 'self-employment',
  gig: 'gig / freelance work',
  benefits: 'benefits',
  mixed: 'mixed sources',
  unclear: 'an unclear source',
}

type ScoreDisplayStatus =
  | 'current'
  | 'expiring_soon'
  | 'expired'
  | 'evidence_withdrawn'
  | 'insufficient_evidence'

interface PublicProfile {
  applicantName: string | null
  status: ScoreDisplayStatus
  isCurrent: boolean
  statusMessage: string
  trustTier: TrustTier
  overallScore: number
  verificationStrength: number
  incomeConfidence: number
  affordabilityScore: number
  rentalReliability: number
  identityConfidence: number
  fraudRisk: string
  reasonCodes: Array<{
    code: string
    dimension: string
    sentiment: 'positive' | 'negative' | 'neutral'
    message: string
    weight: number
  }>
  computedAt: string
  financialDataAsOf: string | null
  validUntil: string | null
  expiresAt: string
  coverage?: { partialPicture: boolean; note: string | null } | null
  insight: RecipientInsight | null
}

/**
 * Each state is worded so an expired or withdrawn profile never reads as
 * suspicious. Old evidence is simply old; withdrawing consent is a right.
 * Two-tone: green = current/verified, amber = expiring, neutral = expired/withdrawn.
 */
const STATUS_BADGE: Record<ScoreDisplayStatus, { label: string; tone: StatusTone }> = {
  current: { label: 'Current profile', tone: 'success' },
  expiring_soon: { label: 'Expiring soon', tone: 'warning' },
  expired: { label: 'Expired', tone: 'neutral' },
  evidence_withdrawn: { label: 'No longer current', tone: 'neutral' },
  insufficient_evidence: { label: 'Not financially verified', tone: 'neutral' },
}

const SCORE_DIMENSIONS = [
  { key: 'verificationStrength', label: 'Verification Strength' },
  { key: 'identityConfidence', label: 'Identity Confidence' },
  { key: 'incomeConfidence', label: 'Income Confidence' },
  { key: 'affordabilityScore', label: 'Affordability' },
  { key: 'rentalReliability', label: 'Rental Reliability' },
] as const

const RENTAL_PACK_STATUS: Record<
  RentalSharePack['readiness']['status'],
  { label: string; tone: StatusTone }
> = {
  ready: { label: 'Ready', tone: 'success' },
  ready_with_conditions: { label: 'Context needed', tone: 'warning' },
  needs_detail: { label: 'Needs detail', tone: 'neutral' },
}

/** Reason-code messages are written for the applicant ("your profile"). On a
 *  recipient's report, rephrase to the third person so it reads correctly. */
function recipientPhrasing(message: string): string {
  return message.replace(/your profile/gi, "the applicant's profile")
}

/** Whole pounds — a shared report reads cleaner without pennies. */
const poundsWhole = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
const poundsMaybe = (n: number | null | undefined) => (n == null ? 'Not available' : poundsWhole(n))
const percentMaybe = (n: number | null | undefined) =>
  n == null ? 'Not available' : `${Math.round(n * 100)}%`

function applicationModeLabel(mode: RentalSharePack['goal']['applicationMode']) {
  if (mode === 'alone') return 'Applying alone'
  if (mode === 'joint') return 'Joint application'
  return 'Not sure yet'
}

/** Tier ring colour — one accent per tier, mirroring TIER_COLORS. */
const TIER_STROKE: Record<TrustTier, string> = {
  A: '#0D5A4D',
  B: '#6A8E82',
  C: '#B1892D',
  D: '#B86F50',
  E: '#A2544A',
}

/** Tier medallion: the tier letter (serif) inside a score-filled arc. Static
 *  (server-rendered) — the ring length encodes the score, coloured by tier. */
function TierMedallion({ tier, score }: { tier: TrustTier; score: number }) {
  const hex = TIER_STROKE[tier]
  const r = 52
  const stroke = 9
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E1E6E2" strokeWidth={stroke} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-semibold leading-none" style={{ color: hex }}>
          {tier}
        </span>
        <span className="text-content-muted mt-1 text-[11px] font-medium tabular-nums">
          {Math.round(score)}/100
        </span>
      </div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value)
  const color = pct >= 70 ? 'bg-brand-600' : pct >= 50 ? 'bg-warning-bar' : 'bg-danger'
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-content-secondary">{label}</span>
        <span className="text-content font-semibold tabular-nums">{pct}</span>
      </div>
      <div className="bg-surface-hover h-2 w-full overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function PublicProfilePage({ params }: { params: { token: string } }) {
  let profile: PublicProfile

  try {
    profile = (await api.sharing.getPublic(params.token)) as PublicProfile
  } catch {
    notFound()
  }

  const tierColorClass = TIER_COLORS[profile.trustTier]
  const positiveAll = profile.reasonCodes.filter((r) => r.sentiment === 'positive')
  // A verified photo ID produces two near-identical lines (one for identity, one
  // for verification strength) — show just the clearer one to a recipient.
  const hasIdDoc = positiveAll.some((r) => r.code === 'IDENTITY_DOCUMENT')
  const positiveReasons = positiveAll
    .filter((r) => !(hasIdDoc && r.code === 'DOCUMENT_UPLOADED'))
    .slice(0, 5)
  const negativeReasons = profile.reasonCodes.filter((r) => r.sentiment === 'negative').slice(0, 3)
  const badge = STATUS_BADGE[profile.status]
  const rentalPack =
    profile.insight?.sharePack?.type === 'rental' ? profile.insight.sharePack : null

  return (
    <div className="bg-surface-page min-h-screen">
      {/* Header */}
      <header className="border-line bg-surface-card border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <EquiScoreLogo width={132} />
          <StatusPill status={badge.tone} label={badge.label} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        {/* Freshness banner — impossible to miss when the score is not current */}
        {!profile.isCurrent && (
          <div className="rounded-card border-line bg-surface-inset flex items-start gap-3 border px-5 py-4">
            <Clock className="text-content-muted mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-content font-semibold">
                {profile.status === 'expired'
                  ? 'This score has expired'
                  : profile.status === 'evidence_withdrawn'
                    ? 'This profile is no longer current'
                    : 'This profile is not backed by financial evidence'}
              </p>
              <p className="text-content-secondary mt-1 text-sm">{profile.statusMessage}</p>
              {profile.financialDataAsOf && (
                <p className="text-content-muted mt-1 text-sm">
                  Based on financial evidence up to {formatDate(profile.financialDataAsOf)}.
                </p>
              )}
            </div>
          </div>
        )}
        {profile.status === 'expiring_soon' && profile.validUntil && (
          <div className="rounded-card bg-warning-soft flex items-start gap-3 px-5 py-4">
            <Clock className="text-warning-strong mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-warning-strong font-semibold">
                Still current, but expires {formatDate(profile.validUntil)}
              </p>
              <p className="text-warning-strong mt-1 text-sm">{profile.statusMessage}</p>
            </div>
          </div>
        )}

        {/* Coverage caveat — the picture may be based on partial account data. */}
        {profile.coverage?.partialPicture && profile.coverage.note && (
          <div className="rounded-card bg-warning-soft flex items-start gap-3 px-5 py-4">
            <Clock className="text-warning-strong mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-warning-strong font-semibold">Based on partial account coverage</p>
              <p className="text-warning-strong mt-1 text-sm">{profile.coverage.note}</p>
            </div>
          </div>
        )}

        {/* Hero — tier identity colours are retained for the medallion + border */}
        <div
          className={`rounded-card border-2 p-6 sm:p-8 ${tierColorClass} ${!profile.isCurrent ? 'opacity-60' : ''}`}
        >
          <p className="text-content-muted mb-1 text-sm font-medium">Trust Portfolio for</p>
          <h1 className="text-content mb-4 text-2xl font-bold">
            {profile.applicantName ?? 'Applicant'}
          </h1>

          <div className="flex flex-wrap items-center gap-5">
            <TierMedallion tier={profile.trustTier} score={profile.overallScore} />
            <div>
              <p className="text-content-muted text-xs font-medium uppercase tracking-wide">
                EquiScore Trust Portfolio
              </p>
              <p className="text-content text-xl font-semibold">{TIER_LABELS[profile.trustTier]}</p>
              <p className="text-content-secondary mt-1 max-w-md text-sm">
                Assessed across identity, income, and financial behaviour signals.
              </p>
            </div>
          </div>

          {profile.fraudRisk !== 'pass' && (
            <div className="bg-warning-soft text-warning-strong mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Some signals require additional manual review.
            </div>
          )}
        </div>

        {rentalPack && (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Home className="text-brand-900 h-4 w-4" />
                  <p className="text-brand-900 text-xs font-semibold uppercase tracking-wide">
                    Rental readiness pack
                  </p>
                </div>
                <h2 className="text-content text-lg font-semibold">
                  {rentalPack.readiness.headline}
                </h2>
                <p className="text-content-muted mt-1 text-sm">
                  Goal-specific context supplied by the applicant for a rental review.
                </p>
              </div>
              <StatusPill
                status={RENTAL_PACK_STATUS[rentalPack.readiness.status].tone}
                label={RENTAL_PACK_STATUS[rentalPack.readiness.status].label}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted flex items-center gap-1.5 text-xs">
                  <Banknote className="h-3.5 w-3.5" />
                  Target rent
                </p>
                <p className="text-content mt-0.5 text-xl font-semibold tabular-nums">
                  {poundsMaybe(rentalPack.goal.targetMonthlyRent)}
                </p>
              </div>
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted flex items-center gap-1.5 text-xs">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Move date
                </p>
                <p className="text-content mt-0.5 text-xl font-semibold tabular-nums">
                  {rentalPack.goal.moveDate ? formatDate(rentalPack.goal.moveDate) : 'Not set'}
                </p>
              </div>
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted text-xs">Application</p>
                <p className="text-content mt-0.5 text-xl font-semibold">
                  {applicationModeLabel(rentalPack.goal.applicationMode)}
                </p>
              </div>
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted text-xs">Rent to income</p>
                <p className="text-content mt-0.5 text-xl font-semibold tabular-nums">
                  {percentMaybe(rentalPack.metrics.targetRentToIncome)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted text-xs">Estimated sustainable rent</p>
                <p className="text-content mt-0.5 text-lg font-semibold tabular-nums">
                  {poundsMaybe(rentalPack.metrics.maxAffordableRent)}
                </p>
                <p className="text-content-muted mt-0.5 text-[11px] leading-tight">
                  Headroom {poundsMaybe(rentalPack.metrics.affordabilityHeadroom)}
                </p>
              </div>
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted text-xs">Estimated upfront cash</p>
                <p className="text-content mt-0.5 text-lg font-semibold tabular-nums">
                  {poundsMaybe(rentalPack.metrics.estimatedUpfrontCash)}
                </p>
                <p className="text-content-muted mt-0.5 text-[11px] leading-tight">
                  Declared {poundsMaybe(rentalPack.goal.depositAvailable)}
                </p>
              </div>
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted text-xs">Upfront cash gap</p>
                <p className="text-content mt-0.5 text-lg font-semibold tabular-nums">
                  {poundsMaybe(rentalPack.metrics.upfrontCashGap)}
                </p>
                <p className="text-content-muted mt-0.5 text-[11px] leading-tight">
                  {rentalPack.metrics.monthlyFundingRequired != null
                    ? `${poundsWhole(rentalPack.metrics.monthlyFundingRequired)}/mo to close`
                    : 'Monthly need not calculated'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-content mb-3 text-sm font-semibold">Supporting signals</h3>
                {rentalPack.readiness.strengths.length > 0 ? (
                  <div className="space-y-2">
                    {rentalPack.readiness.strengths.map((item) => (
                      <div
                        key={item}
                        className="text-content-secondary flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="text-success-strong mt-0.5 h-4 w-4 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-content-muted text-sm">
                    No strong rental-specific signals included.
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-content mb-3 text-sm font-semibold">Review context</h3>
                {[...rentalPack.readiness.missing, ...rentalPack.readiness.watchouts].length > 0 ? (
                  <div className="space-y-2">
                    {[...rentalPack.readiness.missing, ...rentalPack.readiness.watchouts].map(
                      (item) => (
                        <div
                          key={item}
                          className="text-content-secondary flex items-start gap-2 text-sm"
                        >
                          <AlertTriangle className="text-warning-strong mt-0.5 h-4 w-4 shrink-0" />
                          <span>{item}</span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-content-muted text-sm">
                    No major rental-specific watchouts included.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-panel bg-surface-inset mt-5 px-4 py-3">
              <p className="text-content text-sm font-semibold">Important limitations</p>
              <ul className="text-content-secondary mt-2 space-y-1 text-sm">
                {rentalPack.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Affordability — the decision a landlord/lender is actually making */}
        {profile.insight && (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Home className="text-brand-900 h-4 w-4" />
                <h2 className="text-content font-semibold">Affordability</h2>
              </div>
              <StatusPill
                status={AFFORDABILITY_RATING[profile.insight.affordability.rating].tone}
                label={AFFORDABILITY_RATING[profile.insight.affordability.rating].label}
              />
            </div>
            <p className="text-content-muted mt-1 text-sm">
              Assessed from the applicant&apos;s take-home income of{' '}
              {poundsWhole(profile.insight.income.monthlyAverage)}/month and their real outgoings.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {profile.insight.affordability.rentToIncome !== null && (
                <div className="rounded-panel bg-surface-inset px-4 py-3">
                  <p className="text-content-muted text-xs">Current rent to income</p>
                  <p className="text-content mt-0.5 text-xl font-semibold tabular-nums">
                    {Math.round(profile.insight.affordability.rentToIncome * 100)}%
                  </p>
                </div>
              )}
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted text-xs">Disposable after essentials</p>
                <p className="text-content mt-0.5 text-xl font-semibold tabular-nums">
                  {poundsWhole(profile.insight.affordability.disposableIncome)}
                </p>
              </div>
              <div className="rounded-panel bg-surface-inset px-4 py-3">
                <p className="text-content-muted text-xs">Could sustain total rent up to</p>
                <p className="text-brand-900 mt-0.5 text-xl font-semibold tabular-nums">
                  {poundsWhole(profile.insight.affordability.maxAffordableRent)}
                </p>
                <p className="text-content-muted mt-0.5 text-[11px] leading-tight">
                  total monthly rent, not on top of current
                </p>
              </div>
            </div>

            {profile.insight.affordability.currentRent !== null && (
              <p className="text-content-secondary mt-3 text-sm">
                Currently pays{' '}
                <span className="text-content font-medium">
                  {poundsWhole(profile.insight.affordability.currentRent)}/month
                </span>
                . The figure above is the <span className="font-medium">total</span> rent they could
                sustain at a new tenancy — it replaces their current rent, not in addition to it.
              </p>
            )}

            <div
              className={`rounded-panel mt-4 flex items-start gap-2 px-4 py-3 text-sm ${
                profile.insight.affordability.stressTest.stillPositive
                  ? 'bg-success-soft text-success-strong'
                  : 'bg-warning-soft text-warning-strong'
              }`}
            >
              {profile.insight.affordability.stressTest.stillPositive ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                <span className="font-medium">Stress test: </span>
                if income dropped {profile.insight.affordability.stressTest.incomeDropPct}%,{' '}
                {profile.insight.affordability.stressTest.stillPositive
                  ? `there would still be about ${poundsWhole(Math.abs(profile.insight.affordability.stressTest.surplusUnderStress))}/month spare.`
                  : profile.insight.affordability.stressTest.essentialsCovered
                    ? 'the monthly surplus would be gone, but essential costs would still be covered.'
                    : 'essential costs would no longer be fully covered.'}
              </span>
            </div>

            <ul className="mt-4 space-y-1.5">
              {profile.insight.affordability.notes.map((n) => (
                <li key={n} className="text-content-secondary flex items-start gap-2 text-sm">
                  <span className="bg-content-muted/60 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  {n}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Income & payment reliability */}
        {profile.insight && (
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="text-brand-900 h-4 w-4" />
              <h2 className="text-content font-semibold">Income &amp; reliability</h2>
            </div>
            <p className="text-content-secondary text-sm">
              Income of about{' '}
              <span className="text-content font-semibold">
                {poundsWhole(profile.insight.income.monthlyAverage)}/month
              </span>{' '}
              from {CHARACTER_LABEL[profile.insight.income.character] ?? 'various sources'},{' '}
              {profile.insight.income.consistency === 'very_consistent'
                ? 'very consistent month to month'
                : profile.insight.income.consistency === 'consistent'
                  ? 'consistent month to month'
                  : 'variable month to month'}
              {profile.insight.income.recurringSalaryDetected
                ? ', with a recurring salary detected'
                : ''}
              . Based on {profile.insight.monthsOfHistory} months of history.
            </p>

            {profile.insight.strengths.length > 0 && (
              <div className="mt-4 space-y-2">
                {profile.insight.strengths.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="text-success-strong h-4 w-4 shrink-0" />
                    <span className="text-content-secondary">{s}</span>
                  </div>
                ))}
              </div>
            )}

            {profile.insight.contextClear && (
              <p className="border-line-subtle text-success-strong mt-4 border-t pt-4 text-sm">
                No unusual or high-risk transaction patterns were found.
              </p>
            )}
          </Card>
        )}

        {/* Score breakdown */}
        <Card>
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="text-brand-900 h-4 w-4" />
            <h2 className="text-content font-semibold">Assessment breakdown</h2>
          </div>
          <p className="text-content-muted mb-6 text-sm">Each dimension is scored 0–100.</p>
          <div className="space-y-4">
            {SCORE_DIMENSIONS.map(({ key, label }) => (
              <ScoreBar key={key} label={label} value={profile[key] as number} />
            ))}
          </div>
        </Card>

        {/* Reason codes */}
        {(positiveReasons.length > 0 || negativeReasons.length > 0) && (
          <Card>
            <div className="mb-1 flex items-center gap-2">
              <Info className="text-brand-900 h-4 w-4" />
              <h2 className="text-content font-semibold">Key signals</h2>
            </div>
            <p className="text-content-muted mb-5 text-sm">What shaped this applicant's score.</p>
            <div className="space-y-2">
              {positiveReasons.map((r) => (
                <div
                  key={r.code}
                  className="rounded-panel bg-success-soft flex items-start gap-2.5 px-3.5 py-2.5"
                >
                  <CheckCircle2 className="text-success-strong mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-content-secondary text-sm">
                    {recipientPhrasing(r.message)}
                  </span>
                </div>
              ))}
              {negativeReasons.map((r) => (
                <div
                  key={r.code}
                  className="rounded-panel bg-danger-soft flex items-start gap-2.5 px-3.5 py-2.5"
                >
                  <XCircle className="text-danger-strong mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-content-secondary text-sm">
                    {recipientPhrasing(r.message)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Metadata — evidence coverage, computation, score validity and link access
            are four distinct facts and are never collapsed into one date. */}
        <Card padding="sm">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="text-content-muted">
              Financial evidence up to:{' '}
              <span className="text-content font-medium">
                {profile.financialDataAsOf
                  ? formatDate(profile.financialDataAsOf)
                  : 'No financial evidence'}
              </span>
            </div>
            <div className="text-content-muted">
              Score computed:{' '}
              <span className="text-content font-medium">{formatDate(profile.computedAt)}</span>
            </div>
            <div className="text-content-muted">
              {profile.isCurrent ? 'Score valid until:' : 'Score expired:'}{' '}
              <span className="text-content font-medium">
                {profile.validUntil ? formatDate(profile.validUntil) : '—'}
              </span>
            </div>
            <div className="text-content-muted">
              Link expires:{' '}
              <span className="text-content font-medium">{formatDate(profile.expiresAt)}</span>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-content-muted text-center text-xs">
          This report was generated by Equiscore and is provided for reference only. A score is
          valid for up to three months from the latest date its financial evidence covers.
        </p>
      </main>
    </div>
  )
}
