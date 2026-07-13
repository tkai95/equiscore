'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Home,
  Phone,
  Save,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'
import {
  api,
  type ConsumerGoal,
  type ConsumerGoalApplicationMode,
  type UpdateConsumerGoalInput,
} from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useActionItems } from '@/lib/use-action-items'
import {
  Button,
  buttonClasses,
  Card,
  InsetPanel,
  MetricCard,
  PageHeader,
  PageLayout,
  StatusPill,
} from '@/components/ui'

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

type GoalForm = {
  targetMonthlyRent: string
  moveDate: string
  applicationMode: ConsumerGoalApplicationMode
  depositAvailable: string
  notes: string
}

type ReadinessKey = 'ready' | 'ready_with_conditions' | 'action_required' | 'not_enough_information'

const READINESS: Record<
  ReadinessKey,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; body: string }
> = {
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

const EMPTY_GOAL_FORM: GoalForm = {
  targetMonthlyRent: '',
  moveDate: '',
  applicationMode: 'unknown',
  depositAvailable: '',
  notes: '',
}

const futureGoals = [
  { title: 'Open or recover banking access', icon: Banknote, status: 'Next' },
  { title: 'Set up utilities or phone contract', icon: Phone, status: 'Later' },
  { title: 'Prepare for future credit', icon: CreditCard, status: 'Later' },
]

function pct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return `${Math.round(value * 100)}%`
}

function humanConsistency(value: string) {
  return value.replaceAll('_', ' ')
}

function toInputDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : ''
}

function toMoneyInput(value: number | null | undefined) {
  return value == null ? '' : String(value)
}

function parseMoneyInput(value: string): number | null {
  const clean = value.replaceAll(',', '').trim()
  if (!clean) return null
  const parsed = Number(clean)
  return Number.isFinite(parsed) ? parsed : null
}

function inputDateToIso(value: string) {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function goalToForm(goal: ConsumerGoal | null | undefined): GoalForm {
  if (!goal) return EMPTY_GOAL_FORM
  return {
    targetMonthlyRent: toMoneyInput(goal.targetMonthlyRent),
    moveDate: toInputDate(goal.moveDate),
    applicationMode: goal.applicationMode ?? 'unknown',
    depositAvailable: toMoneyInput(goal.depositAvailable),
    notes: goal.notes ?? '',
  }
}

function formatSavedDate(value: string | null | undefined) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function buildRentalReadiness(
  profile: InsightProfile | null | undefined,
  score: Score,
  goal: ConsumerGoal | null | undefined
) {
  if (!profile || profile.period.transactionCount === 0) {
    return {
      key: 'not_enough_information' as const,
      strengths: [] as string[],
      friction: [
        'Connect a bank account or upload a statement to analyse income, rent, bills and affordability.',
      ],
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
  const targetRent = goal?.targetMonthlyRent ?? null
  const monthlyIncome = profile.income.averageMonthlyIncome
  const targetRentToIncome = targetRent && monthlyIncome > 0 ? targetRent / monthlyIncome : null
  const targetOverLimit =
    targetRent != null &&
    targetRent > 0 &&
    profile.affordability.maxAffordableRent > 0 &&
    targetRent > profile.affordability.maxAffordableRent

  if (targetRent && targetRent > 0 && targetRentToIncome != null) {
    if (!targetOverLimit && targetRentToIncome <= 0.35) {
      strengths.push(`Your saved target rent is within the estimated sustainable range.`)
    } else {
      friction.push(`Your saved target rent may be high for the current verified income pattern.`)
      actions.push({
        title: 'Review the target rent',
        detail:
          'Adjust your target or add evidence that explains extra support, savings or joint affordability.',
        href: '#goal-settings',
        cta: 'Update goal',
      })
    }
  } else {
    friction.push(
      'No target rent is saved yet, so readiness is using current rent and historic patterns.'
    )
    actions.push({
      title: 'Save your rental target',
      detail:
        'Add the rent and move timing you are working towards so the readiness check becomes specific.',
      href: '#goal-settings',
      cta: 'Set target',
    })
  }

  if (profile.stability.stableIncome)
    strengths.push('Income appears stable across the available history.')
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
      detail:
        'A tenancy agreement, rent statement or clear rent-payment proof can strengthen this goal.',
      href: '/dashboard/documents',
      cta: 'Upload evidence',
    })
  }

  if (
    profile.affordability.rating === 'comfortable' ||
    profile.affordability.rating === 'manageable'
  ) {
    strengths.push(`Affordability appears ${profile.affordability.rating}.`)
  } else {
    friction.push(
      `Affordability appears ${humanConsistency(profile.affordability.rating)} on current evidence.`
    )
    actions.push({
      title: 'Review affordability headroom',
      detail:
        'Check your current rent, essentials and monthly surplus before creating a rental pack.',
      href: '/dashboard/my-money',
      cta: 'Open My Money',
    })
  }

  if (profile.stability.billsPaidOnTime) strengths.push('Essential bills appear reliably paid.')
  else friction.push('Essential bill consistency may need more evidence.')

  if (profile.period.months >= 6)
    strengths.push(`${profile.period.months} months of financial history are available.`)
  else {
    friction.push('The available financial history is still short.')
    actions.push({
      title: 'Add more history where possible',
      detail: 'Longer evidence coverage helps an assessor trust the pattern.',
      href: '/dashboard/connections',
      cta: 'Add history',
    })
  }

  if ((score?.identityConfidenceScore ?? 0) >= 70)
    strengths.push('Identity evidence supports the profile.')
  else {
    friction.push('Identity evidence may limit confidence.')
    actions.push({
      title: 'Complete identity evidence',
      detail: 'Verified identity makes the rental pack easier for a recipient to trust.',
      href: '/dashboard/documents',
      cta: 'Verify identity',
    })
  }

  if (
    !profile.stability.noOverdraftDependency ||
    (profile.paymentBehaviour.overdraftMonths ?? 0) > 0
  ) {
    friction.push('Overdraft reliance may be viewed as a resilience risk.')
  }
  if (
    !profile.stability.noRecurringFailedPayments ||
    profile.paymentBehaviour.returnedPayments > 0
  ) {
    friction.push('Returned or failed payments may need context.')
  }

  const hardBlock =
    targetOverLimit ||
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

export function GoalsView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { items: actionItems } = useActionItems()
  const [form, setForm] = useState<GoalForm>(EMPTY_GOAL_FORM)
  const [isDirty, setIsDirty] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<InsightProfile | null>({
    queryKey: ['insight-profile'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      api.insights.getProfile((await getToken())!) as Promise<InsightProfile | null>,
  })

  const { data: score } = useQuery<Score>({
    queryKey: ['score', 'general'],
    queryFn: async () => api.scores.latest((await getToken())!, 'general') as Promise<Score>,
  })

  const {
    data: goal,
    isLoading: isGoalLoading,
    isError: isGoalError,
  } = useQuery<ConsumerGoal>({
    queryKey: ['consumer-goal', 'primary'],
    queryFn: async () => api.goals.getPrimary((await getToken())!),
  })

  useEffect(() => {
    if (!isDirty) setForm(goalToForm(goal))
  }, [goal, isDirty])

  const saveGoal = useMutation({
    mutationFn: async (data: UpdateConsumerGoalInput) =>
      api.goals.updatePrimary((await getToken())!, data),
    onSuccess: (saved) => {
      queryClient.setQueryData(['consumer-goal', 'primary'], saved)
      setIsDirty(false)
      setFormError(null)
      setSaveMessage('Saved')
    },
    onError: (error) => {
      setSaveMessage(null)
      setFormError(error instanceof Error ? error.message : 'We could not save this goal.')
    },
  })

  const updateForm = <K extends keyof GoalForm>(key: K, value: GoalForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setIsDirty(true)
    setFormError(null)
    setSaveMessage(null)
  }

  const handleSave = () => {
    const targetMonthlyRent = parseMoneyInput(form.targetMonthlyRent)
    const depositAvailable = parseMoneyInput(form.depositAvailable)
    saveGoal.mutate({
      type: 'rental',
      label: 'Rent a home',
      targetMonthlyRent,
      moveDate: inputDateToIso(form.moveDate),
      applicationMode: form.applicationMode,
      depositAvailable,
      notes: form.notes.trim() || null,
    })
  }

  const readiness = buildRentalReadiness(profile, score ?? null, goal ?? null)
  const status = READINESS[readiness.key]
  const hasData = (profile?.period.transactionCount ?? 0) > 0
  const targetRent = goal?.targetMonthlyRent ?? null
  const monthlyIncome = profile?.income.averageMonthlyIncome ?? 0
  const targetRentToIncome = targetRent && monthlyIncome > 0 ? targetRent / monthlyIncome : null
  const savedDate = formatSavedDate(goal?.updatedAt)

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
          <div className="rounded-card bg-surface-hover h-56 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-card bg-surface-hover h-28 animate-pulse" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <Card className="flex items-start gap-3">
          <AlertTriangle className="text-warning-strong mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-content font-semibold">We could not load your goals</p>
            <p className="text-content-secondary mt-1 text-sm">
              Refresh the page, or try again after your evidence has finished processing.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card padding="lg" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-content-muted mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <Home className="h-4 w-4" />
                  Current goal
                </div>
                <h2 className="text-content text-2xl font-semibold">Rent a home</h2>
                <p className="text-content-secondary mt-2 max-w-2xl text-sm">
                  A readiness check for rental applications, using income, affordability, payment
                  behaviour, identity confidence and evidence coverage.
                </p>
              </div>
              <StatusPill status={status.tone} label={status.label} />
            </div>

            <InsetPanel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-content text-lg font-semibold">{status.label}</p>
                <p className="text-content-secondary mt-1 max-w-2xl text-sm">{status.body}</p>
              </div>
              <Link href="/dashboard/share" className={buttonClasses('primary', 'md', 'shrink-0')}>
                Preview share pack <ArrowRight className="h-4 w-4" />
              </Link>
            </InsetPanel>

            <InsetPanel id="goal-settings" className="space-y-4" padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-content text-base font-semibold">Rental target</h3>
                  <p className="text-content-secondary mt-1 text-sm">
                    Save the rent and move timing you are working towards so the readiness check
                    becomes specific to the application.
                  </p>
                </div>
                <div className="text-content-muted text-right text-xs">
                  {isGoalLoading
                    ? 'Loading saved goal'
                    : savedDate
                      ? `Last saved ${savedDate}`
                      : 'Not saved yet'}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <label className="text-content block text-sm font-medium">
                  Target monthly rent
                  <div className="border-line bg-surface-card mt-1 flex h-10 items-center rounded-lg border px-3">
                    <span className="text-content-muted mr-2">£</span>
                    <input
                      value={form.targetMonthlyRent}
                      onChange={(event) => updateForm('targetMonthlyRent', event.target.value)}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      className="placeholder:text-content-muted h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                      placeholder="1,800"
                    />
                  </div>
                </label>

                <label className="text-content block text-sm font-medium">
                  Move date
                  <input
                    value={form.moveDate}
                    onChange={(event) => updateForm('moveDate', event.target.value)}
                    type="date"
                    className="border-line bg-surface-card mt-1 h-10 w-full rounded-lg border px-3 text-sm outline-none"
                  />
                </label>

                <label className="text-content block text-sm font-medium">
                  Application type
                  <select
                    value={form.applicationMode}
                    onChange={(event) =>
                      updateForm(
                        'applicationMode',
                        event.target.value as ConsumerGoalApplicationMode
                      )
                    }
                    className="border-line bg-surface-card mt-1 h-10 w-full rounded-lg border px-3 text-sm outline-none"
                  >
                    <option value="unknown">Not sure yet</option>
                    <option value="alone">Applying alone</option>
                    <option value="joint">Joint application</option>
                  </select>
                </label>

                <label className="text-content block text-sm font-medium">
                  Deposit available
                  <div className="border-line bg-surface-card mt-1 flex h-10 items-center rounded-lg border px-3">
                    <span className="text-content-muted mr-2">£</span>
                    <input
                      value={form.depositAvailable}
                      onChange={(event) => updateForm('depositAvailable', event.target.value)}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      className="placeholder:text-content-muted h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                      placeholder="2,500"
                    />
                  </div>
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="text-content block text-sm font-medium">
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm('notes', event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="border-line bg-surface-card placeholder:text-content-muted mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    placeholder="Add context, for example guarantor, joint applicant, savings, or timing."
                  />
                </label>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || isGoalLoading}
                    loading={saveGoal.isPending}
                  >
                    <Save className="h-4 w-4" />
                    Save goal
                  </Button>
                  {saveMessage && (
                    <p className="text-success-strong text-xs font-medium">{saveMessage}</p>
                  )}
                  {(formError || isGoalError) && (
                    <p className="text-danger-strong text-xs font-medium">
                      {formError ?? 'We could not load your saved goal.'}
                    </p>
                  )}
                </div>
              </div>
            </InsetPanel>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Monthly income"
                value={hasData ? formatCurrency(monthlyIncome) : 'n/a'}
                hint={
                  hasData
                    ? humanConsistency(profile?.income.consistency ?? 'unknown')
                    : 'Add evidence first'
                }
              />
              <MetricCard
                label="Target rent"
                value={targetRent ? formatCurrency(targetRent) : 'Not set'}
                hint={
                  profile?.affordability.currentRent
                    ? `Current detected rent ${formatCurrency(profile.affordability.currentRent)}`
                    : 'Saved goal'
                }
              />
              <MetricCard
                label="Target rent to income"
                value={targetRentToIncome != null ? pct(targetRentToIncome) : 'n/a'}
                hint="Based on saved target"
              />
              <MetricCard
                label="Max sustainable rent"
                value={
                  hasData ? formatCurrency(profile?.affordability.maxAffordableRent ?? 0) : 'n/a'
                }
                hint="Estimated from current evidence"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-content mb-3 text-base font-semibold">
                  What supports this goal
                </h3>
                {readiness.strengths.length === 0 ? (
                  <p className="rounded-panel bg-surface-inset text-content-secondary p-4 text-sm">
                    Add financial and identity evidence to surface positive readiness signals.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {readiness.strengths.map((item) => (
                      <li
                        key={item}
                        className="text-content-secondary flex items-start gap-2.5 text-sm"
                      >
                        <CheckCircle2 className="text-success-strong mt-0.5 h-4 w-4 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-content mb-3 text-base font-semibold">Possible friction</h3>
                {readiness.friction.length === 0 ? (
                  <p className="rounded-panel bg-success-soft text-success-strong p-4 text-sm">
                    No major rental-readiness friction points detected from the current evidence.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {readiness.friction.slice(0, 5).map((item) => (
                      <li
                        key={item}
                        className="text-content-secondary flex items-start gap-2.5 text-sm"
                      >
                        <AlertTriangle className="text-warning-strong mt-0.5 h-4 w-4 shrink-0" />
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
              <div className="border-line-subtle mb-4 flex items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h2 className="text-content text-base font-semibold">Next best actions</h2>
                  <p className="text-content-secondary mt-1 text-sm">
                    The smallest set of actions likely to improve this goal.
                  </p>
                </div>
              </div>
              {actions.length === 0 ? (
                <p className="text-content-secondary text-sm">
                  Nothing urgent. Your next step is to create or preview a rental share pack.
                </p>
              ) : (
                <ol className="space-y-3">
                  {actions.map((action, index) => (
                    <li
                      key={`${action.title}-${index}`}
                      className="rounded-panel border-line-subtle flex flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex gap-3">
                        <span className="bg-brand-50 text-brand-900 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-content text-sm font-semibold">{action.title}</p>
                          <p className="text-content-secondary mt-0.5 text-sm">{action.detail}</p>
                        </div>
                      </div>
                      <Link
                        href={action.href}
                        className={buttonClasses('secondary', 'sm', 'shrink-0')}
                      >
                        {action.cta}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <div className="border-line-subtle mb-4 flex items-center gap-2 border-b pb-3">
                <ShieldCheck className="text-brand-900 h-4 w-4" />
                <h2 className="text-content text-base font-semibold">Share readiness</h2>
              </div>
              <p className="text-content-secondary text-sm">
                A goal-specific pack should explain what supports the goal, what is limited, and
                what the recipient can safely rely on.
              </p>
              <div className="rounded-panel bg-surface-inset text-content-secondary mt-4 p-3 text-sm">
                <p className="text-content font-medium">Rental pack</p>
                <p className="mt-1">
                  {readiness.key === 'ready'
                    ? 'Ready to preview.'
                    : readiness.key === 'not_enough_information'
                      ? 'Evidence required before sharing.'
                      : 'Can be shared with limitations clearly explained.'}
                </p>
              </div>
              <Link
                href="/dashboard/share"
                className={buttonClasses('primary', 'md', 'mt-4 w-full')}
              >
                Open Sharing
              </Link>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {futureGoals.map(({ title, icon: Icon, status: goalStatus }) => (
              <Card key={title} padding="sm" className="flex items-start gap-3">
                <div className="rounded-panel bg-surface-inset flex h-10 w-10 shrink-0 items-center justify-center">
                  <Icon className="text-brand-900 h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-content text-sm font-semibold">{title}</p>
                    <StatusPill status="neutral" label={goalStatus} />
                  </div>
                  <p className="text-content-muted mt-1 text-sm">
                    This goal will reuse the same Trust Profile evidence in a different context.
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <InsetPanel className="flex items-start gap-3">
            <UploadCloud className="text-brand-900 mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-content-secondary text-sm">
              Evidence uploaded through To do or supporting-information flows should appear
              contextually in Assessment, Financial Profile, Goals and Sharing, rather than living
              as a separate top-level destination.
            </p>
          </InsetPanel>
        </>
      )}
    </PageLayout>
  )
}
