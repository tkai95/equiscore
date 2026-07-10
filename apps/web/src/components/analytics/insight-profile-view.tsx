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
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { TIER_LABELS } from '@equiscore/shared'
import type { TrustTier } from '@equiscore/shared'
import { InfoTooltip } from '@/components/ui/info-tooltip'
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

const CONSISTENCY_STYLE: Record<Consistency, string> = {
  very_consistent: 'bg-emerald-50 text-emerald-700',
  consistent: 'bg-teal-50 text-teal-700',
  variable: 'bg-amber-50 text-amber-700',
  one_off: 'bg-gray-100 text-gray-500',
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

const STATUS_BADGE: Record<ScoreStatus, { label: string; className: string }> = {
  current: { label: 'Current', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  expiring_soon: { label: 'Expiring soon', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
  evidence_withdrawn: { label: 'Evidence withdrawn', className: 'bg-red-50 text-red-700 ring-red-200' },
  insufficient_evidence: { label: 'Insufficient evidence', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
}

const AFFORDABILITY_RATING: Record<AffordabilityRating, { label: string; badge: string }> = {
  comfortable: { label: 'Comfortable', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  manageable: { label: 'Manageable', badge: 'bg-teal-50 text-teal-700 ring-teal-200' },
  stretched: { label: 'Stretched', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  at_risk: { label: 'At risk', badge: 'bg-red-50 text-red-700 ring-red-200' },
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

function Card({
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
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-1.5">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {help && <InfoTooltip label={`How ${title} is calculated`}>{help}</InfoTooltip>}
      </div>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
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
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  }
  if (!profile || profile.period.transactionCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-3 text-sm font-medium text-gray-600">No financial evidence yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Connect a bank account or upload a statement to build your insight profile.
        </p>
      </div>
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
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
            Your EquiScore profile
          </p>
          {badge && (
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                badge.className
              )}
            >
              <Clock className="h-3 w-3" />
              {badge.label}
            </span>
          )}
        </div>

        {score ? (
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-4xl font-bold text-gray-900">
                Trust Profile: {score.overallTier}
              </span>
              <span className="rounded-lg bg-gray-100 px-3 py-1 text-lg font-semibold tabular-nums text-gray-700">
                {score.overallScore}
                <span className="font-medium text-gray-400"> / 100</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <span className="text-2xl font-semibold text-gray-400">Not yet generated</span>
          </div>
        )}
        {score ? (
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {TIER_LABELS[score.overallTier]}
          </p>
        ) : (
          <p className="mt-2 text-base text-gray-500">
            Generate your Trust Score on{' '}
            <a href="/dashboard/trust-score" className="font-medium text-brand hover:underline">
              My Trust Score
            </a>{' '}
            to see it here.
          </p>
        )}
        <p className="mt-0.5 text-base text-gray-500">{evidence.verified}</p>
        <p className="mt-1 text-sm text-gray-400">
          Based on {profile.period.months}{' '}
          {profile.period.months === 1 ? 'month' : 'months'} of evidence ·{' '}
          {profile.period.transactionCount.toLocaleString()} transactions
        </p>

        {/* Plain-English summary of the financial behaviour behind the score */}
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">{profile.summary}</p>

        {/* Evidence + freshness */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-5 text-base sm:grid-cols-4">
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
      </div>

      {/* ── 2. Key strengths + what could improve ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Key strengths" subtitle="Signals traditional credit checks may miss">
          {strengths.length === 0 ? (
            <p className="text-sm text-gray-500">
              Add more financial evidence to surface your strengths.
            </p>
          ) : (
            <div className="space-y-2">
              {strengths.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="What could improve this profile">
          {profile.overall.limitingFactors.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Nothing significant is holding this profile back.
            </div>
          ) : (
            <ul className="space-y-2">
              {profile.overall.limitingFactors.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Affordability ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">Affordability</h2>
            <InfoTooltip label="How affordability is calculated">
              Worked out from take-home income and real monthly outgoings: what is left after
              essential costs, how rent compares to income, and whether a 20% income drop could be
              absorbed.
            </InfoTooltip>
          </div>
          <span className={cn('rounded-full px-2.5 py-0.5 text-sm font-medium ring-1', affStyle.badge)}>
            {affStyle.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Based on take-home income of {formatCurrency(aff.monthlyIncome)}/month
          {aff.incomeIsVariable && ' (income varies month to month)'}
        </p>

        {(income.estimatedGrossAnnualSalary !== null || income.personalTransfersMonthly > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {income.estimatedGrossAnnualSalary !== null && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-brand/5 px-3 py-1.5 text-gray-700 ring-1 ring-brand/10">
                Estimated gross salary ≈{' '}
                <strong className="tabular-nums">
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
              <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600 ring-1 ring-gray-200">
                {formatCurrency(income.personalTransfersMonthly)}/mo received as personal transfers —
                not counted as income
              </span>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-500">Disposable after essentials</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-gray-900">
              {formatCurrency(aff.disposableIncome)}
              <span className="text-sm font-normal text-gray-400">/mo</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-500">Surplus after all spending</p>
            <p
              className={cn(
                'mt-0.5 text-2xl font-semibold tabular-nums',
                aff.surplusAfterAll >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {aff.surplusAfterAll >= 0 ? '+' : ''}
              {formatCurrency(aff.surplusAfterAll)}
              <span className="text-sm font-normal text-gray-400">/mo</span>
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

        <div className="mt-5 rounded-lg bg-brand/5 px-4 py-3 ring-1 ring-brand/10">
          <p className="text-sm text-gray-600">Estimated maximum sustainable rent</p>
          <p className="mt-0.5 text-xl font-semibold text-brand">
            {formatCurrency(aff.maxAffordableRent)}
            <span className="text-sm font-normal text-gray-400">/month</span>
          </p>
          {aff.currentRent !== null && (
            <p className="mt-1 text-sm text-gray-500">
              {aff.headroomForNewRent > 0
                ? `About ${formatCurrency(aff.headroomForNewRent)}/month of headroom above the current ${formatCurrency(aff.currentRent)} rent.`
                : `Currently paying ${formatCurrency(aff.currentRent)}, at or near the sustainable ceiling.`}
            </p>
          )}
        </div>

        <div
          className={cn(
            'mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ring-1',
            aff.stressTest.stillPositive
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
              : 'bg-amber-50 text-amber-900 ring-amber-100'
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
            <li key={n} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
              {n}
            </li>
          ))}
        </ul>
      </div>

      {/* ── 3. Follow-up questions ────────────────────────────────────────── */}
      {profile.questions.length > 0 && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-brand" />
            <h2 className="text-lg font-semibold text-gray-900">
              Help us understand {profile.questions.length}{' '}
              {profile.questions.length === 1 ? 'thing' : 'things'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            These are not problems. Answering them raises your transaction clarity and can lift your
            score.
          </p>
          <div className="mt-4 space-y-3">
            {profile.questions.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{q.question}</p>
                    <p className="mt-1 text-sm text-gray-500">{q.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <button
                          key={o}
                          onClick={() => answerMutation.mutate({ questionId: q.id, answer: o })}
                          disabled={answering !== null}
                          className="rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-600 transition-colors hover:bg-brand hover:text-cream-surface disabled:opacity-50"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    {answering === q.id && (
                      <p className="mt-2 text-xs text-brand">Saving your answer…</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Income ─────────────────────────────────────────────────────── */}
      <Card title="Income" subtitle={income.narrative}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-gray-900">
            {formatCurrency(income.averageMonthlyIncome)}
          </span>
          <span className="text-sm text-gray-400">/ month</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
            {CHARACTER_LABEL[income.primaryCharacter] ?? income.primaryCharacter}
          </span>
          {income.characterTags.map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
              {t}
            </span>
          ))}
        </div>
        {income.sources.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-gray-100 pt-4">
            {income.sources.map((s) => (
              <button
                key={s.name}
                onClick={() =>
                  setDrawer({ type: 'income', key: s.key, title: s.name, subtitle: 'Money received' })
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-1 font-medium text-gray-800">
                    {s.name}
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                  </span>
                  {s.pendingConfirmation && (
                    <span className="text-sm text-amber-600">needs confirmation</span>
                  )}
                  <span className="block text-sm text-gray-400">{s.monthsPresent} months</span>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-gray-900">
                  {formatCurrency(s.monthlyAverage)}/mo
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ── 5. Commitments ────────────────────────────────────────────────── */}
      {profile.commitments.length > 0 && (
        <Card
          title="Bills and commitments"
          subtitle="EquiScore identifies recurring commitments and checks whether they are paid consistently and on time. This is one of its strongest signals."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
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
              <tbody className="divide-y divide-gray-50">
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
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="py-2.5 font-medium text-gray-800">
                      <span className="flex items-center gap-1">
                        {c.name}
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-700">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="py-2.5 tabular-nums text-gray-600">
                      {c.typicalDayOfMonth ? ordinal(c.typicalDayOfMonth) : cadenceLabel(c.cadence)}
                      {c.typicalDayOfMonth != null && (
                        <span className="ml-1 text-xs text-gray-400">±{c.dayVariance}d</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CONSISTENCY_STYLE[c.consistency])}>
                        {CONSISTENCY_LABEL[c.consistency]}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-700">
                      {c.occurrences}/{Math.max(c.monthsCovered, c.occurrences)}
                      {c.returnedCount > 0 && (
                        <span className="ml-1 text-xs text-amber-600">({c.returnedCount} returned)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">{profile.paymentBehaviour.narrative}</p>
        </Card>
      )}

      {/* ── 6. Where it goes ──────────────────────────────────────────────── */}
      <Card title="Where it goes" subtitle={expenses.narrative}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-gray-900">
            {formatCurrency(expenses.averageMonthlySpend)}
          </span>
          <span className="text-sm text-gray-400">
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
              className="grid w-full grid-cols-[11rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex items-center gap-1 truncate text-sm text-gray-600" title={c.label}>
                <span className="truncate">{c.label}</span>
                {c.unconfirmed && <span className="text-amber-500">•</span>}
              </span>
              <span className="h-2 rounded-full bg-gray-100">
                <span
                  className={cn('block h-full rounded-full', c.essential ? 'bg-brand' : 'bg-gray-300')}
                  style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }}
                />
              </span>
              <span className="flex items-center gap-1 text-sm tabular-nums text-gray-500">
                {formatCurrency(c.monthlyAverage)}
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand" /> Essential
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-300" /> Discretionary
          </span>
        </div>
      </Card>

      {/* ── 7. Context review ─────────────────────────────────────────────── */}
      <Card
        title={contextClear ? 'Context review' : 'Flagged for context'}
        subtitle="Surfaced for you to explain, not automatically counted against you"
      >
        {profile.unusual.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            No unusual patterns detected.
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-600">
              We found patterns that may need explanation. These are not treated as negative unless
              they remain unexplained.
            </p>
            <div className="space-y-3">
              {profile.unusual.map((u) => (
                <div key={u.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {u.direction === 'debit' ? 'Payment to' : 'Receipt from'} {u.counterparty}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(u.date)} · {u.reason}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
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
          <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-emerald-700">
            Checked and absent: {profile.risk.clearedTypologies.join(', ')}.
          </p>
        )}
      </Card>

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
  const color = value <= good ? 'bg-emerald-500' : value <= warn ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium tabular-nums text-gray-900">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
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
      <dt className="text-sm text-gray-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-800">{value}</dd>
    </div>
  )
}

function Chip({ children, good }: { children: React.ReactNode; good?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs',
        good ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
      )}
    >
      {children}
    </span>
  )
}
