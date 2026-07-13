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
  ExternalLink,
} from 'lucide-react'
import { api, type ScoreImprovements } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { useActionItems } from '@/lib/use-action-items'
import {
  buttonClasses,
  Card,
  Display,
  PageLayout,
  StatusPill as UIStatusPill,
  type StatusTone,
} from '@/components/ui'
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

const AFFORDABILITY_MAP: Record<string, DimensionStatus> = {
  comfortable: 'strong',
  manageable: 'good',
  stretched: 'moderate',
  at_risk: 'at_risk',
}

// ── Status presentation → design-system tokens ───────────────────────────────
// The status model (lib/status) owns meaning → label + tone. Here we map its
// tone onto the shared StatusPill tones and two-tone bar/dot colours so the
// dashboard reads the same as the Trust Assessment page.

const PILL_TONE: Record<StatusPresentation['tone'], StatusTone> = {
  success: 'success',
  brand: 'info',
  warn: 'warning',
  danger: 'danger',
  neutral: 'neutral',
}

const BAR_TONE: Record<StatusPresentation['tone'], string> = {
  success: 'bg-brand-600',
  brand: 'bg-brand-600',
  warn: 'bg-warning-bar',
  danger: 'bg-danger-strong',
  neutral: 'bg-content-muted/40',
}

// ── Small shared pieces ──────────────────────────────────────────────────────

function StatusPill({ status }: { status: StatusPresentation }) {
  return <UIStatusPill status={PILL_TONE[status.tone]} label={status.label} />
}

/** Report-style panel: heading in a bordered header, content below. */
function Panel({
  title,
  action,
  children,
  className,
  contentClassName = 'p-5',
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
        <h2 className="text-base font-semibold text-content">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn('flex-1', contentClassName)}>{children}</div>
    </Card>
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
    <PageLayout width="wide">
      {/* ── Section 1: Assessment summary ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trust Profile summary */}
        <Card padding="lg" className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
            EquiScore Trust Profile
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-content">
            {profile?.fullName ?? 'Your Trust Profile'}
          </h1>

          {scoreLoading ? (
            <div className="mt-6 h-24 animate-pulse rounded-panel bg-surface-hover" />
          ) : hasScore && score ? (
            <>
              <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="flex items-baseline gap-1.5">
                  <Display size="lg">{score.overallScore}</Display>
                  <span className="text-lg text-content-secondary">/ 100</span>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-900">
                  Tier {score.overallTier}
                </span>
                <StatusPill status={ASSESSMENT_CONFIDENCE[confidence]} />
              </div>

              {/* Compact accessible gauge */}
              <div
                className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-surface-hover"
                role="progressbar"
                aria-valuenow={score.overallScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`EquiScore ${score.overallScore} out of 100, Tier ${score.overallTier}`}
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-700"
                  style={{ width: `${score.overallScore}%` }}
                />
              </div>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-content-secondary">
                {identityVerified
                  ? 'Your connected banking data and verified identity support this assessment.'
                  : 'Your connected banking data provides useful financial evidence, but identity and income verification gaps currently limit the assessment.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-content-muted">
                <span>
                  {accounts.length} account{accounts.length === 1 ? '' : 's'} connected
                </span>
                {monthsAnalysed > 0 && (
                  <span className="border-l border-line-subtle pl-4">{monthsAnalysed} months analysed</span>
                )}
                <span className="border-l border-line-subtle pl-4">
                  Last updated {formatDate(score.computedAt)}
                </span>
              </div>

              <Link
                href="/dashboard/trust-profile/assessment"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-900 hover:underline"
              >
                View full assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <div className="mt-6">
              <p className="text-sm leading-relaxed text-content-secondary">
                Your Trust Profile is a verified, reusable financial profile. Connect a bank or
                upload a statement to build it from real financial evidence.
              </p>
              <Link href="/dashboard/connections" className={buttonClasses('primary', 'md', 'mt-4')}>
                Connect bank account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Card>

        {/* Recommended next action */}
        <div className="rounded-card border border-brand-100 bg-brand-50 p-6 sm:p-8 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
            Recommended next action
          </p>
          {primaryAction ? (
            <div className="mt-3 flex h-[calc(100%-1.75rem)] flex-col">
              <h2 className="text-lg font-semibold leading-snug text-content">
                {primaryAction.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-content-secondary">{primaryAction.detail}</p>

              {(primaryAction.id === 'verify-identity' || topImprovementGain) && (
                <dl className="mt-4 space-y-1.5 rounded-panel border border-line bg-surface-card p-3 text-[13px]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                    Expected impact
                  </p>
                  {primaryAction.id === 'verify-identity' && (
                    <div className="flex justify-between">
                      <dt className="text-content-secondary">Identity confidence</dt>
                      <dd className="font-medium text-content">Low → Verified</dd>
                    </div>
                  )}
                  {topImprovementGain != null && (
                    <div className="flex justify-between">
                      <dt className="text-content-secondary">Potential EquiScore improvement</dt>
                      <dd className="font-medium text-content">Up to {topImprovementGain} points</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="mt-auto flex flex-col gap-2 pt-5">
                <Link href={primaryAction.href} className={buttonClasses('primary', 'md', 'w-full')}>
                  {primaryAction.cta}
                </Link>
                <Link
                  href="/dashboard/trust-profile/assessment"
                  className="text-center text-xs font-medium text-brand-900 hover:underline"
                >
                  Why this is required
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <h2 className="text-lg font-semibold leading-snug text-content">
                {hasScore ? 'Your portfolio is up to date' : 'Start building your portfolio'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-content-secondary">
                {hasScore
                  ? 'No outstanding actions. You can share your Trust Profile whenever you need to.'
                  : 'Connect a bank account to generate your assessment.'}
              </p>
              <Link
                href={hasScore ? '/dashboard/share' : '/dashboard/connections'}
                className={buttonClasses('primary', 'md', 'mt-5')}
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
    </PageLayout>
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
      href: '/dashboard/trust-profile/financial-profile',
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
    <Panel title="Portfolio status" action={<StatusPill status={portfolioStatus} />}>
      <div className="mb-1 flex items-end justify-between">
        <span className="text-2xl font-semibold tabular-nums text-content">{pct}% complete</span>
        <span className="text-sm text-content-secondary">{completeAreas} of {rows.length} areas complete</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-hover"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Portfolio ${pct} percent complete`}
      >
        <div className="h-full rounded-full bg-brand-600 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-5 divide-y divide-line-subtle">
        {rows.map((r) => (
          <div key={r.area} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-sm font-medium text-content">{r.area}</span>
              <StatusPill status={r.presentation} />
            </div>
            <Link
              href={r.href}
              className="shrink-0 text-sm font-medium text-brand-900 hover:underline"
            >
              {r.action}
            </Link>
          </div>
        ))}
      </div>
    </Panel>
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
      action: incomeVariable ? { label: 'Review income', href: '/dashboard/trust-profile/financial-profile' } : undefined,
    },
    {
      label: 'Affordability',
      score: aff ? score.affordabilityScore : null,
      status: aff ? AFFORDABILITY_MAP[aff.rating] ?? 'moderate' : 'insufficient_evidence',
      reason: aff
        ? 'Affordability was assessed from your verified income and spending.'
        : 'There is not enough verified information to calculate affordability reliably.',
      action: aff ? undefined : { label: 'Complete income review', href: '/dashboard/trust-profile/financial-profile' },
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
    <Panel title="Assessment breakdown">
      <div className="space-y-4">
        {dims.map((d) => {
          const st = DIMENSION_STATUS[d.status]
          const assessed = d.score !== null
          return (
            <div key={d.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-content">{d.label}</span>
                <div className="flex items-center gap-2">
                  {assessed && (
                    <span className="text-sm font-semibold tabular-nums text-content">{d.score}</span>
                  )}
                  <StatusPill status={st} />
                </div>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover"
                role="progressbar"
                aria-valuenow={assessed ? (d.score as number) : undefined}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${d.label}: ${assessed ? `${d.score} out of 100, ${st.label}` : st.label}`}
              >
                {assessed && (
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', BAR_TONE[st.tone])}
                    style={{ width: `${Math.max(2, d.score as number)}%` }}
                  />
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">{d.reason}</p>
              {d.action && (
                <Link
                  href={d.action.href}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-900 hover:underline"
                >
                  {d.action.label} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// ── Key signals ──────────────────────────────────────────────────────────────

function KeySignals({ score }: { score: NonNullable<ScoreData> }) {
  const positive = score.reasonCodes.filter((r) => r.sentiment === 'positive')
  const attention = score.reasonCodes.filter((r) => r.sentiment !== 'positive')

  return (
    <Panel title="Key signals">
      {score.reasonCodes.length === 0 ? (
        <p className="text-sm text-content-secondary">No signals available yet.</p>
      ) : (
        <div className="space-y-5">
          {positive.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
                Positive signals
              </h3>
              <ul className="space-y-2.5">
                {positive.slice(0, 5).map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" aria-hidden />
                    <p className="text-sm leading-snug text-content">{r.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {attention.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
                Areas requiring attention
              </h3>
              <ul className="space-y-2.5">
                {attention.slice(0, 5).map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden />
                    <div>
                      <p className="text-sm leading-snug text-content">{r.message}</p>
                      {r.code === 'NAME_MISMATCH' && (
                        <Link
                          href="/dashboard/connections"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand-900 hover:underline"
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
    </Panel>
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
      <Panel
        title="Affordability"
        action={<StatusPill status={DIMENSION_STATUS.insufficient_evidence} />}
      >
        <div className="flex items-start gap-2.5">
          <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          <p className="text-sm leading-relaxed text-content-secondary">
            We could not calculate affordability reliably because verified income information is
            incomplete.
          </p>
        </div>
        <Link
          href="/dashboard/connections"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-900 hover:underline"
        >
          Connect bank account <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>
    )
  }

  const st = DIMENSION_STATUS[AFFORDABILITY_MAP[aff.rating] ?? 'moderate']
  const atRisk = aff.rating === 'at_risk'
  return (
    <Panel title="Affordability" action={<StatusPill status={st} />}>
      <p className="mb-4 text-sm leading-relaxed text-content-secondary">
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
        href="/dashboard/trust-profile/financial-profile"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-900 hover:underline"
      >
        View full breakdown <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Panel>
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
    <div className="rounded-panel border border-line bg-surface-secondary px-3 py-2.5">
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'good' ? 'text-success-strong' : tone === 'bad' ? 'text-danger-strong' : 'text-content',
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-content-muted">{sub}</p>
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
    <Panel title="Connected evidence">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <CountTile icon={Building2} count={bankCount} label={`bank connection${bankCount === 1 ? '' : 's'}`} />
        <CountTile icon={FileText} count={documentCount} label={`document${documentCount === 1 ? '' : 's'} uploaded`} />
        <CountTile icon={ShieldCheck} count={verifiedAreas} label={`of ${categories.length} areas verified`} />
      </div>
      <div className="divide-y divide-line-subtle rounded-panel border border-line bg-surface-secondary px-4">
        {categories.map((c) => (
          <div key={c.label} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-content">{c.label}</span>
            <StatusPill status={c.status} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-content-muted">
        Connected Open Banking data counts as verified evidence, alongside any uploaded documents.
      </p>
    </Panel>
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
    <div className="rounded-panel border border-line bg-surface-secondary px-3 py-3">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-900" aria-hidden />
        <span className="text-xl font-semibold tabular-nums text-content">{count}</span>
      </div>
      <p className="text-xs leading-tight text-content-secondary">{label}</p>
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
    <Panel
      title="Sharing activity"
      action={
        <Link href="/dashboard/share" className={buttonClasses('primary', 'sm')}>
          Create a share
        </Link>
      }
    >
      {sharingStatus === 'available_with_warning' && (
        <div className="mb-4 flex items-start gap-2.5 rounded-panel bg-warning-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden />
          <p className="text-sm text-warning-strong">
            You can share the current version of your Trust Profile. Recipients will be shown that
            identity verification is incomplete.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <span className="text-content-secondary">
          Active shares <span className="ml-1 font-semibold text-content">{active.length}</span>
        </span>
        <span className="text-content-secondary">
          Expired links <span className="ml-1 font-semibold text-content">{expired}</span>
        </span>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-content-secondary">
          No active share links. Create a share to send your Trust Profile to a landlord, letting
          agent or lender.
        </p>
      ) : (
        <div className="space-y-3">
          {active.slice(0, 3).map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-content">
                  {s.targetName ?? TARGET_LABELS[s.targetType ?? 'other'] ?? 'Recipient'}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-content-muted">
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
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-900 hover:underline"
                >
                  View shared version <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                <Link
                  href="/dashboard/share"
                  className="text-sm font-medium text-content-secondary hover:text-content hover:underline"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
