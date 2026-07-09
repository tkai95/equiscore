'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

// Mirrors the InsightProfile shape returned by GET /insights/profile.
type Rating = 'strong' | 'moderate' | 'medium' | 'limited'
type Consistency = 'very_consistent' | 'consistent' | 'variable' | 'one_off'

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
}

const RATING_STYLES: Record<Rating, string> = {
  strong: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-teal-50 text-teal-700',
  medium: 'bg-gray-100 text-gray-600',
  limited: 'bg-amber-50 text-amber-700',
}
const RATING_BAR: Record<Rating, string> = {
  strong: 'bg-emerald-500',
  moderate: 'bg-teal-500',
  medium: 'bg-gray-400',
  limited: 'bg-amber-500',
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
  stableIncome: 'Stable income',
  rentNeverMissed: 'Rent never missed',
  billsPaidOnTime: 'Bills paid on time',
  positiveMonthlySurplus: 'Positive monthly surplus',
  noOverdraftDependency: 'No overdraft dependency',
  noRecurringFailedPayments: 'No recurring failed payments',
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

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
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

  return (
    <div className="space-y-6">
      {/* Verdict + sub-scores */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Your insight profile</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{profile.overall.tier}</span>
              <span className="text-lg text-gray-400">/ {profile.overall.score}</span>
            </div>
            <p className="mt-0.5 text-sm text-gray-600">{profile.overall.label}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>
              {formatDate(profile.period.from)} – {formatDate(profile.period.to)}
            </p>
            <p className="mt-0.5">
              {profile.period.months} months · {profile.period.transactionCount} transactions
            </p>
            <p className="mt-0.5">Transaction clarity {Math.round(profile.transactionClarity * 100)}%</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {profile.subScores.map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{s.label}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', RATING_STYLES[s.rating])}>
                  {RATING_LABEL[s.rating]}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={cn('h-full rounded-full', RATING_BAR[s.rating])} style={{ width: `${s.score}%` }} />
              </div>
            </div>
          ))}
        </div>

        {profile.overall.limitingFactors.length > 0 && (
          <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100">
            <span className="font-semibold">What&apos;s holding it back: </span>
            {profile.overall.limitingFactors.join(' · ')}
          </div>
        )}
      </div>

      {/* Follow-up questions */}
      {profile.questions.length > 0 && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900">Help us understand {profile.questions.length} things</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            These aren&apos;t problems — answering them raises your transaction clarity and can lift your score.
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

      {/* Income + Expenses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Income" subtitle={income.narrative}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">{formatCurrency(income.averageMonthlyIncome)}</span>
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

        <Card title="Where it goes" subtitle={expenses.narrative}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">{formatCurrency(expenses.averageMonthlySpend)}</span>
            <span className="text-sm text-gray-400">/ month · {Math.round(expenses.essentialShare * 100)}% essential</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {expenses.categories.slice(0, 7).map((c) => (
              <div key={c.key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
                <span className="truncate text-xs text-gray-600">
                  {c.label}
                  {c.unconfirmed && <span className="ml-1 text-amber-500">•</span>}
                </span>
                <span className="h-2 rounded-full bg-gray-100">
                  <span
                    className={cn('block h-full rounded-full', c.essential ? 'bg-brand' : 'bg-gray-300')}
                    style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }}
                  />
                </span>
                <span className="text-xs tabular-nums text-gray-500">{formatCurrency(c.monthlyAverage)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Commitments */}
      {profile.commitments.length > 0 && (
        <Card title="Bills & commitments" subtitle="What you pay, and whether it's on time — EquiScore's strongest signal">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-medium">Commitment</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 font-medium">Typical day</th>
                  <th className="pb-2 font-medium">Consistency</th>
                  <th className="pb-2 text-right font-medium">On time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profile.commitments.map((c) => (
                  <tr key={c.name}>
                    <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                    <td className="py-2.5 text-right tabular-nums text-gray-700">{formatCurrency(c.amount)}</td>
                    <td className="py-2.5 tabular-nums text-gray-600">
                      {c.typicalDayOfMonth ? ordinal(c.typicalDayOfMonth) : cadenceLabel(c.cadence)}
                      {c.typicalDayOfMonth && (
                        <span className="ml-1 text-xs text-gray-400">±{c.dayVariance}d</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CONSISTENCY_STYLE[c.consistency])}>
                        {CONSISTENCY_LABEL[c.consistency]}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-700">
                      {c.occurrences}/{c.occurrences + c.missedCount}
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

      {/* Stability + Unusual */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Stability" subtitle="What a credit check would miss">
          <div className="space-y-2">
            {Object.entries(STABILITY_LABEL).map(([key, label]) => {
              const ok = profile.stability[key] === true
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-gray-300" />
                  )}
                  <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card
          title="Flagged for context"
          subtitle="Surfaced for you to explain — never counted against you unexplained"
        >
          {profile.unusual.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              No unusual patterns detected.
            </div>
          ) : (
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
                        <p className="text-xs text-gray-500">{u.reason}</p>
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
                    {u.context.normalBeforeAfter && <Chip good>Normal before &amp; after</Chip>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {profile.risk.clearedTypologies.length > 0 && (
            <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-emerald-700">
              ✓ Checked and absent: {profile.risk.clearedTypologies.join(', ')}.
            </p>
          )}
        </Card>
      </div>
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
