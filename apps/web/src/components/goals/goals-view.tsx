'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Home,
  Phone,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useActionItems } from '@/lib/use-action-items'
import { buttonClasses, Card, InsetPanel, MetricCard, PageHeader, PageLayout, StatusPill } from '@/components/ui'

type InsightProfile = {
  period: { transactionCount: number; months: number }
  income: {
    averageMonthlyIncome: number
    consistency: string
    narrative?: string
  }
  affordability: {
    rating: 'comfortable' | 'manageable' | 'stretched' | 'at_risk'
    surplusAfterAll: number
    currentRent: number | null
    maxAffordableRent: number
    headroomForNewRent: number
    ratios: { rentToIncome: number | null }
  }
  paymentBehaviour: {
    onTimeRatio: number
    missedPayments: number
    returnedPayments: number
    overdraftMonths: number | null
    rentPaidConsistently: boolean
  }
  stability: {
    stableIncome: boolean
    rentNeverMissed: boolean
    billsPaidOnTime: boolean
    positiveMonthlySurplus: boolean
    noOverdraftDependency: boolean
    noRecurringFailedPayments: boolean
  }
}

type Score = {
  overallScore: number
  overallTier: string
  identityConfidenceScore: number
  verificationStrengthScore: number
  status?: string
} | null

type ReadinessKey = 'ready' | 'ready_with_conditions' | 'action_required' | 'not_enough_information'

const READINESS: Record<ReadinessKey, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; body: string }> = {
  ready: {
    label: 'Ready',
    tone: 'success',
    body: 'Your current evidence looks strong enough to prepare a rental share pack.',
  },
  ready_with_conditions: {
    label: 'Ready with conditions',
    tone: 'warning',
    body: 'You have usable evidence, but a few points may need context before you share.',
  },
  action_required: {
    label: 'Action required',
    tone: 'danger',
    body: 'There are likely friction points to address before this is ready for a rental review.',
  },
  not_enough_information: {
    label: 'Not enough information',
    tone: 'neutral',
    body: 'Connect financial evidence first so EquiScore can assess rental readiness.',
  },
}

function pct(value: number | null | undefined) {
  if (value == null) return 'n/a'
  return `${Math.round(value * 100)}%`
}

function humanConsistency(value: string) {
  return value.replaceAll('_', ' ')
}

function buildRentalReadiness(profile: InsightProfile | null | undefined, score: Score) {
  if (!profile || profile.period.transactionCount === 0) {
    return {
      key: 'not_enough_information' as const,
      strengths: [] as string[],
      friction: ['Connect a bank account or upload a statement to analyse income, rent, bills and affordability.'],
      actions: [
        {
          title: 'Connect financial evidence',
          detail: 'Open Banking gives the strongest current view for rental readiness.',
          href: '/dashboard/connections',
          cta: 'Connect account',
        },
      ],
    }
  }

  const strengths: string[] = []
  const friction: string[] = []
  const actions: Array<{ title: string; detail: string; href: string; cta: string }> = []

  if (profile.stability.stableIncome) strengths.push('Income appears stable across the available history.')
  else {
    friction.push('Income looks variable or needs clearer explanation.')
    actions.push({
      title: 'Prepare an income explanation',
      detail: 'Variable income can still be strong, but it should be explained before sharing.',
      href: '/dashboard/trust-profile/financial-profile',
      cta: 'Review income',
    })
  }

  if (profile.paymentBehaviour.rentPaidConsistently || profile.stability.rentNeverMissed) {
    strengths.push('Rent or rent-like payments appear consistent.')
  } else {
    friction.push('Direct rent reliability evidence is limited or not yet detected.')
    actions.push({
      title: 'Add rent evidence',
      detail: 'A tenancy agreement, rent statement or clear rent-payment proof can strengthen this goal.',
      href: '/dashboard/documents',
      cta: 'Upload evidence',
    })
  }

  if (profile.affordability.rating === 'comfortable' || profile.affordability.rating === 'manageable') {
    strengths.push(`Affordability appears ${profile.affordability.rating}.`)
  } else {
    friction.push(`Affordability appears ${humanConsistency(profile.affordability.rating)} on current evidence.`)
    actions.push({
      title: 'Review affordability headroom',
      detail: 'Check your current rent, essentials and monthly surplus before creating a rental pack.',
      href: '/dashboard/my-money',
      cta: 'Open My Money',
    })
  }

  if (profile.stability.billsPaidOnTime) strengths.push('Essential bills appear reliably paid.')
  else friction.push('Essential bill consistency may need more evidence.')

  if (profile.period.months >= 6) strengths.push(`${profile.period.months} months of financial history are available.`)
  else {
    friction.push('The available financial history is still short.')
    actions.push({
      title: 'Add more history where possible',
      detail: 'Longer evidence coverage helps an assessor trust the pattern.',
      href: '/dashboard/connections',
      cta: 'Add history',
    })
  }

  if ((score?.identityConfidenceScore ?? 0) >= 70) strengths.push('Identity evidence supports the profile.')
  else {
    friction.push('Identity evidence may limit confidence.')
    actions.push({
      title: 'Complete identity evidence',
      detail: 'Verified identity makes the rental pack easier for a recipient to trust.',
      href: '/dashboard/documents',
      cta: 'Verify identity',
    })
  }

  if (!profile.stability.noOverdraftDependency || (profile.paymentBehaviour.overdraftMonths ?? 0) > 0) {
    friction.push('Overdraft reliance may be viewed as a resilience risk.')
  }
  if (!profile.stability.noRecurringFailedPayments || profile.paymentBehaviour.returnedPayments > 0) {
    friction.push('Returned or failed payments may need context.')
  }

  const hardBlock =
    profile.affordability.rating === 'at_risk' ||
    profile.affordability.surplusAfterAll < 0 ||
    profile.paymentBehaviour.returnedPayments > 1

  const key: ReadinessKey = hardBlock
    ? 'action_required'
    : friction.length > 0
      ? 'ready_with_conditions'
      : 'ready'

  return { key, strengths, friction, actions: actions.slice(0, 3) }
}

const futureGoals = [
  { title: 'Open or recover banking access', icon: Banknote, status: 'Next' },
  { title: 'Set up utilities or phone contract', icon: Phone, status: 'Later' },
  { title: 'Prepare for future credit', icon: CreditCard, status: 'Later' },
]

export function GoalsView() {
  const { getToken } = useAuth()
  const { items: actionItems } = useActionItems()

  const { data: profile, isLoading, isError } = useQuery<InsightProfile | null>({
    queryKey: ['insight-profile'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => api.insights.getProfile((await getToken())!) as Promise<InsightProfile | null>,
  })

  const { data: score } = useQuery<Score>({
    queryKey: ['score', 'general'],
    queryFn: async () => api.scores.latest((await getToken())!, 'general') as Promise<Score>,
  })

  const readiness = buildRentalReadiness(profile, score ?? null)
  const status = READINESS[readiness.key]
  const hasData = (profile?.period.transactionCount ?? 0) > 0

  const fallbackActions = actionItems.slice(0, 3).map((item) => ({
    title: item.title,
    detail: item.detail,
    href: item.href,
    cta: item.cta,
  }))
  const actions = readiness.actions.length > 0 ? readiness.actions : fallbackActions

  return (
    <PageLayout>
      <PageHeader
        title="Goals"
        description="Choose what you are trying to do, see how ready your Trust Profile is, and fix the most important evidence gaps before you share."
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-card bg-surface-hover" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-card bg-surface-hover" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <Card className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-strong" />
          <div>
            <p className="font-semibold text-content">We could not load your goals</p>
            <p className="mt-1 text-sm text-content-secondary">Refresh the page, or try again after your evidence has finished processing.</p>
          </div>
        </Card>
      ) : (
        <>
          <Card padding="lg" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-content-muted">
                  <Home className="h-4 w-4" />
                  Current goal
                </div>
                <h2 className="text-2xl font-semibold text-content">Rent a home</h2>
                <p className="mt-2 max-w-2xl text-sm text-content-secondary">
                  A readiness check for rental applications, using income, affordability, payment behaviour,
                  identity confidence and evidence coverage.
                </p>
              </div>
              <StatusPill status={status.tone} label={status.label} />
            </div>

            <InsetPanel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-content">{status.label}</p>
                <p className="mt-1 max-w-2xl text-sm text-content-secondary">{status.body}</p>
              </div>
              <Link href="/dashboard/share" className={buttonClasses('primary', 'md', 'shrink-0')}>
                Preview share pack <ArrowRight className="h-4 w-4" />
              </Link>
            </InsetPanel>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Monthly income"
                value={hasData ? formatCurrency(profile?.income.averageMonthlyIncome ?? 0) : 'n/a'}
                hint={hasData ? humanConsistency(profile?.income.consistency ?? 'unknown') : 'Add evidence first'}
              />
              <MetricCard
                label="Rent to income"
                value={hasData ? pct(profile?.affordability.ratios.rentToIncome) : 'n/a'}
                hint="Current detected rent"
              />
              <MetricCard
                label="Max sustainable rent"
                value={hasData ? formatCurrency(profile?.affordability.maxAffordableRent ?? 0) : 'n/a'}
                hint="Estimated from current evidence"
              />
              <MetricCard
                label="Evidence history"
                value={hasData ? `${profile?.period.months ?? 0} mo` : 'n/a'}
                hint={score?.status ? score.status.replaceAll('_', ' ') : 'Assessment status'}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-base font-semibold text-content">What supports this goal</h3>
                {readiness.strengths.length === 0 ? (
                  <p className="rounded-panel bg-surface-inset p-4 text-sm text-content-secondary">
                    Add financial and identity evidence to surface positive readiness signals.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {readiness.strengths.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-content-secondary">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-content">Possible friction</h3>
                {readiness.friction.length === 0 ? (
                  <p className="rounded-panel bg-success-soft p-4 text-sm text-success-strong">
                    No major rental-readiness friction points detected from the current evidence.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {readiness.friction.slice(0, 5).map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-content-secondary">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-line-subtle pb-3">
                <div>
                  <h2 className="text-base font-semibold text-content">Next best actions</h2>
                  <p className="mt-1 text-sm text-content-secondary">The smallest set of actions likely to improve this goal.</p>
                </div>
              </div>
              {actions.length === 0 ? (
                <p className="text-sm text-content-secondary">Nothing urgent. Your next step is to create or preview a rental share pack.</p>
              ) : (
                <ol className="space-y-3">
                  {actions.map((action, index) => (
                    <li key={`${action.title}-${index}`} className="flex flex-col gap-3 rounded-panel border border-line-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-900">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-content">{action.title}</p>
                          <p className="mt-0.5 text-sm text-content-secondary">{action.detail}</p>
                        </div>
                      </div>
                      <Link href={action.href} className={buttonClasses('secondary', 'sm', 'shrink-0')}>
                        {action.cta}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2 border-b border-line-subtle pb-3">
                <ShieldCheck className="h-4 w-4 text-brand-900" />
                <h2 className="text-base font-semibold text-content">Share readiness</h2>
              </div>
              <p className="text-sm text-content-secondary">
                A goal-specific pack should explain what supports the goal, what is limited, and what the recipient can safely rely on.
              </p>
              <div className="mt-4 rounded-panel bg-surface-inset p-3 text-sm text-content-secondary">
                <p className="font-medium text-content">Rental pack</p>
                <p className="mt-1">
                  {readiness.key === 'ready'
                    ? 'Ready to preview.'
                    : readiness.key === 'not_enough_information'
                      ? 'Evidence required before sharing.'
                      : 'Can be shared with limitations clearly explained.'}
                </p>
              </div>
              <Link href="/dashboard/share" className={buttonClasses('primary', 'md', 'mt-4 w-full')}>
                Open Sharing
              </Link>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {futureGoals.map(({ title, icon: Icon, status: goalStatus }) => (
              <Card key={title} padding="sm" className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-surface-inset">
                  <Icon className="h-5 w-5 text-brand-900" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-content">{title}</p>
                    <StatusPill status="neutral" label={goalStatus} />
                  </div>
                  <p className="mt-1 text-sm text-content-muted">This goal will reuse the same Trust Profile evidence in a different context.</p>
                </div>
              </Card>
            ))}
          </div>

          <InsetPanel className="flex items-start gap-3">
            <UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-brand-900" />
            <p className="text-sm text-content-secondary">
              Evidence uploaded through To do or supporting-information flows should appear contextually in Assessment,
              Financial Profile, Goals and Sharing, rather than living as a separate top-level destination.
            </p>
          </InsetPanel>
        </>
      )}
    </PageLayout>
  )
}
