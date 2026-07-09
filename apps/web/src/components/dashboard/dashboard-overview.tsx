'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  FileText,
  Users,
  Briefcase,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { api, type ScoreImprovements } from '@/lib/api'
import { cn, TIER_COLORS, formatCurrency } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TIER_LABELS } from '@equiscore/shared'

type InsightData = {
  period: { transactionCount: number }
  affordability: {
    rating: 'comfortable' | 'manageable' | 'stretched' | 'at_risk'
    disposableIncome: number
    surplusAfterAll: number
    ratios: { rentToIncome: number | null }
  }
} | null

const AFF_RATING: Record<string, { label: string; className: string }> = {
  comfortable: { label: 'Comfortable', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  manageable: { label: 'Manageable', className: 'bg-teal-50 text-teal-700 ring-teal-200' },
  stretched: { label: 'Stretched', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  at_risk: { label: 'At risk', className: 'bg-red-50 text-red-700 ring-red-200' },
}

// ── Types ──────────────────────────────────────────────────────────────────

type ScoreData = {
  overallScore: number
  overallTier: TrustTier
  profileCompletenessScore: number
  verificationStrengthScore: number
  incomeStabilityScore: number
  affordabilityScore: number
  rentalReliabilityScore: number
  reasonCodes: Array<{ sentiment: string; message: string }>
  computedAt: string
} | null

type ProfileData = {
  profileStage: string
  fullName?: string
  employmentType?: string
} | null

type AccountData = {
  id: string
  accountName: string | null
  bankConnection: {
    institutionName: string | null
    connectionStatus: string
    lastSyncedAt: string | null
  }
}

type DocData = {
  id: string
  documentType: string
  verificationStatus: string
  uploadedAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  'created',
  'onboarding',
  'profile_building',
  'banking_connected',
  'documents_uploaded',
  'scored',
  'complete',
]

function stageIndex(stage: string | null) {
  const i = STAGE_ORDER.indexOf(stage ?? 'created')
  return i < 0 ? 0 : i
}

function getNextStep(
  profileStage: string | null,
  hasScore: boolean,
  accounts: AccountData[],
  docs: DocData[],
) {
  const idx = stageIndex(profileStage)
  if (idx < stageIndex('profile_building'))
    return {
      label: 'Complete your profile',
      href: '/dashboard/profile',
      detail: 'Add your personal details to get started',
    }
  if (accounts.length === 0)
    return {
      label: 'Connect a bank account',
      href: '/dashboard/connections',
      detail: 'Verify your income and rental payments automatically',
    }
  if (docs.length === 0)
    return {
      label: 'Upload a document',
      href: '/dashboard/documents',
      detail: 'Add a payslip, bank statement or proof of identity',
    }
  if (!hasScore)
    return {
      label: 'Generate your trust score',
      href: '/dashboard/trust-score',
      detail: 'Calculate your Equiscore based on your connected data',
    }
  return {
    label: 'Share your profile',
    href: '/dashboard/share',
    detail: 'Send your score to a landlord or employer',
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

const TIER_HEX: Record<TrustTier, string> = {
  A: '#123C35',
  B: '#3D6658',
  C: '#8FA491',
  D: '#C7A66A',
  E: '#A96E52',
}

function PassportRing({ score, tier, size = 148 }: { score: number; tier: TrustTier; size?: number }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = TIER_HEX[tier]
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8E6DC" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {tier}
        </span>
        <span className="text-xs text-gray-500">{score} / 100</span>
      </div>
    </div>
  )
}

function DimBar({ label, value, action }: { label: string; value: number; action?: string }) {
  const pct = Math.round(value)
  const color =
    pct >= 70 ? 'bg-brand' : pct >= 50 ? 'bg-sage' : pct >= 30 ? 'bg-amber-400' : 'bg-rose-400'
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{pct}</span>
          {action && <span className="text-xs font-medium text-brand">{action}</span>}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function EvidenceTile({
  icon: Icon,
  label,
  status,
  detail,
  href,
}: {
  icon: React.ElementType
  label: string
  status: 'connected' | 'partial' | 'missing'
  detail: string
  href: string
}) {
  const dotColor =
    status === 'connected'
      ? 'bg-emerald-400'
      : status === 'partial'
        ? 'bg-amber-400'
        : 'bg-gray-200'
  const borderColor =
    status === 'connected'
      ? 'border-emerald-100'
      : status === 'partial'
        ? 'border-amber-100'
        : 'border-gray-100'
  return (
    <Link
      href={href}
      className={cn(
        'group rounded-xl border bg-white p-4 transition-all hover:shadow-sm',
        borderColor,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 transition-colors group-hover:bg-gray-100">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div className={cn('h-2 w-2 rounded-full', dotColor)} />
      </div>
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className="mt-0.5 text-xs capitalize text-gray-500">{detail}</p>
    </Link>
  )
}

function StatusDot({ status }: { status: 'verified' | 'partial' | 'none' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'verified' && 'bg-emerald-50 text-emerald-700',
        status === 'partial' && 'bg-amber-50 text-amber-700',
        status === 'none' && 'bg-gray-50 text-gray-400',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'verified'
            ? 'bg-emerald-500'
            : status === 'partial'
              ? 'bg-amber-400'
              : 'bg-gray-300',
        )}
      />
      {status === 'verified' ? 'Verified' : status === 'partial' ? 'Partial' : 'Not added'}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { getToken } = useAuth()

  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!, 'general') as Promise<ScoreData>
    },
  })

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.profile.get(token!) as Promise<ProfileData>
    },
  })

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const token = await getToken()
      return api.banking.getAccounts(token!) as Promise<AccountData[]>
    },
  })

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const token = await getToken()
      return api.documents.list(token!) as Promise<DocData[]>
    },
  })

  const { data: improvements } = useQuery<ScoreImprovements>({
    queryKey: ['score-improvements'],
    enabled: !!score,
    queryFn: async () => {
      const token = await getToken()
      return api.scores.improvements(token!, 'general')
    },
  })

  const topImprovement = improvements?.improvements[0]

  const { data: insight } = useQuery<InsightData>({
    queryKey: ['insight-profile'],
    enabled: accounts.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const token = await getToken()
      return api.insights.getProfile(token!) as Promise<InsightData>
    },
  })
  const aff = insight && insight.period.transactionCount > 0 ? insight.affordability : null

  const isLoading = scoreLoading || profileLoading || accountsLoading || docsLoading

  const profileStage = profile?.profileStage ?? null
  const profileIdx = stageIndex(profileStage)
  const completionPct = Math.round((profileIdx / (STAGE_ORDER.length - 1)) * 100)

  const nextStep = getNextStep(profileStage, !!score, accounts, documents)

  const submittedDocs = documents.filter((d) => d.verificationStatus !== 'rejected')
  const hasIdentityDoc = documents.some((d) =>
    ['passport', 'national_id', 'driving_licence', 'biometric_residence_permit'].includes(
      d.documentType,
    ),
  )
  const hasIncomeDoc = documents.some((d) =>
    ['payslip', 'p60', 'bank_statement', 'employment_letter', 'p45'].includes(d.documentType),
  )
  const hasActiveBank = accounts.some((a) => a.bankConnection.connectionStatus === 'active')


  return (
    <div className="space-y-5">
      {/* Row 1: Passport card + Recommended next step */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Passport card */}
        <div className="col-span-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Equiscore Passport
              </p>
              {profile?.fullName && (
                <h2 className="mt-0.5 text-lg font-semibold text-gray-900">{profile.fullName}</h2>
              )}
            </div>
            {score && (
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  TIER_COLORS[score.overallTier],
                )}
              >
                Tier {score.overallTier}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex h-36 animate-pulse items-center justify-center">
              <div className="h-36 w-36 rounded-full bg-gray-100" />
            </div>
          ) : score ? (
            <div className="flex items-center gap-8">
              <PassportRing score={score.overallScore} tier={score.overallTier} />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Trust Profile
                  </p>
                  <p className="text-3xl font-bold text-gray-900">Tier {score.overallTier}</p>
                  <p className="text-sm font-medium tabular-nums text-gray-500">
                    Score {score.overallScore} / 100
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">
                  {TIER_LABELS[score.overallTier]}
                </p>
                <Link
                  href="/dashboard/trust-score"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark"
                >
                  View full report <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                <span className="text-4xl font-bold text-gray-200">?</span>
              </div>
              <p className="text-sm text-gray-500">
                Connect a bank or upload a statement to generate your Equiscore
              </p>
              <Link
                href="/dashboard/connections"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark"
              >
                Add your bank data <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Recommended next step — data-driven from the improvement engine when scored */}
        <div className="col-span-2 flex flex-col rounded-2xl bg-brand p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Recommended Next Step
          </p>
          {topImprovement ? (
            <>
              <h3 className="mt-3 text-xl font-semibold leading-snug">{topImprovement.title}</h3>
              {topImprovement.estimatedGain !== null && (
                <p className="mt-2 text-sm font-semibold text-white">
                  +{topImprovement.estimatedGain} points
                  {topImprovement.reachesTier && topImprovement.reachesTier !== score?.overallTier
                    ? ` → Tier ${topImprovement.reachesTier}`
                    : ''}
                </p>
              )}
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/75">
                {topImprovement.detail}
              </p>
              <Link
                href={topImprovement.href}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-cream"
              >
                Do it now <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-xl font-semibold leading-snug">{nextStep.label}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/75">{nextStep.detail}</p>
              <Link
                href={nextStep.href}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-cream"
              >
                {nextStep.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Row 2: 3 info cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Profile completion */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Profile Completion
          </p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-gray-900">{completionPct}%</span>
            <span className="text-sm text-gray-400">
              {profileIdx} / {STAGE_ORDER.length - 1} steps
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs capitalize text-gray-500">
            {(profileStage ?? 'created').replace(/_/g, ' ')}
          </p>
        </div>

        {/* Share readiness */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Share Readiness
          </p>
          <div className="mt-3">
            {score ? (
              <>
                <p className="text-3xl font-bold text-emerald-600">Ready</p>
                <p className="mt-1 text-sm text-gray-500">Your profile is ready to share</p>
                <Link
                  href="/dashboard/share"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark"
                >
                  Share now <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-200">—</p>
                <p className="mt-1 text-sm text-gray-500">Generate a score first</p>
              </>
            )}
          </div>
        </div>

        {/* Evidence strength */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Evidence</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-gray-900">{submittedDocs.length}</span>
            <span className="text-sm text-gray-400">items uploaded</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <StatusDot status={hasIdentityDoc ? 'verified' : 'none'} />
            <StatusDot status={hasActiveBank ? 'verified' : 'none'} />
            <StatusDot status={hasIncomeDoc ? 'verified' : 'none'} />
          </div>
          <p className="mt-1 text-xs text-gray-400">Identity · Banking · Income</p>
        </div>
      </div>

      {/* Row 3: Score breakdown + Key signals (only when scored) */}
      {score && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-semibold text-gray-700">Score Breakdown</h2>
            <div className="space-y-4">
              <DimBar
                label="Profile Completeness"
                value={score.profileCompletenessScore}
                action={score.profileCompletenessScore < 70 ? 'Improve' : undefined}
              />
              <DimBar
                label="Verification Strength"
                value={score.verificationStrengthScore}
                action={score.verificationStrengthScore < 70 ? 'Add evidence' : undefined}
              />
              <DimBar
                label="Income Stability"
                value={score.incomeStabilityScore}
                action={score.incomeStabilityScore < 50 ? 'Connect bank' : undefined}
              />
              <DimBar label="Affordability" value={score.affordabilityScore} />
              <DimBar label="Rental Reliability" value={score.rentalReliabilityScore} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-semibold text-gray-700">Key Signals</h2>
            {score.reasonCodes.length === 0 ? (
              <p className="text-sm text-gray-400">No signals available yet</p>
            ) : (
              <div className="space-y-3">
                {score.reasonCodes.slice(0, 6).map((rc, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {rc.sentiment === 'positive' ? (
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    )}
                    <p className="text-sm leading-snug text-gray-700">{rc.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 4: Affordability snapshot + Connected evidence */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Affordability snapshot */}
        {aff ? (
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Affordability</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                  AFF_RATING[aff.rating]?.className,
                )}
              >
                {AFF_RATING[aff.rating]?.label ?? aff.rating}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-gray-500">Disposable</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
                  {formatCurrency(aff.disposableIncome)}
                </p>
                <p className="text-[11px] text-gray-400">after essentials</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-gray-500">Surplus</p>
                <p
                  className={cn(
                    'mt-0.5 text-lg font-semibold tabular-nums',
                    aff.surplusAfterAll >= 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  {aff.surplusAfterAll >= 0 ? '+' : ''}
                  {formatCurrency(aff.surplusAfterAll)}
                </p>
                <p className="text-[11px] text-gray-400">after all spending</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-gray-500">Rent</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
                  {aff.ratios.rentToIncome !== null
                    ? `${Math.round(aff.ratios.rentToIncome * 100)}%`
                    : '—'}
                </p>
                <p className="text-[11px] text-gray-400">of income</p>
              </div>
            </div>
            <Link
              href="/dashboard/analytics"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
            >
              Full breakdown <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <p className="text-sm text-gray-400">
              Add your bank data to see your affordability at a glance.
            </p>
            <Link
              href="/dashboard/connections"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
            >
              Add bank data <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Connected evidence tiles */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Connected Evidence</h2>
          <div className="grid grid-cols-2 gap-3">
            <EvidenceTile
              icon={Building2}
              label="Banking"
              status={
                hasActiveBank ? 'connected' : accounts.length > 0 ? 'partial' : 'missing'
              }
              detail={
                accounts.length > 0
                  ? `${accounts.length} account${accounts.length > 1 ? 's' : ''}`
                  : 'Not connected'
              }
              href="/dashboard/connections"
            />
            <EvidenceTile
              icon={FileText}
              label="Documents"
              status={
                submittedDocs.length > 2
                  ? 'connected'
                  : submittedDocs.length > 0
                    ? 'partial'
                    : 'missing'
              }
              detail={
                submittedDocs.length > 0 ? `${submittedDocs.length} uploaded` : 'None uploaded'
              }
              href="/dashboard/documents"
            />
            <EvidenceTile
              icon={Users}
              label="References"
              status="missing"
              detail="Coming soon"
              href="/dashboard/profile"
            />
            <EvidenceTile
              icon={Briefcase}
              label="Employment"
              status={profile?.employmentType ? 'partial' : 'missing'}
              detail={
                profile?.employmentType
                  ? profile.employmentType.replace(/_/g, ' ')
                  : 'Not added'
              }
              href="/dashboard/profile"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
