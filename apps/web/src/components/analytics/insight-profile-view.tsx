'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/info-tooltip'

// Mirrors the InsightProfile shape returned by GET /insights/profile.
type Rating = 'strong' | 'moderate' | 'medium' | 'limited'
type Consistency = 'very_consistent' | 'consistent' | 'variable' | 'one_off'
type Source = 'open_banking' | 'statement_upload' | 'test'

interface InsightProfile {
  period: { from: string; to: string; months: number; transactionCount: number }
  income: {
    averageMonthlyIncome: number
    consistency: Consistency
    recurringSalaryDetected: boolean
    primaryCharacter: string
    characterTags: string[]
    sources: Array<{ name: string; category: string; monthlyAverage: number; monthsPresent: number; pendingConfirmation: boolean }>
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
  summary: string
  source: Source
}

type ScoreStatus =
  | 'current'
  | 'expiring_soon'
  | 'expired'
  | 'evidence_withdrawn'
  | 'insufficient_evidence'

interface Freshness {
  computedAt: string
  status?: ScoreStatus
  isCurrent?: boolean
  financialDataAsOf?: string | null
  validUntil?: string | null
}

const RATING_BAR: Record<Rating, string> = {
  strong: 'bg-emerald-500',
  moderate: 'bg-teal-500',
  medium: 'bg-amber-400',
  limited: 'bg-amber-500',
}
const RATING_STYLES: Record<Rating, string> = {
  strong: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-teal-50 text-teal-700',
  medium: 'bg-amber-50 text-amber-700',
  limited: 'bg-amber-100 text-amber-800',
}
const RATING_LABEL: Record<Rating, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  medium: 'Medium',
  limited: 'Limited',
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

// Plain-English "how this was calculated" copy for each key indicator.
const INDICATOR_HELP: Record<string, string> = {
  incomeStability:
    'How steady your income is: whether a regular salary or income stream is detected, and how much it varies month to month.',
  essentialPaymentConsistency:
    'Whether essential bills and rent are actually paid, on time, without returned or missed payments.',
  affordability:
    'How much is left after essential costs, and how rent compares to income.',
  transactionClarity:
    'The share of transactions we can confidently classify. Answering follow-up questions raises this.',
  evidenceConfidence:
    'How strong the underlying evidence is. Open Banking scores highest; a reconciling uploaded statement comes next.',
  riskFlags:
    'Whether any transactions match patterns that usually need explaining. "Clear" means none were found.',
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
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {help && <InfoTooltip label={`How ${title} is calculated`}>{help}</InfoTooltip>}
      </div>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function InsightProfileView() {
  const { getToken } = useAuth()
  const { data: profile, isLoading } = useQuery<InsightProfile | null>({
    queryKey: ['insight-profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.insights.getProfile(token!) as Promise<InsightProfile | null>
    },
    staleTime: 5 * 60 * 1000,
  })

  // Freshness lives on the scoring record, not the profile. Same cache key the
  // rest of the app uses for the score, so an import refreshes it automatically.
  const { data: freshness } = useQuery<Freshness | null>({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!) as Promise<Freshness | null>
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
  const evidence = EVIDENCE_BY_SOURCE[profile.source] ?? EVIDENCE_BY_SOURCE.statement_upload
  const status = freshness?.status
  const badge = status ? STATUS_BADGE[status] : null

  const contextClear = profile.risk.level === 'low' && profile.unusual.length === 0
  const strengths = Object.entries(STABILITY_LABEL).filter(([key]) => profile.stability[key] === true)

  return (
    <div className="space-y-6">
      {/* ── 1. EquiScore profile: the judgement, up top ───────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
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

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-4xl font-bold tabular-nums text-gray-900">
            {profile.overall.score}
            <span className="text-2xl font-medium text-gray-300"> / 100</span>
          </span>
          <span className="rounded-lg bg-brand/10 px-2.5 py-1 text-sm font-semibold text-brand">
            Tier {profile.overall.tier}
          </span>
        </div>
        <p className="mt-1.5 text-base font-semibold text-gray-900">{profile.overall.label}</p>
        <p className="text-sm text-gray-500">{evidence.verified}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          Based on {profile.period.months}{' '}
          {profile.period.months === 1 ? 'month' : 'months'} of evidence ·{' '}
          {profile.period.transactionCount.toLocaleString()} transactions
        </p>

        {/* Plain-English summary */}
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-700">{profile.summary}</p>

        {/* Evidence + freshness */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-gray-100 pt-4 text-sm sm:grid-cols-4">
          <Field label="Evidence type" value={evidence.type} />
          <Field
            label="Financial data as of"
            value={freshness?.financialDataAsOf ? formatDate(freshness.financialDataAsOf) : formatDate(profile.period.to)}
          />
          <Field
            label="Score calculated"
            value={freshness?.computedAt ? formatDate(freshness.computedAt) : '—'}
          />
          <Field
            label="Valid until"
            value={freshness?.validUntil ? formatDate(freshness.validUntil) : '—'}
          />
        </dl>

        {/* Key indicators */}
        <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {profile.subScores.map((s) => {
            const isContext = s.key === 'riskFlags'
            const valueLabel = isContext
              ? contextClear
                ? 'Clear'
                : `${profile.unusual.length} to explain`
              : RATING_LABEL[s.rating]
            const valueStyle = isContext
              ? contextClear
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
              : RATING_STYLES[s.rating]
            const barStyle = isContext
              ? contextClear
                ? 'bg-emerald-500'
                : 'bg-amber-500'
              : RATING_BAR[s.rating]
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-gray-700">
                    {s.label}
                    {INDICATOR_HELP[s.key] && (
                      <InfoTooltip label={`How ${s.label} is calculated`}>
                        {INDICATOR_HELP[s.key]}
                      </InfoTooltip>
                    )}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', valueStyle)}>
                    {valueLabel}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={cn('h-full rounded-full', barStyle)} style={{ width: `${s.score}%` }} />
                </div>
              </div>
            )
          })}
        </div>
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

      {/* ── 3. Follow-up questions ────────────────────────────────────────── */}
      {profile.questions.length > 0 && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900">
              Help us understand {profile.questions.length}{' '}
              {profile.questions.length === 1 ? 'thing' : 'things'}
            </h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
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
                    <p className="mt-1 text-xs text-gray-500">{q.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <span key={o} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                          {o}
                        </span>
                      ))}
                    </div>
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
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {income.sources.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800">{s.name}</span>
                  {s.pendingConfirmation && (
                    <span className="ml-2 text-xs text-amber-600">needs confirmation</span>
                  )}
                  <span className="block text-xs text-gray-400">{s.monthsPresent} months</span>
                </div>
                <span className="font-medium tabular-nums text-gray-900">
                  {formatCurrency(s.monthlyAverage)}/mo
                </span>
              </div>
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
                  <tr key={c.name}>
                    <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
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
        <div className="mt-4 space-y-2.5">
          {expenses.categories.slice(0, 8).map((c) => (
            <div key={c.key} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3">
              <span className="truncate text-xs text-gray-600" title={c.label}>
                {c.label}
                {c.unconfirmed && <span className="ml-1 text-amber-500">•</span>}
              </span>
              <span className="h-2 rounded-full bg-gray-100">
                <span
                  className={cn('block h-full rounded-full', c.essential ? 'bg-brand' : 'bg-gray-300')}
                  style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }}
                />
              </span>
              <span className="text-xs tabular-nums text-gray-500">
                {formatCurrency(c.monthlyAverage)}
              </span>
            </div>
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
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
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
