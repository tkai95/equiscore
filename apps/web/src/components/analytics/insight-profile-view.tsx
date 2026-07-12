'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ChevronRight,
  PiggyBank,
  CreditCard,
  Landmark,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { TIER_LABELS } from '@equiscore/shared'
import type { TrustTier } from '@equiscore/shared'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Card as UICard, Display, StatusPill, buttonClasses, type StatusTone } from '@/components/ui'
import { BreakdownDrawer, type DrawerSpec } from './breakdown-drawer'

// Mirrors the InsightProfile shape returned by GET /insights/profile.
type Rating = 'strong' | 'moderate' | 'medium' | 'limited'
type Consistency = 'very_consistent' | 'consistent' | 'variable' | 'one_off'
type Source = 'open_banking' | 'statement_upload' | 'test'

interface InsightProfile {
  period: { from: string; to: string; months: number; transactionCount: number }
  income: {
    averageMonthlyIncome: number
    netAnnualIncome: number
    personalTransfersMonthly: number
    salaryMonthlyNet: number | null
    estimatedGrossAnnualSalary: number | null
    consistency: Consistency
    recurringSalaryDetected: boolean
    primaryCharacter: string
    characterTags: string[]
    sources: Array<{ name: string; key: string; category: string; monthlyAverage: number; monthsPresent: number; pendingConfirmation: boolean }>
    narrative: string
  }
  expenses: {
    averageMonthlySpend: number
    essentialShare: number
    hasCreditOrLoanRepayments: boolean
    categories: Array<{ key: string; label: string; monthlyAverage: number; share: number; essential: boolean; unconfirmed: boolean }>
    narrative: string
  }
  commitments: Array<{
    name: string
    key: string
    amount: number
    cadence: string
    typicalDayOfMonth: number | null
    dayVariance: number
    consistency: Consistency
    occurrences: number
    monthsCovered: number
    missedCount: number
    returnedCount: number
  }>
  paymentBehaviour: { onTimeRatio: number; returnedPayments: number; missedPayments: number; narrative: string }
  stability: Record<string, boolean | number>
  risk: { level: string; typologies: string[]; clearedTypologies: string[] }
  unusual: Array<{
    id: string
    date: string
    amount: number
    direction: 'credit' | 'debit'
    counterparty: string
    reason: string
    context: { isolated: boolean; namedRecipient: boolean; normalBeforeAfter: boolean; matchesTypology: boolean }
    status: string
  }>
  questions: Array<{ id: string; question: string; detail: string; options: string[]; clarifies: string }>
  subScores: Array<{ key: string; label: string; score: number; rating: Rating }>
  transactionClarity: number
  overall: { score: number; tier: string; label: string; limitingFactors: string[] }
  affordability: {
    monthlyIncome: number
    essentialOutgoings: number
    discretionarySpend: number
    currentRent: number | null
    debtRepayments: number
    fixedCommitments: number
    disposableIncome: number
    surplusAfterAll: number
    ratios: { rentToIncome: number | null; debtToIncome: number; commitmentsToIncome: number; essentialsToIncome: number }
    maxAffordableRent: number
    headroomForNewRent: number
    stressTest: { incomeDropPct: number; surplusUnderStress: number; stillPositive: boolean; essentialsCovered: boolean }
    incomeIsVariable: boolean
    rating: AffordabilityRating
    notes: string[]
  }
  externalAccounts: Array<{
    type: 'savings' | 'investment' | 'credit' | 'own_current' | 'unknown'
    key: string
    label: string
    provider: string | null
    direction: 'outflow' | 'inflow' | 'both'
    monthlyFlow: number
    confidence: 'high' | 'medium'
    reason: string
  }>
  summary: string
  source: Source
}

type AffordabilityRating = 'comfortable' | 'manageable' | 'stretched' | 'at_risk'

type ScoreStatus =
  | 'current'
  | 'expiring_soon'
  | 'expired'
  | 'evidence_withdrawn'
  | 'insufficient_evidence'

// The ONE canonical score, shared with the dashboard, My Trust Score, and share
// links. The insight engine no longer shows a competing number of its own — its
// behavioural analysis is the detail beneath this score, not a second score.
interface CanonicalScore {
  overallScore: number
  overallTier: TrustTier
  computedAt: string
  status?: ScoreStatus
  isCurrent?: boolean
  financialDataAsOf?: string | null
  validUntil?: string | null
}

// Two-tone semantics: green = consistent/reliable, amber = variable, neutral = one-off.
const CONSISTENCY_TONE: Record<Consistency, StatusTone> = {
  very_consistent: 'success',
  consistent: 'success',
  variable: 'warning',
  one_off: 'neutral',
}
const CONSISTENCY_LABEL: Record<Consistency, string> = {
  very_consistent: 'Very consistent',
  consistent: 'Consistent',
  variable: 'Variable',
  one_off: 'One-off',
}
const CHARACTER_LABEL: Record<string, string> = {
  employment: 'Employment',
  self_employed: 'Self-employed',
  gig: 'Gig / freelance',
  benefits: 'Benefits',
  mixed: 'Mixed sources',
  unclear: 'Unclear',
}
const STABILITY_LABEL: Record<string, string> = {
  stableIncome: 'Stable monthly income',
  rentNeverMissed: 'Rent paid consistently',
  billsPaidOnTime: 'Essential bills paid on time',
  positiveMonthlySurplus: 'Positive monthly surplus',
  noOverdraftDependency: 'No overdraft dependency',
  noRecurringFailedPayments: 'No recurring failed payments',
}

// Evidence type and its verification language, driven by the data source. A
// statement is trusted but explicitly NOT "bank-verified".
const EVIDENCE_BY_SOURCE: Record<Source, { type: string; verified: string }> = {
  open_banking: { type: 'Open Banking', verified: 'Bank-verified via Open Banking' },
  statement_upload: { type: 'Uploaded statement', verified: 'Statement-verified, not bank-verified' },
  test: { type: 'Sample data', verified: 'Sample data, not verified' },
}

const STATUS_BADGE: Record<ScoreStatus, { label: string; tone: StatusTone }> = {
  current: { label: 'Current', tone: 'success' },
  expiring_soon: { label: 'Expiring soon', tone: 'warning' },
  expired: { label: 'Expired', tone: 'neutral' },
  evidence_withdrawn: { label: 'Evidence withdrawn', tone: 'danger' },
  insufficient_evidence: { label: 'Insufficient evidence', tone: 'neutral' },
}

const AFFORDABILITY_RATING: Record<AffordabilityRating, { label: string; tone: StatusTone }> = {
  comfortable: { label: 'Comfortable', tone: 'success' },
  manageable: { label: 'Manageable', tone: 'success' },
  stretched: { label: 'Stretched', tone: 'warning' },
  at_risk: { label: 'At risk', tone: 'danger' },
}

const ordinal = (n: number) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
const cadenceLabel = (c: string) => c.replace('_', '-').replace(/\b\w/g, (m) => m.toUpperCase())

/** Section heading moved inside the panel: header · divider · content. */
function Panel({
  title,
  subtitle,
  help,
  children,
}: {
  title: string
  subtitle?: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <UICard padding="none">
      <div className="border-b border-line-subtle px-6 py-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-semibold text-content">{title}</h2>
          {help && <InfoTooltip label={`How ${title} is calculated`}>{help}</InfoTooltip>}
        </div>
        {subtitle && <p className="mt-1 text-sm text-content-secondary">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </UICard>
  )
}

export function InsightProfileView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [drawer, setDrawer] = useState<DrawerSpec | null>(null)
  const [answering, setAnswering] = useState<string | null>(null)

  // Capturing an answer resolves the flag and moves the score, so refresh
  // everything derived from the profile.
  const answerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      setAnswering(questionId)
      const token = await getToken()
      return api.insights.answerQuestion(token!, questionId, answer)
    },
    onSuccess: () => {
      for (const key of [['insight-profile'], ['score'], ['analytics-summary']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
    onSettled: () => setAnswering(null),
  })
  const { data: profile, isLoading } = useQuery<InsightProfile | null>({
    queryKey: ['insight-profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.insights.getProfile(token!) as Promise<InsightProfile | null>
    },
    staleTime: 5 * 60 * 1000,
  })

  // The canonical Trust Score (same cache key the dashboard + My Trust Score use),
  // so every surface shows the same number and an import refreshes it here too.
  const { data: score } = useQuery<CanonicalScore | null>({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!) as Promise<CanonicalScore | null>
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-card bg-surface-hover" />
  }
  if (!profile || profile.period.transactionCount === 0) {
    return (
      <UICard padding="none" className="border-dashed p-10 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-content-muted" />
        <p className="mt-3 text-sm font-medium text-content">No financial evidence yet</p>
        <p className="mt-1 text-xs text-content-muted">
          Connect a bank account or upload a statement to build your insight profile.
        </p>
      </UICard>
    )
  }

  const income = profile.income
  const expenses = profile.expenses
  const aff = profile.affordability
  const affStyle = AFFORDABILITY_RATING[aff.rating]
  const evidence = EVIDENCE_BY_SOURCE[profile.source] ?? EVIDENCE_BY_SOURCE.statement_upload
  const status = score?.status
  const badge = status ? STATUS_BADGE[status] : null

  const contextClear = profile.risk.level === 'low' && profile.unusual.length === 0
  const strengths = Object.entries(STABILITY_LABEL).filter(([key]) => profile.stability[key] === true)

  return (
    <div className="space-y-6">
      {/* ── 1. EquiScore profile: the judgement, up top ───────────────────── */}
      <UICard padding="md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
            Your EquiScore profile
          </p>
          {badge && (
            <StatusPill status={badge.tone} icon={<Clock />} label={badge.label} />
          )}
        </div>

        {score ? (
          <div className="mt-3 flex items-end gap-4">
            <Display size="score" className="text-brand-900">
              {score.overallScore}
            </Display>
            <div className="pb-1.5">
              <p className="text-sm text-content-muted">out of 100</p>
              <p className="text-lg font-semibold text-content">
                Tier {score.overallTier} · {TIER_LABELS[score.overallTier]}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-2xl font-semibold text-content-muted">Not yet generated</p>
            <p className="mt-2 text-sm text-content-secondary">
              Generate your assessment on the{' '}
              <a href="/dashboard/trust-score" className="font-medium text-brand-900 hover:underline">
                Assessment
              </a>{' '}
              page to see it here.
            </p>
          </div>
        )}
        <p className="mt-3 text-sm text-content-secondary">{evidence.verified}</p>
        <p className="mt-1 text-sm text-content-muted">
          Based on {profile.period.months}{' '}
          {profile.period.months === 1 ? 'month' : 'months'} of evidence ·{' '}
          {profile.period.transactionCount.toLocaleString()} transactions
        </p>

        {/* Plain-English summary of the financial behaviour behind the score */}
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-content-secondary">{profile.summary}</p>

        {/* Evidence + freshness */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line-subtle pt-5 text-base sm:grid-cols-4">
          <Field label="Evidence type" value={evidence.type} />
          <Field
            label="Financial data as of"
            value={score?.financialDataAsOf ? formatDate(score.financialDataAsOf) : formatDate(profile.period.to)}
          />
          <Field
            label="Score calculated"
            value={score?.computedAt ? formatDate(score.computedAt) : '—'}
          />
          <Field
            label="Valid until"
            value={score?.validUntil ? formatDate(score.validUntil) : '—'}
          />
        </dl>
      </UICard>

      {/* ── 2. Key strengths + what could improve ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Key strengths" subtitle="Signals traditional credit checks may miss">
          {strengths.length === 0 ? (
            <p className="text-sm text-content-muted">
              Add more financial evidence to surface your strengths.
            </p>
          ) : (
            <div className="space-y-2">
              {strengths.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success-strong" />
                  <span className="text-content-secondary">{label}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="What could improve this profile">
          {profile.overall.limitingFactors.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success-strong">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Nothing significant is holding this profile back.
            </div>
          ) : (
            <ul className="space-y-2">
              {profile.overall.limitingFactors.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-content-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-content-muted" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Affordability ─────────────────────────────────────────────────── */}
      <UICard padding="md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-content">Affordability</h2>
            <InfoTooltip label="How affordability is calculated">
              Worked out from take-home income and real monthly outgoings: what is left after
              essential costs, how rent compares to income, and whether a 20% income drop could be
              absorbed.
            </InfoTooltip>
          </div>
          <StatusPill status={affStyle.tone} label={affStyle.label} />
        </div>
        <p className="mt-1 text-sm text-content-secondary">
          Based on take-home income of {formatCurrency(aff.monthlyIncome)}/month
          {aff.incomeIsVariable && ' (income varies month to month)'}
        </p>

        {(income.estimatedGrossAnnualSalary !== null || income.personalTransfersMonthly > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {income.estimatedGrossAnnualSalary !== null && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-content-secondary">
                Estimated gross salary ≈{' '}
                <strong className="tabular-nums text-content">
                  £{income.estimatedGrossAnnualSalary.toLocaleString('en-GB')}
                </strong>
                /year
                <InfoTooltip label="How the gross salary is estimated">
                  Statements only show take-home pay, after income tax and National Insurance. We
                  reverse those deductions on the detected salary to suggest the equivalent gross
                  figure. It is an estimate and can&apos;t see pension contributions, salary
                  sacrifice or student-loan deductions.
                </InfoTooltip>
              </span>
            )}
            {income.personalTransfersMonthly > 0 && (
              <span className="rounded-lg bg-surface-inset px-3 py-1.5 text-content-secondary">
                {formatCurrency(income.personalTransfersMonthly)}/mo received as personal transfers —
                not counted as income
              </span>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-panel bg-surface-inset px-4 py-3">
            <p className="text-sm text-content-muted">Disposable after essentials</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-content">
              {formatCurrency(aff.disposableIncome)}
              <span className="text-sm font-normal text-content-muted">/mo</span>
            </p>
          </div>
          <div className="rounded-panel bg-surface-inset px-4 py-3">
            <p className="text-sm text-content-muted">Surplus after all spending</p>
            <p
              className={cn(
                'mt-0.5 text-2xl font-semibold tabular-nums',
                aff.surplusAfterAll >= 0 ? 'text-success-strong' : 'text-danger-strong'
              )}
            >
              {aff.surplusAfterAll >= 0 ? '+' : ''}
              {formatCurrency(aff.surplusAfterAll)}
              <span className="text-sm font-normal text-content-muted">/mo</span>
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {aff.ratios.rentToIncome !== null && (
            <RatioBar label="Rent to income" value={aff.ratios.rentToIncome} good={0.35} warn={0.45} />
          )}
          <RatioBar label="Essential costs to income" value={aff.ratios.essentialsToIncome} good={0.6} warn={0.8} />
          {aff.debtRepayments > 0 && (
            <RatioBar label="Debt repayments to income" value={aff.ratios.debtToIncome} good={0.1} warn={0.2} />
          )}
        </div>

        <div className="mt-5 rounded-panel bg-brand-50 px-4 py-3">
          <p className="text-sm text-content-secondary">Estimated maximum sustainable rent</p>
          <p className="mt-0.5 text-xl font-semibold text-brand-900">
            {formatCurrency(aff.maxAffordableRent)}
            <span className="text-sm font-normal text-content-muted">/month</span>
          </p>
          {aff.currentRent !== null && (
            <p className="mt-1 text-sm text-content-muted">
              {aff.headroomForNewRent > 0
                ? `About ${formatCurrency(aff.headroomForNewRent)}/month of headroom above the current ${formatCurrency(aff.currentRent)} rent.`
                : `Currently paying ${formatCurrency(aff.currentRent)}, at or near the sustainable ceiling.`}
            </p>
          )}
        </div>

        <div
          className={cn(
            'mt-4 flex items-start gap-2 rounded-panel px-4 py-3 text-sm',
            aff.stressTest.stillPositive
              ? 'bg-success-soft text-success-strong'
              : 'bg-warning-soft text-warning-strong'
          )}
        >
          {aff.stressTest.stillPositive ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            <span className="font-medium">Stress test: </span>
            if income dropped {aff.stressTest.incomeDropPct}%, {stressMessage(aff.stressTest)}
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {aff.notes.map((n) => (
            <li key={n} className="flex items-start gap-2 text-sm text-content-secondary">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-content-muted" />
              {n}
            </li>
          ))}
        </ul>
      </UICard>

      {/* ── Other accounts we spotted ─────────────────────────────────────── */}
      {profile.externalAccounts.length > 0 && (
        <UICard padding="md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-semibold text-content">Other accounts we spotted</h2>
              <InfoTooltip label="How this is detected">
                Money moving to and from this account reveals others you hold — a savings pot, a
                credit card, or another account in your name. Connecting them gives a complete
                picture and usually strengthens your profile.
              </InfoTooltip>
            </div>
            <StatusPill status="warning" label="Partial picture" />
          </div>
          <p className="mt-1 text-sm text-content-secondary">
            This profile is built from one account. These look like accounts we can&apos;t see yet.
          </p>

          <div className="mt-4 space-y-2">
            {profile.externalAccounts.map((a, i) => {
              const Icon =
                a.type === 'savings'
                  ? PiggyBank
                  : a.type === 'investment'
                    ? TrendingUp
                    : a.type === 'credit'
                      ? CreditCard
                      : a.type === 'unknown'
                        ? HelpCircle
                        : Landmark
              return (
                <div key={i} className="flex items-start gap-3 rounded-panel bg-surface-inset px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-card border border-line">
                    <Icon className="h-4 w-4 text-brand-900" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-content">{a.label}</p>
                      {a.type === 'unknown' ? (
                        <StatusPill status="warning" label="confirm below" className="h-5 px-2 text-[10px]" />
                      ) : (
                        a.confidence === 'medium' && (
                          <StatusPill status="neutral" label="likely" className="h-5 px-2 text-[10px]" />
                        )
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-content-secondary">{a.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <Link href="/dashboard/connections" className={buttonClasses('primary', 'md', 'mt-4')}>
            Add your other accounts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </UICard>
      )}

      {/* ── 3. Follow-up questions ────────────────────────────────────────── */}
      {profile.questions.length > 0 && (
        <div className="rounded-card border border-brand-100 bg-brand-50 p-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-brand-900" />
            <h2 className="text-base font-semibold text-content">
              Help us understand {profile.questions.length}{' '}
              {profile.questions.length === 1 ? 'thing' : 'things'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-content-secondary">
            These are not problems. Answering them raises your transaction clarity and can lift your
            score.
          </p>
          <div className="mt-4 space-y-3">
            {profile.questions.map((q, i) => (
              <div key={q.id} className="rounded-panel border border-line bg-surface-card p-4">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-900">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content">{q.question}</p>
                    <p className="mt-1 text-sm text-content-muted">{q.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <button
                          key={o}
                          onClick={() => answerMutation.mutate({ questionId: q.id, answer: o })}
                          disabled={answering !== null}
                          className="rounded-lg bg-surface-inset px-2.5 py-1 text-sm text-content-secondary transition-colors hover:bg-brand hover:text-cream-surface disabled:opacity-50"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    {answering === q.id && (
                      <p className="mt-2 text-xs text-brand-900">Saving your answer…</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Income ─────────────────────────────────────────────────────── */}
      <Panel title="Income" subtitle={income.narrative}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-content">
            {formatCurrency(income.averageMonthlyIncome)}
          </span>
          <span className="text-sm text-content-muted">/ month</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900">
            {CHARACTER_LABEL[income.primaryCharacter] ?? income.primaryCharacter}
          </span>
          {income.characterTags.map((t) => (
            <span key={t} className="rounded-full bg-surface-inset px-2.5 py-1 text-xs text-content-secondary">
              {t}
            </span>
          ))}
        </div>
        {income.sources.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-line-subtle pt-4">
            {income.sources.map((s) => (
              <button
                key={s.name}
                onClick={() =>
                  setDrawer({ type: 'income', key: s.key, title: s.name, subtitle: 'Money received' })
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-1 font-medium text-content">
                    {s.name}
                    <ChevronRight className="h-3.5 w-3.5 text-content-muted" />
                  </span>
                  {s.pendingConfirmation && (
                    <span className="text-sm text-warning-strong">needs confirmation</span>
                  )}
                  <span className="block text-sm text-content-muted">{s.monthsPresent} months</span>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-content">
                  {formatCurrency(s.monthlyAverage)}/mo
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* ── 5. Commitments ────────────────────────────────────────────────── */}
      {profile.commitments.length > 0 && (
        <Panel
          title="Bills and commitments"
          subtitle="EquiScore identifies recurring commitments and checks whether they are paid consistently and on time. This is one of its strongest signals."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-content-muted">
                  <th className="pb-2 font-medium">Commitment</th>
                  <th className="pb-2 text-right font-medium">Typical amount</th>
                  <th className="pb-2 font-medium">Usual day</th>
                  <th className="pb-2 font-medium">Pattern</th>
                  <th className="pb-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      Paid
                      <InfoTooltip label="How Paid is calculated">
                        Payments found versus the number of months in the covered period. Returned or
                        bounced payments are flagged separately.
                      </InfoTooltip>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {profile.commitments.map((c) => (
                  <tr
                    key={c.name}
                    onClick={() =>
                      setDrawer({
                        type: 'commitment',
                        key: c.key,
                        title: c.name,
                        subtitle: `${cadenceLabel(c.cadence)} commitment · payment history`,
                      })
                    }
                    className="cursor-pointer transition-colors hover:bg-surface-hover"
                  >
                    <td className="py-2.5 font-medium text-content">
                      <span className="flex items-center gap-1">
                        {c.name}
                        <ChevronRight className="h-3.5 w-3.5 text-content-muted" />
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-content-secondary">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="py-2.5 tabular-nums text-content-secondary">
                      {c.typicalDayOfMonth ? ordinal(c.typicalDayOfMonth) : cadenceLabel(c.cadence)}
                      {c.typicalDayOfMonth != null && (
                        <span className="ml-1 text-xs text-content-muted">±{c.dayVariance}d</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <StatusPill status={CONSISTENCY_TONE[c.consistency]} label={CONSISTENCY_LABEL[c.consistency]} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-content-secondary">
                      {c.occurrences}/{Math.max(c.monthsCovered, c.occurrences)}
                      {c.returnedCount > 0 && (
                        <span className="ml-1 text-xs text-warning-strong">({c.returnedCount} returned)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-content-muted">{profile.paymentBehaviour.narrative}</p>
        </Panel>
      )}

      {/* ── 6. Where it goes ──────────────────────────────────────────────── */}
      <Panel title="Where it goes" subtitle={expenses.narrative}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-content">
            {formatCurrency(expenses.averageMonthlySpend)}
          </span>
          <span className="text-sm text-content-muted">
            / month · {Math.round(expenses.essentialShare * 100)}% essential
          </span>
        </div>
        <div className="mt-4 space-y-1">
          {expenses.categories.slice(0, 8).map((c) => (
            <button
              key={c.key}
              onClick={() =>
                setDrawer({ type: 'category', key: c.key, title: c.label, subtitle: 'Spending category' })
              }
              className="grid w-full grid-cols-[11rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-hover"
            >
              <span className="flex items-center gap-1 truncate text-sm text-content-secondary" title={c.label}>
                <span className="truncate">{c.label}</span>
                {c.unconfirmed && <span className="text-warning-strong">•</span>}
              </span>
              <span className="h-2 rounded-full bg-surface-hover">
                <span
                  className={cn('block h-full rounded-full', c.essential ? 'bg-brand-600' : 'bg-chart-4')}
                  style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }}
                />
              </span>
              <span className="flex items-center gap-1 text-sm tabular-nums text-content-muted">
                {formatCurrency(c.monthlyAverage)}
                <ChevronRight className="h-3.5 w-3.5 text-content-muted" />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-content-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-600" /> Essential
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chart-4" /> Discretionary
          </span>
        </div>
      </Panel>

      {/* ── 7. Context review ─────────────────────────────────────────────── */}
      <Panel
        title={contextClear ? 'Context review' : 'Flagged for context'}
        subtitle="Surfaced for you to explain, not automatically counted against you"
      >
        {profile.unusual.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success-strong">
            <CheckCircle2 className="h-4 w-4" />
            No unusual patterns detected.
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-content-secondary">
              We found patterns that may need explanation. These are not treated as negative unless
              they remain unexplained.
            </p>
            <div className="space-y-3">
              {profile.unusual.map((u) => (
                <div key={u.id} className="rounded-panel border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" />
                      <div>
                        <p className="text-sm font-medium text-content">
                          {u.direction === 'debit' ? 'Payment to' : 'Receipt from'} {u.counterparty}
                        </p>
                        <p className="text-xs text-content-muted">
                          {formatDate(u.date)} · {u.reason}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-content">
                      {formatCurrency(u.amount)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                    {u.context.isolated && <Chip>Isolated</Chip>}
                    {u.context.namedRecipient && <Chip>Named recipient</Chip>}
                    {!u.context.matchesTypology && <Chip good>No mule pattern</Chip>}
                    {u.context.normalBeforeAfter && <Chip good>Normal before and after</Chip>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {profile.risk.clearedTypologies.length > 0 && (
          <p className="mt-3 border-t border-line-subtle pt-3 text-xs text-success-strong">
            Checked and absent: {profile.risk.clearedTypologies.join(', ')}.
          </p>
        )}
      </Panel>

      <BreakdownDrawer spec={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}

function RatioBar({
  label,
  value,
  good,
  warn,
}: {
  label: string
  value: number
  good: number
  warn: number
}) {
  const pct = Math.min(100, Math.round(value * 100))
  const color = value <= good ? 'bg-brand-600' : value <= warn ? 'bg-warning-bar' : 'bg-danger'
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-content-secondary">{label}</span>
        <span className="font-medium tabular-nums text-content">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-hover">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  )
}

function stressMessage(s: { surplusUnderStress: number; stillPositive: boolean; essentialsCovered: boolean }): string {
  const gbp = formatCurrency(Math.abs(s.surplusUnderStress))
  if (s.stillPositive) return `there would still be about ${gbp}/month spare.`
  if (s.essentialsCovered) return `the monthly surplus would be gone, but essential costs would still be covered.`
  return `essential costs would no longer be fully covered.`
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-content-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-content">{value}</dd>
    </div>
  )
}

function Chip({ children, good }: { children: React.ReactNode; good?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs',
        good ? 'bg-success-soft text-success-strong' : 'bg-surface-inset text-content-secondary'
      )}
    >
      {children}
    </span>
  )
}
