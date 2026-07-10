import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { formatDate, TIER_COLORS } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TIER_LABELS } from '@equiscore/shared'
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, Info, XCircle, Clock, Home, Wallet } from 'lucide-react'
import { EquiScoreLogo } from '@/components/brand/logo'

type AffordabilityRating = 'comfortable' | 'manageable' | 'stretched' | 'at_risk'

interface RecipientInsight {
  monthsOfHistory: number
  income: { monthlyAverage: number; character: string; consistency: string; recurringSalaryDetected: boolean }
  affordability: {
    rating: AffordabilityRating
    currentRent: number | null
    rentToIncome: number | null
    disposableIncome: number
    surplusAfterAll: number
    maxAffordableRent: number
    stressTest: { incomeDropPct: number; surplusUnderStress: number; stillPositive: boolean; essentialsCovered: boolean }
    notes: string[]
  }
  reliability: { rentPaidConsistently: boolean; onTimeRatio: number; returnedPayments: number; missedPayments: number }
  strengths: string[]
  contextClear: boolean
  clearedTypologies: string[]
}

const AFFORDABILITY_RATING: Record<AffordabilityRating, { label: string; className: string }> = {
  comfortable: { label: 'Comfortable', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  manageable: { label: 'Manageable', className: 'bg-teal-50 text-teal-700 ring-teal-200' },
  stretched: { label: 'Stretched', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  at_risk: { label: 'At risk', className: 'bg-red-50 text-red-700 ring-red-200' },
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
 */
const STATUS_BADGE: Record<ScoreDisplayStatus, { label: string; className: string }> = {
  current: { label: 'Current profile', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  expiring_soon: { label: 'Expiring soon', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 ring-gray-300' },
  evidence_withdrawn: { label: 'No longer current', className: 'bg-gray-100 text-gray-600 ring-gray-300' },
  insufficient_evidence: {
    label: 'Not financially verified',
    className: 'bg-gray-100 text-gray-600 ring-gray-300',
  },
}

const SCORE_DIMENSIONS = [
  { key: 'verificationStrength', label: 'Verification Strength' },
  { key: 'identityConfidence', label: 'Identity Confidence' },
  { key: 'incomeConfidence', label: 'Income Confidence' },
  { key: 'affordabilityScore', label: 'Affordability' },
  { key: 'rentalReliability', label: 'Rental Reliability' },
] as const

/** Reason-code messages are written for the applicant ("your profile"). On a
 *  recipient's report, rephrase to the third person so it reads correctly. */
function recipientPhrasing(message: string): string {
  return message.replace(/your profile/gi, "the applicant's profile")
}

/** Whole pounds — a shared report reads cleaner without pennies. */
const poundsWhole = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value)
  const color =
    pct >= 70 ? 'bg-brand' : pct >= 50 ? 'bg-sage' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{pct}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
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

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-[#D8D6C9] bg-cream-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <EquiScoreLogo width={132} />
          <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        {/* Freshness banner — impossible to miss when the score is not current */}
        {!profile.isCurrent && (
          <div className="flex items-start gap-3 rounded-2xl bg-gray-100 px-5 py-4 ring-1 ring-gray-300">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
            <div>
              <p className="font-semibold text-gray-900">
                {profile.status === 'expired'
                  ? 'This score has expired'
                  : profile.status === 'evidence_withdrawn'
                    ? 'This profile is no longer current'
                    : 'This profile is not backed by financial evidence'}
              </p>
              <p className="mt-1 text-sm text-gray-600">{profile.statusMessage}</p>
              {profile.financialDataAsOf && (
                <p className="mt-1 text-sm text-gray-500">
                  Based on financial evidence up to {formatDate(profile.financialDataAsOf)}.
                </p>
              )}
            </div>
          </div>
        )}
        {profile.status === 'expiring_soon' && profile.validUntil && (
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Still current, but expires {formatDate(profile.validUntil)}
              </p>
              <p className="mt-1 text-sm text-amber-800">{profile.statusMessage}</p>
            </div>
          </div>
        )}

        {/* Coverage caveat — the picture may be based on partial account data. */}
        {profile.coverage?.partialPicture && profile.coverage.note && (
          <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-5 py-4 ring-1 ring-gray-200">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <div>
              <p className="font-semibold text-gray-800">Based on partial account coverage</p>
              <p className="mt-1 text-sm text-gray-600">{profile.coverage.note}</p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div
          className={`rounded-2xl border-2 p-6 sm:p-8 ${tierColorClass} ${!profile.isCurrent ? 'opacity-60' : ''}`}
        >
          <p className="mb-1 text-sm font-medium text-gray-500">Trust Portfolio for</p>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            {profile.applicantName ?? 'Applicant'}
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-current bg-white">
              <div className="text-3xl font-bold">{profile.trustTier}</div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">EquiScore Trust Portfolio</p>
              <p className="text-lg font-semibold text-gray-900">{TIER_LABELS[profile.trustTier]}</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-gray-600">
                Score {Math.round(profile.overallScore)} / 100
              </p>
              <p className="mt-1 max-w-md text-sm text-gray-600">
                Assessed across identity, income, and financial behaviour signals.
              </p>
            </div>
          </div>

          {profile.fraudRisk !== 'pass' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Some signals require additional manual review.
            </div>
          )}
        </div>

        {/* Affordability — the decision a landlord/lender is actually making */}
        {profile.insight && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-brand" />
                <h2 className="font-semibold text-gray-900">Affordability</h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${AFFORDABILITY_RATING[profile.insight.affordability.rating].className}`}
              >
                {AFFORDABILITY_RATING[profile.insight.affordability.rating].label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Assessed from the applicant&apos;s take-home income of{' '}
              {poundsWhole(profile.insight.income.monthlyAverage)}/month and their real outgoings.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {profile.insight.affordability.rentToIncome !== null && (
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Current rent to income</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900">
                    {Math.round(profile.insight.affordability.rentToIncome * 100)}%
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Disposable after essentials</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900">
                  {poundsWhole(profile.insight.affordability.disposableIncome)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Could sustain total rent up to</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-brand">
                  {poundsWhole(profile.insight.affordability.maxAffordableRent)}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-gray-400">
                  total monthly rent, not on top of current
                </p>
              </div>
            </div>

            {profile.insight.affordability.currentRent !== null && (
              <p className="mt-3 text-sm text-gray-600">
                Currently pays{' '}
                <span className="font-medium text-gray-900">
                  {poundsWhole(profile.insight.affordability.currentRent)}/month
                </span>
                . The figure above is the <span className="font-medium">total</span> rent they could
                sustain at a new tenancy — it replaces their current rent, not in addition to it.
              </p>
            )}

            <div
              className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ring-1 ${
                profile.insight.affordability.stressTest.stillPositive
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
                  : 'bg-amber-50 text-amber-900 ring-amber-100'
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
                <li key={n} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Income & payment reliability */}
        {profile.insight && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-brand" />
              <h2 className="font-semibold text-gray-900">Income &amp; reliability</h2>
            </div>
            <p className="text-sm text-gray-700">
              Income of about{' '}
              <span className="font-semibold">
                {poundsWhole(profile.insight.income.monthlyAverage)}/month
              </span>{' '}
              from {CHARACTER_LABEL[profile.insight.income.character] ?? 'various sources'},{' '}
              {profile.insight.income.consistency === 'very_consistent'
                ? 'very consistent month to month'
                : profile.insight.income.consistency === 'consistent'
                  ? 'consistent month to month'
                  : 'variable month to month'}
              {profile.insight.income.recurringSalaryDetected ? ', with a recurring salary detected' : ''}. Based
              on {profile.insight.monthsOfHistory} months of history.
            </p>

            {profile.insight.strengths.length > 0 && (
              <div className="mt-4 space-y-2">
                {profile.insight.strengths.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-gray-700">{s}</span>
                  </div>
                ))}
              </div>
            )}

            {profile.insight.contextClear && (
              <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-emerald-700">
                No unusual or high-risk transaction patterns were found.
              </p>
            )}
          </div>
        )}

        {/* Score breakdown */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            <h2 className="font-semibold text-gray-900">Assessment breakdown</h2>
          </div>
          <p className="mb-6 text-sm text-gray-500">Each dimension is scored 0–100.</p>
          <div className="space-y-4">
            {SCORE_DIMENSIONS.map(({ key, label }) => (
              <ScoreBar key={key} label={label} value={profile[key] as number} />
            ))}
          </div>
        </div>

        {/* Reason codes */}
        {(positiveReasons.length > 0 || negativeReasons.length > 0) && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-1 flex items-center gap-2">
              <Info className="h-4 w-4 text-brand" />
              <h2 className="font-semibold text-gray-900">Key signals</h2>
            </div>
            <p className="mb-5 text-sm text-gray-500">What shaped this applicant's score.</p>
            <div className="space-y-2">
              {positiveReasons.map((r) => (
                <div key={r.code} className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-sm text-gray-700">{recipientPhrasing(r.message)}</span>
                </div>
              ))}
              {negativeReasons.map((r) => (
                <div key={r.code} className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3.5 py-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span className="text-sm text-gray-700">{recipientPhrasing(r.message)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata — evidence coverage, computation, score validity and link access
            are four distinct facts and are never collapsed into one date. */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="text-gray-500">
              Financial evidence up to:{' '}
              <span className="font-medium text-gray-900">
                {profile.financialDataAsOf ? formatDate(profile.financialDataAsOf) : 'No financial evidence'}
              </span>
            </div>
            <div className="text-gray-500">
              Score computed:{' '}
              <span className="font-medium text-gray-900">{formatDate(profile.computedAt)}</span>
            </div>
            <div className="text-gray-500">
              {profile.isCurrent ? 'Score valid until:' : 'Score expired:'}{' '}
              <span className="font-medium text-gray-900">
                {profile.validUntil ? formatDate(profile.validUntil) : '—'}
              </span>
            </div>
            <div className="text-gray-500">
              Link expires: <span className="font-medium text-gray-900">{formatDate(profile.expiresAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          This report was generated by Equiscore and is provided for reference only. A score is valid for
          up to three months from the latest date its financial evidence covers.
        </p>
      </main>
    </div>
  )
}
