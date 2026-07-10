'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { api, type ScoreImprovements } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { useActionItems } from '@/lib/use-action-items'
import {
  ASSESSMENT_CONFIDENCE,
  PORTFOLIO_STATUS,
  SHARING_STATUS,
  DIMENSION_STATUS,
  dimensionStatusFor,
  confidenceFor,
  type DimensionStatus,
  type SharingStatus,
  type StatusPresentation,
} from '@/lib/status'

// ── Types ────────────────────────────────────────────────────────────────────

type ScoreData = {
  overallScore: number
  overallTier: TrustTier
  profileCompletenessScore: number
  verificationStrengthScore: number
  identityConfidenceScore: number
  incomeStabilityScore: number
  affordabilityScore: number
  rentalReliabilityScore: number
  reasonCodes: Array<{ code: string; sentiment: string; message: string }>
  computedAt: string
  status?: string
} | null

type ProfileData = {
  profileStage: string
  fullName?: string
  employmentType?: string
} | null

type AccountData = {
  bankConnection: { connectionStatus: string }
}

type DocData = { documentType: string; verificationStatus: string }

type InsightData = {
  period: { transactionCount: number; months: number }
  affordability: {
    rating: 'comfortable' | 'manageable' | 'stretched' | 'at_risk'
    disposableIncome: number
    surplusAfterAll: number
    ratios: { rentToIncome: number | null }
  }
  income?: { incomeIsVariable?: boolean }
} | null

type ShareLink = {
  id: string
  shareToken: string
  targetType: string | null
  targetName: string | null
  createdAt: string
  expiresAt: string
  viewCount: number
  lastViewedAt: string | null
}

const IDENTITY_DOC_TYPES = [
  'passport',
  'national_id',
  'driving_licence',
  'biometric_residence_permit',
]

const TIER_HEX: Record<TrustTier, string> = {
  A: '#123C35',
  B: '#3D6658',
  C: '#8FA491',
  D: '#C7A66A',
  E: '#A96E52',
}

const AFFORDABILITY_MAP: Record<string, DimensionStatus> = {
  comfortable: 'strong',
  manageable: 'good',
  stretched: 'moderate',
  at_risk: 'at_risk',
}

// ── Small shared pieces ──────────────────────────────────────────────────────

function StatusPill({ status }: { status: StatusPresentation }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
        status.badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
      {status.label}
    </span>
  )
}

function SectionCard({
  title,
  aside,
  children,
  className,
}: {
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-border bg-cream-surface p-6', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-charcoal">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { getToken } = useAuth()

  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => api.scores.latest((await getToken())!, 'general') as Promise<ScoreData>,
  })
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => api.profile.get((await getToken())!) as Promise<ProfileData>,
  })
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => api.banking.getAccounts((await getToken())!) as Promise<AccountData[]>,
  })
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => api.documents.list((await getToken())!) as Promise<DocData[]>,
  })
  const { data: insight } = useQuery({
    queryKey: ['insight-profile'],
    enabled: accounts.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => api.insights.getProfile((await getToken())!) as Promise<InsightData>,
  })
  const { data: improvements } = useQuery<ScoreImprovements>({
    queryKey: ['score-improvements'],
    enabled: !!score,
    queryFn: async () => api.scores.improvements((await getToken())!, 'general'),
  })
  const { data: shares = [] } = useQuery({
    queryKey: ['share-links'],
    queryFn: async () => api.sharing.list((await getToken())!) as Promise<ShareLink[]>,
  })

  const { items: actions } = useActionItems()

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasScore = !!score
  const hasActiveBank = accounts.some((a) => a.bankConnection.connectionStatus === 'active')
  const hasAnyBank = accounts.length > 0
  const hasIdentityDoc = documents.some(
    (d) => IDENTITY_DOC_TYPES.includes(d.documentType) && d.verificationStatus !== 'rejected',
  )
  const identityVerified = hasIdentityDoc || (score?.identityConfidenceScore ?? 0) >= 70
  const aff = insight && insight.period.transactionCount > 0 ? insight.affordability : null
  const incomeVariable = insight?.income?.incomeIsVariable ?? false
  const incomeConfirmed = !!score && score.incomeStabilityScore >= 55 && !incomeVariable
  const monthsAnalysed = insight?.period.months ?? 0

  const confidence = confidenceFor({
    hasScore,
    identityVerified,
    incomeConfirmed,
    verificationScore: score?.verificationStrengthScore ?? 0,
  })

  // Sharing status: technically shareable, but flag incomplete verification.
  const activeShares = shares.filter((s) => new Date(s.expiresAt) > new Date())
  const sharingStatus: SharingStatus = !hasScore
    ? 'unavailable'
    : activeShares.length > 0
      ? 'actively_shared'
      : identityVerified
        ? 'available'
        : 'available_with_warning'

  // The single most important next action.
  const primaryAction = actions[0]
  const topImprovementGain = improvements?.improvements[0]?.estimatedGain ?? null

  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      {/* ── Section 1: Assessment summary ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trust Portfolio summary */}
        <div className="rounded-2xl border border-border bg-cream-surface p-7 lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-mid">
            EquiScore Trust Portfolio
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight text-charcoal">
            {profile?.fullName ?? 'Your Trust Portfolio'}
          </h1>

          {scoreLoading ? (
            <div className="mt-6 h-24 animate-pulse rounded-xl bg-gray-100" />
          ) : hasScore && score ? (
            <>
              <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[44px] font-bold leading-none tabular-nums text-charcoal">
                    {score.overallScore}
                  </span>
                  <span className="text-lg text-charcoal-mid">/ 100</span>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ color: TIER_HEX[score.overallTier], backgroundColor: `${TIER_HEX[score.overallTier]}18` }}
                >
                  Tier {score.overallTier}
                </span>
                <StatusPill status={ASSESSMENT_CONFIDENCE[confidence]} />
              </div>

              {/* Compact accessible gauge */}
              <div
                className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={score.overallScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`EquiScore ${score.overallScore} out of 100, Tier ${score.overallTier}`}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${score.overallScore}%`, backgroundColor: TIER_HEX[score.overallTier] }}
                />
              </div>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-charcoal-mid">
                {identityVerified
                  ? 'Your connected banking data and verified identity support this assessment.'
                  : 'Your connected banking data provides useful financial evidence, but identity and income verification gaps currently limit the assessment.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-charcoal-mid">
                <span>
                  {accounts.length} account{accounts.length === 1 ? '' : 's'} connected
                </span>
                {monthsAnalysed > 0 && (
                  <span className="border-l border-border pl-4">{monthsAnalysed} months analysed</span>
                )}
                <span className="border-l border-border pl-4">
                  Last updated {formatDate(score.computedAt)}
                </span>
              </div>

              <Link
                href="/dashboard/trust-score"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark"
              >
                View full assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <div className="mt-6">
              <p className="text-sm leading-relaxed text-charcoal-mid">
                Your Trust Portfolio is a verified, reusable financial profile. Connect a bank or
                upload a statement to build it from real financial evidence.
              </p>
              <Link
                href="/dashboard/connections"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
              >
                Connect bank account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Recommended next action */}
        <div className="rounded-2xl border border-brand/15 bg-brand-50 p-7 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-mid">
            Recommended next action
          </p>
          {primaryAction ? (
            <div className="mt-3 flex h-[calc(100%-1.75rem)] flex-col">
              <h2 className="text-lg font-semibold leading-snug text-charcoal">
                {primaryAction.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{primaryAction.detail}</p>

              {(primaryAction.id === 'verify-identity' || topImprovementGain) && (
                <dl className="mt-4 space-y-1.5 rounded-xl bg-cream-surface/70 p-3 text-[13px] ring-1 ring-brand/10">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-mid">
                    Expected impact
                  </p>
                  {primaryAction.id === 'verify-identity' && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-mid">Identity confidence</dt>
                      <dd className="font-medium text-charcoal">Low → Verified</dd>
                    </div>
                  )}
                  {topImprovementGain != null && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-mid">Potential EquiScore improvement</dt>
                      <dd className="font-medium text-charcoal">Up to {topImprovementGain} points</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="mt-auto flex flex-col gap-2 pt-5">
                <Link
                  href={primaryAction.href}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
                >
                  {primaryAction.cta}
                </Link>
                <Link
                  href="/dashboard/trust-score"
                  className="text-center text-xs font-medium text-brand hover:underline"
                >
                  Why this is required
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <h2 className="text-lg font-semibold leading-snug text-charcoal">
                {hasScore ? 'Your portfolio is up to date' : 'Start building your portfolio'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
                {hasScore
                  ? 'No outstanding actions. You can share your Trust Portfolio whenever you need to.'
                  : 'Connect a bank account to generate your assessment.'}
              </p>
              <Link
                href={hasScore ? '/dashboard/share' : '/dashboard/connections'}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
              >
                {hasScore ? 'Create a share' : 'Connect bank account'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Portfolio status ───────────────────────────────────── */}
      <PortfolioStatusPanel
        profile={profile ?? null}
        hasScore={hasScore}
        identityVerified={identityVerified}
        hasActiveBank={hasActiveBank}
        hasAnyBank={hasAnyBank}
        incomeConfirmed={incomeConfirmed}
        hasBankData={!!aff}
        documentCount={documents.length}
        sharingStatus={sharingStatus}
      />

      {/* ── Section 3: Assessment breakdown + Key signals ─────────────────── */}
      {hasScore && score && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AssessmentBreakdown
            score={score}
            identityVerified={identityVerified}
            incomeVariable={incomeVariable}
            aff={aff}
          />
          <KeySignals score={score} />
        </div>
      )}

      {/* ── Section 4: Affordability + Connected evidence ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AffordabilityCard aff={aff} incomeConfirmed={incomeConfirmed} />
        <ConnectedEvidence
          bankCount={accounts.length}
          documentCount={documents.length}
          identityVerified={identityVerified}
          hasActiveBank={hasActiveBank}
          incomeConfirmed={incomeConfirmed}
        />
      </div>

      {/* ── Sharing activity ──────────────────────────────────────────────── */}
      <SharingActivity shares={shares} sharingStatus={sharingStatus} />
    </div>
  )
}

// ── Portfolio status ─────────────────────────────────────────────────────────

function PortfolioStatusPanel({
  profile,
  hasScore,
  identityVerified,
  hasActiveBank,
  hasAnyBank,
  incomeConfirmed,
  hasBankData,
  documentCount,
  sharingStatus,
}: {
  profile: ProfileData
  hasScore: boolean
  identityVerified: boolean
  hasActiveBank: boolean
  hasAnyBank: boolean
  incomeConfirmed: boolean
  hasBankData: boolean
  documentCount: number
  sharingStatus: SharingStatus
}) {
  const personalComplete = !!profile?.fullName

  const rows: Array<{ area: string; presentation: StatusPresentation; weight: number; href: string; action: string }> = [
    {
      area: 'Personal details',
      presentation: personalComplete ? DIMENSION_STATUS.strong : DIMENSION_STATUS.action_required,
      weight: personalComplete ? 1 : 0,
      href: '/dashboard/profile',
      action: personalComplete ? 'View' : 'Complete details',
    },
    {
      area: 'Identity',
      presentation: identityVerified ? DIMENSION_STATUS.strong : DIMENSION_STATUS.action_required,
      weight: identityVerified ? 1 : 0,
      href: '/dashboard/documents',
      action: identityVerified ? 'View' : 'Verify identity',
    },
    {
      area: 'Bank accounts',
      presentation: hasActiveBank
        ? { ...DIMENSION_STATUS.strong, label: 'Connected' }
        : hasAnyBank
          ? { ...DIMENSION_STATUS.moderate, label: 'Reconnect' }
          : DIMENSION_STATUS.action_required,
      weight: hasActiveBank ? 1 : hasAnyBank ? 0.5 : 0,
      href: '/dashboard/connections',
      action: hasAnyBank ? 'Manage' : 'Connect bank',
    },
    {
      area: 'Income',
      presentation: incomeConfirmed
        ? DIMENSION_STATUS.strong
        : hasBankData
          ? { ...DIMENSION_STATUS.action_required, label: 'Review required' }
          : DIMENSION_STATUS.not_assessed,
      weight: incomeConfirmed ? 1 : hasBankData ? 0.5 : 0,
      href: '/dashboard/analytics',
      action: incomeConfirmed ? 'View' : 'Review income',
    },
    {
      area: 'Documents',
      presentation:
        documentCount > 0
          ? { ...DIMENSION_STATUS.good, label: `${documentCount} added` }
          : { ...DIMENSION_STATUS.not_assessed, label: 'None added' },
      weight: documentCount > 0 ? 1 : 0,
      href: '/dashboard/documents',
      action: documentCount > 0 ? 'Manage' : 'Add evidence',
    },
    {
      area: 'Sharing',
      presentation: SHARING_STATUS[sharingStatus],
      weight: sharingStatus === 'unavailable' ? 0 : sharingStatus === 'available_with_warning' ? 0.5 : 1,
      href: '/dashboard/share',
      action: hasScore ? 'Create share' : 'Not ready',
    },
  ]

  const pct = Math.round((rows.reduce((s, r) => s + r.weight, 0) / rows.length) * 100)
  const completeAreas = rows.filter((r) => r.weight === 1).length
  const portfolioStatus = !hasScore
    ? PORTFOLIO_STATUS.in_progress
    : pct >= 100
      ? PORTFOLIO_STATUS.complete
      : PORTFOLIO_STATUS.in_progress

  return (
    <SectionCard title="Portfolio status" aside={<StatusPill status={portfolioStatus} />}>
      <div className="mb-1 flex items-end justify-between">
        <span className="text-2xl font-bold tabular-nums text-charcoal">{pct}% complete</span>
        <span className="text-sm text-charcoal-mid">{completeAreas} of {rows.length} areas complete</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Portfolio ${pct} percent complete`}
      >
        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-5 divide-y divide-border">
        {rows.map((r) => (
          <div key={r.area} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-sm font-medium text-charcoal">{r.area}</span>
              <StatusPill status={r.presentation} />
            </div>
            <Link
              href={r.href}
              className="shrink-0 text-sm font-medium text-brand hover:text-brand-dark hover:underline"
            >
              {r.action}
            </Link>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ── Assessment breakdown ─────────────────────────────────────────────────────

function AssessmentBreakdown({
  score,
  identityVerified,
  incomeVariable,
  aff,
}: {
  score: NonNullable<ScoreData>
  identityVerified: boolean
  incomeVariable: boolean
  aff: NonNullable<InsightData>['affordability'] | null
}) {
  const dims: Array<{
    label: string
    score: number | null
    status: DimensionStatus
    reason: string
    action?: { label: string; href: string }
  }> = [
    {
      label: 'Profile completeness',
      score: score.profileCompletenessScore,
      status: dimensionStatusFor(score.profileCompletenessScore),
      reason:
        score.profileCompletenessScore >= 90
          ? 'All required profile information has been provided.'
          : 'Some profile details are still missing.',
      action: score.profileCompletenessScore >= 90 ? undefined : { label: 'Complete profile', href: '/dashboard/profile' },
    },
    {
      label: 'Verification strength',
      score: score.verificationStrengthScore,
      status: identityVerified
        ? dimensionStatusFor(score.verificationStrengthScore)
        : 'action_required',
      reason: identityVerified
        ? 'Your bank account and identity are verified.'
        : 'Your bank account is verified, but your identity has not yet been confirmed.',
      action: identityVerified ? undefined : { label: 'Add identity evidence', href: '/dashboard/documents' },
    },
    {
      label: 'Income stability',
      score: score.incomeStabilityScore,
      status: incomeVariable ? 'action_required' : dimensionStatusFor(score.incomeStabilityScore),
      reason: incomeVariable
        ? 'Income varies significantly and the primary income source has not been confirmed.'
        : 'A recurring income pattern was detected across the period.',
      action: incomeVariable ? { label: 'Review income', href: '/dashboard/analytics' } : undefined,
    },
    {
      label: 'Affordability',
      score: aff ? score.affordabilityScore : null,
      status: aff ? AFFORDABILITY_MAP[aff.rating] ?? 'moderate' : 'insufficient_evidence',
      reason: aff
        ? 'Affordability was assessed from your verified income and spending.'
        : 'There is not enough verified information to calculate affordability reliably.',
      action: aff ? undefined : { label: 'Complete income review', href: '/dashboard/analytics' },
    },
    {
      label: 'Rental reliability',
      score: score.rentalReliabilityScore > 0 ? score.rentalReliabilityScore : null,
      status: score.rentalReliabilityScore > 0 ? dimensionStatusFor(score.rentalReliabilityScore) : 'not_assessed',
      reason:
        score.rentalReliabilityScore >= 70
          ? 'Consistent rent payments were identified across the assessment period.'
          : score.rentalReliabilityScore > 0
            ? 'Some rent-like payments were detected but the history is limited.'
            : 'No rent payments were identified in the connected accounts.',
    },
  ]

  return (
    <SectionCard title="Assessment breakdown">
      <div className="space-y-4">
        {dims.map((d) => {
          const st = DIMENSION_STATUS[d.status]
          const assessed = d.score !== null
          return (
            <div key={d.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-charcoal">{d.label}</span>
                <div className="flex items-center gap-2">
                  {assessed && (
                    <span className="text-sm font-semibold tabular-nums text-charcoal">{d.score}</span>
                  )}
                  <StatusPill status={st} />
                </div>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={assessed ? (d.score as number) : undefined}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${d.label}: ${assessed ? `${d.score} out of 100, ${st.label}` : st.label}`}
              >
                {assessed && (
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', st.bar)}
                    style={{ width: `${Math.max(2, d.score as number)}%` }}
                  />
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-charcoal-mid">{d.reason}</p>
              {d.action && (
                <Link
                  href={d.action.href}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  {d.action.label} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ── Key signals ──────────────────────────────────────────────────────────────

function KeySignals({ score }: { score: NonNullable<ScoreData> }) {
  const positive = score.reasonCodes.filter((r) => r.sentiment === 'positive')
  const attention = score.reasonCodes.filter((r) => r.sentiment !== 'positive')

  return (
    <SectionCard title="Key signals">
      {score.reasonCodes.length === 0 ? (
        <p className="text-sm text-charcoal-mid">No signals available yet.</p>
      ) : (
        <div className="space-y-5">
          {positive.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-mid">
                Positive signals
              </h3>
              <ul className="space-y-2.5">
                {positive.slice(0, 5).map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <p className="text-sm leading-snug text-charcoal">{r.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {attention.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-mid">
                Areas requiring attention
              </h3>
              <ul className="space-y-2.5">
                {attention.slice(0, 5).map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
                    <div>
                      <p className="text-sm leading-snug text-charcoal">{r.message}</p>
                      {r.code === 'NAME_MISMATCH' && (
                        <Link
                          href="/dashboard/connections"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        >
                          Review mismatch <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ── Affordability ────────────────────────────────────────────────────────────

function AffordabilityCard({
  aff,
  incomeConfirmed,
}: {
  aff: NonNullable<InsightData>['affordability'] | null
  incomeConfirmed: boolean
}) {
  if (!aff) {
    return (
      <SectionCard title="Affordability" aside={<StatusPill status={DIMENSION_STATUS.insufficient_evidence} />}>
        <div className="flex items-start gap-2.5">
          <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <p className="text-sm leading-relaxed text-charcoal-mid">
            We could not calculate affordability reliably because verified income information is
            incomplete.
          </p>
        </div>
        <Link
          href="/dashboard/connections"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          Connect bank account <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </SectionCard>
    )
  }

  const st = DIMENSION_STATUS[AFFORDABILITY_MAP[aff.rating] ?? 'moderate']
  const atRisk = aff.rating === 'at_risk'
  return (
    <SectionCard title="Affordability" aside={<StatusPill status={st} />}>
      <p className="mb-4 text-sm leading-relaxed text-charcoal-mid">
        {atRisk
          ? 'Regular commitments consume a high proportion of verified income.'
          : incomeConfirmed
            ? 'Based on your verified income and spending across the assessment period.'
            : 'Based on your connected spending; confirming your income will sharpen this.'}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Disposable" value={formatCurrency(aff.disposableIncome)} sub="after essentials" />
        <Metric
          label="Surplus"
          value={`${aff.surplusAfterAll >= 0 ? '+' : ''}${formatCurrency(aff.surplusAfterAll)}`}
          sub="after all spending"
          tone={aff.surplusAfterAll >= 0 ? 'good' : 'bad'}
        />
        <Metric
          label="Rent"
          value={aff.ratios.rentToIncome !== null ? `${Math.round(aff.ratios.rentToIncome * 100)}%` : '—'}
          sub="of income"
        />
      </div>
      <Link
        href="/dashboard/analytics"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        View full breakdown <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </SectionCard>
  )
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: 'good' | 'bad'
}) {
  return (
    <div className="rounded-xl bg-surface-subtle px-3 py-2.5">
      <p className="text-xs text-charcoal-mid">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'good' ? 'text-success' : tone === 'bad' ? 'text-danger' : 'text-charcoal',
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-charcoal-mid/70">{sub}</p>
    </div>
  )
}

// ── Connected evidence ───────────────────────────────────────────────────────

function ConnectedEvidence({
  bankCount,
  documentCount,
  identityVerified,
  hasActiveBank,
  incomeConfirmed,
}: {
  bankCount: number
  documentCount: number
  identityVerified: boolean
  hasActiveBank: boolean
  incomeConfirmed: boolean
}) {
  const categories: Array<{ label: string; status: StatusPresentation }> = [
    {
      label: 'Identity',
      status: identityVerified ? DIMENSION_STATUS.strong : { ...DIMENSION_STATUS.not_assessed, label: 'Not verified' },
    },
    {
      label: 'Banking',
      status: hasActiveBank ? { ...DIMENSION_STATUS.strong, label: 'Verified' } : { ...DIMENSION_STATUS.not_assessed, label: 'Not connected' },
    },
    {
      label: 'Income',
      status: incomeConfirmed
        ? { ...DIMENSION_STATUS.strong, label: 'Verified' }
        : hasActiveBank
          ? { ...DIMENSION_STATUS.pending, label: 'Pending review' }
          : { ...DIMENSION_STATUS.not_assessed, label: 'Not connected' },
    },
  ]
  const verifiedAreas = categories.filter((c) => c.status.tone === 'success').length

  return (
    <SectionCard title="Connected evidence">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <CountTile icon={Building2} count={bankCount} label={`bank connection${bankCount === 1 ? '' : 's'}`} />
        <CountTile icon={FileText} count={documentCount} label={`document${documentCount === 1 ? '' : 's'} uploaded`} />
        <CountTile icon={ShieldCheck} count={verifiedAreas} label={`of ${categories.length} areas verified`} />
      </div>
      <div className="divide-y divide-border rounded-xl bg-surface-subtle px-4">
        {categories.map((c) => (
          <div key={c.label} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-charcoal">{c.label}</span>
            <StatusPill status={c.status} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-charcoal-mid">
        Connected Open Banking data counts as verified evidence, alongside any uploaded documents.
      </p>
    </SectionCard>
  )
}

function CountTile({
  icon: Icon,
  count,
  label,
}: {
  icon: React.ElementType
  count: number
  label: string
}) {
  return (
    <div className="rounded-xl bg-surface-subtle px-3 py-3">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-mid" aria-hidden />
        <span className="text-xl font-bold tabular-nums text-charcoal">{count}</span>
      </div>
      <p className="text-xs leading-tight text-charcoal-mid">{label}</p>
    </div>
  )
}

// ── Sharing activity ─────────────────────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  landlord: 'Landlord',
  letting_agent: 'Letting agent',
  lender: 'Lender',
  employer: 'Employer',
  other: 'Recipient',
}

function SharingActivity({
  shares,
  sharingStatus,
}: {
  shares: ShareLink[]
  sharingStatus: SharingStatus
}) {
  const now = Date.now()
  const active = shares
    .filter((s) => new Date(s.expiresAt).getTime() > now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const expired = shares.length - active.length

  return (
    <SectionCard
      title="Sharing activity"
      aside={
        <Link
          href="/dashboard/share"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
        >
          Create a share
        </Link>
      }
    >
      {sharingStatus === 'available_with_warning' && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-warn-bg px-4 py-3 ring-1 ring-warn-border">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
          <p className="text-sm text-warn-fg">
            You can share the current version of your Trust Portfolio. Recipients will be shown that
            identity verification is incomplete.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <span className="text-charcoal-mid">
          Active shares <span className="ml-1 font-semibold text-charcoal">{active.length}</span>
        </span>
        <span className="text-charcoal-mid">
          Expired links <span className="ml-1 font-semibold text-charcoal">{expired}</span>
        </span>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-charcoal-mid">
          No active share links. Create a share to send your Trust Portfolio to a landlord, letting
          agent or lender.
        </p>
      ) : (
        <div className="space-y-3">
          {active.slice(0, 3).map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal">
                  {s.targetName ?? TARGET_LABELS[s.targetType ?? 'other'] ?? 'Recipient'}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-charcoal-mid">
                  <span>Shared {formatDate(s.createdAt)}</span>
                  <span>Expires {formatDate(s.expiresAt)}</span>
                  <span>
                    {s.lastViewedAt ? `Last viewed ${formatDate(s.lastViewedAt)}` : 'Not yet viewed'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/share/${s.shareToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                >
                  View shared version <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                <Link
                  href="/dashboard/share"
                  className="text-sm font-medium text-charcoal-mid hover:text-charcoal hover:underline"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
