'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  CreditCard,
  Home,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import {
  api,
  type ConsumerGoal,
  type ConsumerGoalApplicationMode,
  type ConsumerGoalType,
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
    fixedCommitments?: number
    ratios: {
      rentToIncome: number | null
      debtToIncome?: number
      commitmentsToIncome?: number
      essentialsToIncome?: number
    }
  }
  expenses?: {
    averageMonthlySpend: number
    categories: Array<{
      key: string
      label: string
      monthlyAverage: number
      share: number
      essential: boolean
      unconfirmed: boolean
    }>
  }
  commitments?: Array<{
    name: string
    key: string
    category: string
    amount: number
    cadence: string
    typicalDayOfMonth: number | null
    consistency: string
    occurrences: number
    monthsCovered: number
    missedCount: number
    returnedCount: number
  }>
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

type GoalTemplate = {
  type: ConsumerGoalType
  title: string
  shortTitle: string
  description: string
  evidenceFocus: string
  icon: LucideIcon
}

type GoalAction = { title: string; detail: string; href: string; cta: string }
type GoalPlanAction = GoalAction & {
  kind: 'evidence' | 'money' | 'readiness' | 'share' | 'strategy'
  value?: string
  impact: string
  disclosure?: string
}
type ReadinessKey = 'ready' | 'ready_with_conditions' | 'action_required' | 'not_enough_information'
type GoalReadiness = {
  key: ReadinessKey
  summary: string
  strengths: string[]
  friction: string[]
  actions: GoalAction[]
}

const READINESS: Record<
  ReadinessKey,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  ready: { label: 'Ready', tone: 'success' },
  ready_with_conditions: { label: 'Ready with conditions', tone: 'warning' },
  action_required: { label: 'Action required', tone: 'danger' },
  not_enough_information: { label: 'Needs evidence', tone: 'neutral' },
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    type: 'rental',
    title: 'Rent a home',
    shortTitle: 'Rental readiness',
    description: 'Prepare a landlord or letting-agent ready profile.',
    evidenceFocus: 'Affordability, rent reliability, income, identity',
    icon: Home,
  },
  {
    type: 'banking_access',
    title: 'Open or recover banking access',
    shortTitle: 'Banking access',
    description: 'Build a clearer profile for basic account access or review.',
    evidenceFocus: 'Identity, account history, payment stability, explanations',
    icon: Banknote,
  },
  {
    type: 'utilities_phone',
    title: 'Set up utilities or a phone contract',
    shortTitle: 'Utilities & phone',
    description: 'Show stable income and reliable everyday payment behaviour.',
    evidenceFocus: 'Bill consistency, failed payments, surplus, address evidence',
    icon: Phone,
  },
  {
    type: 'future_credit',
    title: 'Prepare for future credit',
    shortTitle: 'Future credit',
    description: 'Understand what would strengthen a future responsible-credit application.',
    evidenceFocus: 'Surplus, overdraft reliance, payment behaviour, trend',
    icon: CreditCard,
  },
  {
    type: 'income_proof',
    title: 'Prove income clearly',
    shortTitle: 'Income proof',
    description: 'Turn salary, gig, benefits or self-employed income into a clear evidence story.',
    evidenceFocus: 'Income sources, consistency, volatility, supporting documents',
    icon: BriefcaseBusiness,
  },
  {
    type: 'stronger_profile',
    title: 'Strengthen my Trust Profile',
    shortTitle: 'Profile strength',
    description: 'Improve the underlying evidence quality across your whole EquiScore profile.',
    evidenceFocus: 'Identity, data coverage, documents, confidence, gaps',
    icon: ShieldCheck,
  },
]

const EMPTY_GOAL_FORM: GoalForm = {
  targetMonthlyRent: '',
  moveDate: '',
  applicationMode: 'unknown',
  depositAvailable: '',
  notes: '',
}

function pct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return `${Math.round(value * 100)}%`
}

function humanConsistency(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ') : 'unknown'
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

function completeReadiness(
  summary: string,
  strengths: string[],
  friction: string[],
  actions: GoalAction[],
  hardBlock = false
): GoalReadiness {
  return {
    key: hardBlock ? 'action_required' : friction.length > 0 ? 'ready_with_conditions' : 'ready',
    summary,
    strengths,
    friction,
    actions: actions.slice(0, 3),
  }
}

function noEvidenceReadiness(template: GoalTemplate): GoalReadiness {
  return {
    key: 'not_enough_information',
    summary: `Connect financial evidence so EquiScore can assess ${template.shortTitle.toLowerCase()} against real behaviour.`,
    strengths: [],
    friction: ['No connected financial evidence is available yet.'],
    actions: [
      {
        title: 'Connect financial evidence',
        detail:
          'Open Banking gives the strongest current view for income, spending and payment behaviour.',
        href: '/dashboard/connections',
        cta: 'Connect account',
      },
    ],
  }
}

function buildRentalReadiness(
  profile: InsightProfile,
  score: Score,
  goal: ConsumerGoal | null | undefined
): GoalReadiness {
  const strengths: string[] = []
  const friction: string[] = []
  const actions: GoalAction[] = []
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
      strengths.push('Saved target rent is within the estimated sustainable range.')
    } else {
      friction.push('Saved target rent may be high for the current verified income pattern.')
      actions.push({
        title: 'Review the target rent',
        detail:
          'Adjust the target or add evidence that explains savings, support or joint affordability.',
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
      detail: 'Add rent and move timing so the readiness check becomes specific.',
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
      detail: 'A tenancy agreement, rent statement or rent-payment proof can strengthen this goal.',
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
  }

  if ((score?.identityConfidenceScore ?? 0) >= 70)
    strengths.push('Identity evidence supports the profile.')
  else friction.push('Identity evidence may limit confidence.')

  const hardBlock =
    targetOverLimit ||
    profile.affordability.rating === 'at_risk' ||
    profile.affordability.surplusAfterAll < 0 ||
    profile.paymentBehaviour.returnedPayments > 1

  return completeReadiness(
    'A practical rental view of affordability, rent reliability and confidence.',
    strengths,
    friction,
    actions,
    hardBlock
  )
}

function buildGoalReadiness(
  template: GoalTemplate,
  profile: InsightProfile | null | undefined,
  score: Score,
  goal: ConsumerGoal | null | undefined
): GoalReadiness {
  if (!profile || profile.period.transactionCount === 0) return noEvidenceReadiness(template)
  if (template.type === 'rental') return buildRentalReadiness(profile, score, goal)

  const strengths: string[] = []
  const friction: string[] = []
  const actions: GoalAction[] = []
  const returnedPayments = profile.paymentBehaviour.returnedPayments
  const overdraftMonths = profile.paymentBehaviour.overdraftMonths ?? 0
  const identityScore = score?.identityConfidenceScore ?? 0
  const verificationScore = score?.verificationStrengthScore ?? 0
  const hasLongHistory = profile.period.months >= 6

  if (template.type === 'banking_access') {
    if (identityScore >= 70)
      strengths.push('Identity evidence is strong enough to support access conversations.')
    else {
      friction.push('Identity evidence needs strengthening before this goal is compelling.')
      actions.push({
        title: 'Complete identity evidence',
        detail: 'Clear identity evidence is the first signal for banking-access goals.',
        href: '/dashboard/documents',
        cta: 'Verify identity',
      })
    }
    if (returnedPayments === 0)
      strengths.push('No returned payments are visible in the analysed period.')
    else friction.push('Returned payments may need clear context.')
    if (hasLongHistory)
      strengths.push(`${profile.period.months} months of account history are available.`)
    else friction.push('More account history would make the access story stronger.')
    if (overdraftMonths > 0) friction.push('Overdraft reliance may be read as a stability risk.')
    return completeReadiness(
      'A banking-access view of identity, stability and explainable account behaviour.',
      strengths,
      friction,
      actions,
      returnedPayments > 2
    )
  }

  if (template.type === 'utilities_phone') {
    if (profile.stability.billsPaidOnTime) strengths.push('Essential bills appear reliably paid.')
    else friction.push('Bill consistency needs more evidence or explanation.')
    if (returnedPayments === 0)
      strengths.push('No returned payments are visible in the analysed period.')
    else friction.push('Returned payments can make utilities or phone onboarding harder.')
    if (profile.stability.positiveMonthlySurplus)
      strengths.push('Current evidence shows positive monthly surplus.')
    else friction.push('Monthly surplus looks tight or negative.')
    if (profile.stability.stableIncome)
      strengths.push('Income appears stable enough for recurring commitments.')
    else friction.push('Income variability may need context.')
    return completeReadiness(
      'A recurring-contract view of bills, surplus and payment reliability.',
      strengths,
      friction,
      actions,
      returnedPayments > 1 || profile.affordability.surplusAfterAll < 0
    )
  }

  if (template.type === 'future_credit') {
    if (profile.stability.positiveMonthlySurplus)
      strengths.push('Positive monthly surplus supports responsible affordability.')
    else
      friction.push('Negative or tight surplus is the biggest current credit-readiness constraint.')
    if (overdraftMonths === 0) strengths.push('No overdraft dependency is visible.')
    else
      friction.push(
        `${overdraftMonths} overdraft month${overdraftMonths === 1 ? '' : 's'} may need improvement.`
      )
    if (profile.stability.noRecurringFailedPayments)
      strengths.push('Recurring failed-payment risk appears low.')
    else friction.push('Failed-payment patterns need work before future credit readiness improves.')
    if (hasLongHistory) strengths.push('Financial history is long enough to show a pattern.')
    else friction.push('Longer evidence coverage would make the trend more credible.')
    return completeReadiness(
      'A future-credit view of affordability, resilience and repayment reliability.',
      strengths,
      friction,
      actions,
      profile.affordability.surplusAfterAll < 0 || returnedPayments > 1
    )
  }

  if (template.type === 'income_proof') {
    if (profile.stability.stableIncome)
      strengths.push('Income appears stable across the available history.')
    else friction.push('Income is variable and needs a clearer explanation.')
    if (profile.income.averageMonthlyIncome > 0)
      strengths.push('Verified income is visible from the connected data.')
    else friction.push('Verified income is not yet clear enough.')
    if (hasLongHistory)
      strengths.push(`${profile.period.months} months of income history are available.`)
    else friction.push('More history would make income proof stronger.')
    actions.push({
      title: 'Review income sources',
      detail: 'Check the income breakdown and add context for any irregular sources.',
      href: '/dashboard/trust-profile/financial-profile',
      cta: 'Review income',
    })
    return completeReadiness(
      'An income-proof view of sources, consistency and explainability.',
      strengths,
      friction,
      actions
    )
  }

  if (identityScore >= 70) strengths.push('Identity confidence is strong.')
  else friction.push('Identity confidence needs improvement.')
  if (verificationScore >= 70) strengths.push('Verification strength is good.')
  else friction.push('Verification strength could be improved with more evidence.')
  if (hasLongHistory) strengths.push('Data coverage is strong enough to show behaviour over time.')
  else friction.push('More history would strengthen the profile.')
  if (profile.stability.noRecurringFailedPayments)
    strengths.push('No recurring failed-payment concern is visible.')
  else friction.push('Failed-payment context would improve the profile.')

  return completeReadiness(
    'A whole-profile view of evidence strength, confidence and missing signals.',
    strengths,
    friction,
    [
      {
        title: 'Complete the next evidence gap',
        detail: 'Use To do to add the missing item most likely to strengthen your profile.',
        href: '/dashboard/to-do',
        cta: 'Open To do',
      },
    ]
  )
}

function metricsForGoal(
  type: ConsumerGoalType,
  profile: InsightProfile | null | undefined,
  score: Score,
  goal: ConsumerGoal | null | undefined
) {
  const hasData = (profile?.period.transactionCount ?? 0) > 0
  const monthlyIncome = profile?.income.averageMonthlyIncome ?? 0
  const targetRent = goal?.targetMonthlyRent ?? null
  const targetRentToIncome = targetRent && monthlyIncome > 0 ? targetRent / monthlyIncome : null
  if (type === 'rental') {
    return [
      {
        label: 'Monthly income',
        value: hasData ? formatCurrency(monthlyIncome) : 'n/a',
        hint: humanConsistency(profile?.income.consistency),
      },
      {
        label: 'Target rent',
        value: targetRent ? formatCurrency(targetRent) : 'Not set',
        hint: 'Saved goal',
      },
      {
        label: 'Target rent to income',
        value: targetRentToIncome != null ? pct(targetRentToIncome) : 'n/a',
        hint: 'Based on saved target',
      },
      {
        label: 'Max sustainable rent',
        value: hasData ? formatCurrency(profile?.affordability.maxAffordableRent ?? 0) : 'n/a',
        hint: 'Estimated from evidence',
      },
    ]
  }
  if (type === 'banking_access') {
    return [
      {
        label: 'Identity confidence',
        value: score ? `${score.identityConfidenceScore}/100` : 'n/a',
        hint: 'Profile signal',
      },
      {
        label: 'Returned payments',
        value: hasData ? String(profile?.paymentBehaviour.returnedPayments ?? 0) : 'n/a',
        hint: 'Analysed period',
      },
      {
        label: 'History',
        value: hasData ? `${profile?.period.months ?? 0} mo` : 'n/a',
        hint: 'Connected evidence',
      },
      {
        label: 'Overdraft months',
        value: hasData ? String(profile?.paymentBehaviour.overdraftMonths ?? 0) : 'n/a',
        hint: 'Stability signal',
      },
    ]
  }
  if (type === 'utilities_phone') {
    return [
      {
        label: 'Bills paid on time',
        value: profile?.stability.billsPaidOnTime ? 'Yes' : 'Needs evidence',
        hint: 'Essential bills',
      },
      {
        label: 'Monthly surplus',
        value: hasData ? formatCurrency(profile?.affordability.surplusAfterAll ?? 0) : 'n/a',
        hint: 'After core spend',
      },
      {
        label: 'Returned payments',
        value: hasData ? String(profile?.paymentBehaviour.returnedPayments ?? 0) : 'n/a',
        hint: 'Friction signal',
      },
      {
        label: 'Income consistency',
        value: hasData ? humanConsistency(profile?.income.consistency) : 'n/a',
        hint: 'Recurring contracts',
      },
    ]
  }
  if (type === 'future_credit') {
    return [
      {
        label: 'EquiScore tier',
        value: score?.overallTier ? `Tier ${score.overallTier}` : 'n/a',
        hint: score?.status?.replaceAll('_', ' ') ?? 'Assessment',
      },
      {
        label: 'Monthly surplus',
        value: hasData ? formatCurrency(profile?.affordability.surplusAfterAll ?? 0) : 'n/a',
        hint: 'Affordability',
      },
      {
        label: 'Overdraft months',
        value: hasData ? String(profile?.paymentBehaviour.overdraftMonths ?? 0) : 'n/a',
        hint: 'Resilience',
      },
      {
        label: 'Failed payments',
        value: hasData ? String(profile?.paymentBehaviour.returnedPayments ?? 0) : 'n/a',
        hint: 'Payment behaviour',
      },
    ]
  }
  if (type === 'income_proof') {
    return [
      {
        label: 'Monthly income',
        value: hasData ? formatCurrency(monthlyIncome) : 'n/a',
        hint: 'Verified average',
      },
      {
        label: 'Consistency',
        value: hasData ? humanConsistency(profile?.income.consistency) : 'n/a',
        hint: 'Income pattern',
      },
      {
        label: 'History',
        value: hasData ? `${profile?.period.months ?? 0} mo` : 'n/a',
        hint: 'Evidence coverage',
      },
      {
        label: 'Surplus',
        value: hasData ? formatCurrency(profile?.affordability.surplusAfterAll ?? 0) : 'n/a',
        hint: 'After outgoings',
      },
    ]
  }
  return [
    {
      label: 'EquiScore',
      value: score ? `${score.overallScore}/100` : 'n/a',
      hint: score?.overallTier ? `Tier ${score.overallTier}` : 'Assessment',
    },
    {
      label: 'Identity',
      value: score ? `${score.identityConfidenceScore}/100` : 'n/a',
      hint: 'Confidence',
    },
    {
      label: 'Verification',
      value: score ? `${score.verificationStrengthScore}/100` : 'n/a',
      hint: 'Evidence strength',
    },
    {
      label: 'History',
      value: hasData ? `${profile?.period.months ?? 0} mo` : 'n/a',
      hint: 'Connected data',
    },
  ]
}

function monthlyEquivalent(amount: number, cadence: string) {
  const factor: Record<string, number> = {
    weekly: 52 / 12,
    fortnightly: 26 / 12,
    four_weekly: 13 / 12,
    monthly: 1,
    quarterly: 1 / 3,
  }
  return amount * (factor[cadence] ?? 1)
}

function addPlanAction(actions: GoalPlanAction[], action: GoalPlanAction) {
  if (!actions.some((existing) => existing.title === action.title)) actions.push(action)
}

function reviewableSpend(profile: InsightProfile | null | undefined) {
  const categories = profile?.expenses?.categories ?? []
  const categorySpend = categories
    .filter((category) =>
      ['subscriptions', 'mobile_internet', 'discretionary'].includes(category.key)
    )
    .reduce((sum, category) => sum + category.monthlyAverage, 0)

  const commitmentSpend = (profile?.commitments ?? [])
    .filter((commitment) => ['entertainment', 'utilities'].includes(commitment.category))
    .reduce((sum, commitment) => sum + monthlyEquivalent(commitment.amount, commitment.cadence), 0)

  return Math.max(categorySpend, commitmentSpend)
}

function buildGoalPlanActions(
  type: ConsumerGoalType,
  template: GoalTemplate,
  profile: InsightProfile | null | undefined,
  score: Score,
  goal: ConsumerGoal | null | undefined,
  readiness: GoalReadiness
): GoalPlanAction[] {
  const actions: GoalPlanAction[] = []

  if (!profile || profile.period.transactionCount === 0) {
    return [
      {
        kind: 'evidence',
        title: 'Connect financial evidence',
        detail:
          'Start with Open Banking or a statement upload so EquiScore can turn this goal into a real plan.',
        href: '/dashboard/connections',
        cta: 'Connect account',
        impact: 'Unlocks personalised actions',
      },
    ]
  }

  const targetRent = goal?.targetMonthlyRent ?? null
  const affordabilityGap =
    type === 'rental' && targetRent && profile.affordability.maxAffordableRent > 0
      ? Math.max(0, targetRent - profile.affordability.maxAffordableRent)
      : 0
  const surplus = profile.affordability.surplusAfterAll
  const reviewable = reviewableSpend(profile)
  const firstPassSaving = Math.round(Math.min(75, Math.max(15, reviewable * 0.15)))
  const overdraftMonths = profile.paymentBehaviour.overdraftMonths ?? 0
  const returnedPayments = profile.paymentBehaviour.returnedPayments
  const identityScore = score?.identityConfidenceScore ?? 0
  const verificationScore = score?.verificationStrengthScore ?? 0
  const bufferContribution =
    surplus > 0 ? Math.round(Math.min(150, Math.max(25, surplus * 0.2))) : 0

  if (affordabilityGap > 0) {
    addPlanAction(actions, {
      kind: 'readiness',
      title: 'Close the rent affordability gap',
      detail:
        'Your target rent is above the current estimated sustainable rent. Lower the target, add context for support, or reduce monthly pressure before sharing.',
      href: '#goal-settings',
      cta: 'Update target',
      value: `${formatCurrency(affordabilityGap)}/mo gap`,
      impact: 'Most direct route to rental readiness',
    })
  }

  if (reviewable >= 30) {
    addPlanAction(actions, {
      kind: 'money',
      title: 'Review flexible bills and subscriptions',
      detail:
        'EquiScore has detected monthly spend that may be reviewable. This is where comparison or affiliate links can be added later, once provider data is wired.',
      href: '/dashboard/my-money',
      cta: 'Open My Money',
      value: `${formatCurrency(Math.round(reviewable))}/mo reviewable`,
      impact: `First-pass target: ${formatCurrency(firstPassSaving)}/mo`,
      disclosure: 'Planning estimate only; no provider recommendation yet.',
    })
  }

  if (bufferContribution > 0 && ['rental', 'future_credit', 'stronger_profile'].includes(type)) {
    addPlanAction(actions, {
      kind: 'strategy',
      title: 'Build a visible buffer',
      detail:
        'A small recurring buffer can make affordability and resilience easier to explain, especially before renting or future-credit goals.',
      href: '/dashboard/my-money',
      cta: 'Review surplus',
      value: `${formatCurrency(bufferContribution)}/mo suggested`,
      impact: 'Improves resilience story',
    })
  }

  if (returnedPayments > 0 || overdraftMonths > 0) {
    addPlanAction(actions, {
      kind: 'readiness',
      title: 'Create a clean-payment streak',
      detail:
        'Avoiding returned payments and reducing overdraft reliance for the next few months would make this goal easier to support.',
      href: '/dashboard/my-money',
      cta: 'Review patterns',
      value: `${returnedPayments} returned, ${overdraftMonths} overdraft mo`,
      impact: 'Aim for 3 clean months',
    })
  }

  if ((type === 'banking_access' || type === 'stronger_profile') && identityScore < 70) {
    addPlanAction(actions, {
      kind: 'evidence',
      title: 'Strengthen identity evidence',
      detail:
        'Banking-access and whole-profile goals need a clear identity foundation before other evidence carries much weight.',
      href: '/dashboard/documents',
      cta: 'Add evidence',
      value: `${identityScore}/100`,
      impact: 'Improves confidence',
    })
  }

  if ((type === 'income_proof' || type === 'stronger_profile') && verificationScore < 70) {
    addPlanAction(actions, {
      kind: 'evidence',
      title: 'Add supporting documents',
      detail:
        'Payslips, employment letters or tax documents can make the income story easier for someone else to trust.',
      href: '/dashboard/documents',
      cta: 'Upload documents',
      value: `${verificationScore}/100`,
      impact: 'Improves verification strength',
    })
  }

  if (profile.period.months < 6) {
    addPlanAction(actions, {
      kind: 'evidence',
      title: 'Extend evidence history',
      detail:
        'More months of data make patterns more credible and reduce the need for manual explanation.',
      href: '/dashboard/connections',
      cta: 'Add history',
      value: `${profile.period.months}/6 months`,
      impact: 'Improves confidence over time',
    })
  }

  if (readiness.key === 'ready' && type === 'rental') {
    addPlanAction(actions, {
      kind: 'share',
      title: 'Prepare the rental share pack',
      detail:
        'The next useful step is to turn the goal and evidence into a recipient-safe pack with clear limitations.',
      href: '/dashboard/share',
      cta: 'Preview pack',
      impact: 'Moves from readiness to action',
    })
  }

  if (actions.length === 0) {
    addPlanAction(actions, {
      kind: 'strategy',
      title: `Keep ${template.shortTitle.toLowerCase()} fresh`,
      detail:
        'No urgent action is visible. Keep evidence connected and revisit this goal when income, rent, bills or documents change.',
      href: '/dashboard/to-do',
      cta: 'Open To do',
      impact: 'Maintains readiness',
    })
  }

  return actions.slice(0, 4)
}

const PLAN_KIND_LABEL: Record<GoalPlanAction['kind'], string> = {
  evidence: 'Evidence',
  money: 'Money move',
  readiness: 'Readiness',
  share: 'Share',
  strategy: 'Strategy',
}

export function GoalsView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { items: actionItems } = useActionItems()
  const [selectedType, setSelectedType] = useState<ConsumerGoalType>('rental')
  const [selectedTouched, setSelectedTouched] = useState(false)
  const [form, setForm] = useState<GoalForm>(EMPTY_GOAL_FORM)
  const [isDirty, setIsDirty] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
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
    data: savedGoals = [],
    isLoading: isGoalsLoading,
    isError: isGoalsError,
  } = useQuery<ConsumerGoal[]>({
    queryKey: ['consumer-goals'],
    queryFn: async () => api.goals.list((await getToken())!),
  })

  const savedByType = useMemo(
    () => new Map(savedGoals.map((goal) => [goal.type, goal] as const)),
    [savedGoals]
  )
  const activeGoals = savedGoals.filter((goal) => goal.status === 'active')
  const selectedTemplate =
    GOAL_TEMPLATES.find((template) => template.type === selectedType) ?? GOAL_TEMPLATES[0]!
  const SelectedIcon = selectedTemplate.icon
  const selectedGoal = savedByType.get(selectedType)
  const selectedIsActive = selectedGoal?.status === 'active'
  const selectedReadiness = buildGoalReadiness(
    selectedTemplate,
    profile,
    score ?? null,
    selectedGoal
  )
  const selectedStatus = READINESS[selectedReadiness.key]
  const selectedMetrics = metricsForGoal(selectedType, profile, score ?? null, selectedGoal)
  const goalPlanActions = buildGoalPlanActions(
    selectedType,
    selectedTemplate,
    profile,
    score ?? null,
    selectedGoal,
    selectedReadiness
  )
  const savedDate = formatSavedDate(selectedGoal?.updatedAt)

  useEffect(() => {
    const primary = savedGoals.find((goal) => goal.isPrimary && goal.status === 'active')
    if (primary && !selectedTouched) setSelectedType(primary.type)
  }, [savedGoals, selectedTouched])

  useEffect(() => {
    if (!isDirty) setForm(goalToForm(selectedGoal))
  }, [selectedGoal, isDirty])

  const invalidateGoals = () => {
    void queryClient.invalidateQueries({ queryKey: ['consumer-goals'] })
    void queryClient.invalidateQueries({ queryKey: ['consumer-goal', 'primary'] })
  }

  const saveGoal = useMutation({
    mutationFn: async ({ type, data }: { type: ConsumerGoalType; data: UpdateConsumerGoalInput }) =>
      api.goals.update((await getToken())!, type, data),
    onSuccess: () => {
      invalidateGoals()
      setIsDirty(false)
      setFormError(null)
      setSaveMessage('Saved')
    },
    onError: (error) => {
      setSaveMessage(null)
      setFormError(error instanceof Error ? error.message : 'We could not save this goal.')
    },
  })

  const setFocus = useMutation({
    mutationFn: async (type: ConsumerGoalType) => api.goals.setPrimary((await getToken())!, type),
    onSuccess: () => {
      invalidateGoals()
      setSaveMessage('Focus goal updated')
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'We could not update the focus goal.')
    },
  })

  const updateForm = <K extends keyof GoalForm>(key: K, value: GoalForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setIsDirty(true)
    setFormError(null)
    setSaveMessage(null)
  }

  const selectGoal = (type: ConsumerGoalType) => {
    setSelectedType(type)
    setSelectedTouched(true)
    setIsDirty(false)
    setFormError(null)
    setSaveMessage(null)
  }

  const goalPayload = (status: 'active' | 'paused' = 'active'): UpdateConsumerGoalInput => {
    const payload: UpdateConsumerGoalInput = {
      type: selectedType,
      status,
      label: selectedTemplate.title,
      notes: form.notes.trim() || null,
    }
    if (status === 'active' && (activeGoals.length === 0 || selectedGoal?.isPrimary)) {
      payload.isPrimary = true
    }
    if (selectedType === 'rental') {
      payload.targetMonthlyRent = parseMoneyInput(form.targetMonthlyRent)
      payload.moveDate = inputDateToIso(form.moveDate)
      payload.applicationMode = form.applicationMode
      payload.depositAvailable = parseMoneyInput(form.depositAvailable)
    }
    return payload
  }

  const handleSave = () => {
    saveGoal.mutate({ type: selectedType, data: goalPayload('active') })
  }

  const handlePause = () => {
    saveGoal.mutate({
      type: selectedType,
      data: {
        type: selectedType,
        status: 'paused',
        isPrimary: false,
        label: selectedTemplate.title,
      },
    })
  }

  const fallbackActions = actionItems.slice(0, 3).map((item) => ({
    title: item.title,
    detail: item.detail,
    href: item.href,
    cta: item.cta,
  }))
  const actions = selectedReadiness.actions.length > 0 ? selectedReadiness.actions : fallbackActions

  return (
    <PageLayout>
      <PageHeader
        title="Goals"
        description="Set the outcomes you are working towards, understand readiness by goal, and turn your financial evidence into a practical plan."
      />

      {isProfileLoading || isGoalsLoading ? (
        <div className="space-y-4">
          <div className="rounded-card bg-surface-hover h-52 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-card bg-surface-hover h-32 animate-pulse" />
            ))}
          </div>
        </div>
      ) : isProfileError || isGoalsError ? (
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
          <Card padding="lg" className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-content-muted mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <Sparkles className="h-4 w-4" />
                  Goal portfolio
                </div>
                <h2 className="text-content text-2xl font-semibold">
                  Work towards more than one outcome
                </h2>
                <p className="text-content-secondary mt-2 max-w-3xl text-sm">
                  Each goal reads the same Trust Profile differently. Rental readiness cares about
                  affordability and rent reliability; income proof cares about source clarity;
                  future credit cares about surplus and resilience.
                </p>
              </div>
              <StatusPill
                status={activeGoals.length > 0 ? 'success' : 'neutral'}
                label={`${activeGoals.length} active`}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {GOAL_TEMPLATES.map((template) => {
                const saved = savedByType.get(template.type)
                const readiness = buildGoalReadiness(template, profile, score ?? null, saved)
                const status = READINESS[readiness.key]
                const isSelected = template.type === selectedType
                const isActive = saved?.status === 'active'
                const Icon = template.icon
                return (
                  <button
                    key={template.type}
                    type="button"
                    onClick={() => selectGoal(template.type)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-brand-900 bg-brand-50'
                        : 'border-line bg-surface-card hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-panel bg-surface-inset flex h-10 w-10 shrink-0 items-center justify-center">
                        <Icon className="text-brand-900 h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-content font-semibold">{template.shortTitle}</p>
                          {saved?.isPrimary && isActive ? (
                            <StatusPill status="success" label="Focus" />
                          ) : null}
                          {isActive ? (
                            <StatusPill status={status.tone} label={status.label} />
                          ) : (
                            <StatusPill status="neutral" label="Available" />
                          )}
                        </div>
                        <p className="text-content-secondary mt-1 text-sm">
                          {template.description}
                        </p>
                        <p className="text-content-muted mt-2 text-xs">{template.evidenceFocus}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card padding="lg" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-content-muted mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <SelectedIcon className="h-4 w-4" />
                  Selected goal
                </div>
                <h2 className="text-content text-2xl font-semibold">{selectedTemplate.title}</h2>
                <p className="text-content-secondary mt-2 max-w-2xl text-sm">
                  {selectedTemplate.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={selectedStatus.tone} label={selectedStatus.label} />
                {selectedIsActive ? <StatusPill status="success" label="Active" /> : null}
              </div>
            </div>

            <InsetPanel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-content text-lg font-semibold">{selectedStatus.label}</p>
                <p className="text-content-secondary mt-1 max-w-2xl text-sm">
                  {selectedReadiness.summary}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!selectedIsActive ? (
                  <Button type="button" onClick={handleSave} loading={saveGoal.isPending}>
                    <Plus className="h-4 w-4" />
                    Start goal
                  </Button>
                ) : null}
                {selectedIsActive && !selectedGoal?.isPrimary ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setFocus.mutate(selectedType)}
                    loading={setFocus.isPending}
                  >
                    Set as focus
                  </Button>
                ) : null}
                {selectedType === 'rental' ? (
                  <Link href="/dashboard/share" className={buttonClasses('primary', 'md')}>
                    Preview share pack <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </InsetPanel>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {selectedMetrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  hint={metric.hint}
                />
              ))}
            </div>

            <section className="space-y-4">
              <div className="border-line-subtle flex items-end justify-between gap-4 border-b pb-3">
                <div>
                  <h3 className="text-content text-base font-semibold">Goal plan</h3>
                  <p className="text-content-secondary mt-1 text-sm">
                    Practical moves EquiScore can already infer from your evidence. Product links
                    and AI strategy can plug into these cards later.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {goalPlanActions.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-panel border-line-subtle bg-surface-card border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <StatusPill
                          status={action.kind === 'money' ? 'success' : 'neutral'}
                          label={PLAN_KIND_LABEL[action.kind]}
                        />
                        <h4 className="text-content mt-3 text-sm font-semibold">{action.title}</h4>
                      </div>
                      {action.value ? (
                        <span className="bg-brand-50 text-brand-900 rounded-full px-2.5 py-1 text-xs font-semibold">
                          {action.value}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-content-secondary mt-2 text-sm">{action.detail}</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-content text-xs font-semibold">{action.impact}</p>
                        {action.disclosure ? (
                          <p className="text-content-muted mt-1 text-xs">{action.disclosure}</p>
                        ) : null}
                      </div>
                      <Link
                        href={action.href}
                        className={buttonClasses('secondary', 'sm', 'shrink-0')}
                      >
                        {action.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <InsetPanel id="goal-settings" className="space-y-4" padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-content text-base font-semibold">Goal details</h3>
                  <p className="text-content-secondary mt-1 text-sm">
                    Save the practical context for this goal so the guidance can become more
                    specific over time.
                  </p>
                </div>
                <div className="text-content-muted text-right text-xs">
                  {savedDate ? `Last saved ${savedDate}` : 'Not saved yet'}
                </div>
              </div>

              {selectedType === 'rental' ? (
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
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="text-content block text-sm font-medium">
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm('notes', event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="border-line bg-surface-card placeholder:text-content-muted mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    placeholder="Add context you want EquiScore to remember for this goal."
                  />
                </label>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <div className="flex flex-wrap gap-2">
                    {selectedIsActive ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handlePause}
                        loading={saveGoal.isPending}
                      >
                        Pause
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!isDirty && selectedIsActive}
                      loading={saveGoal.isPending}
                    >
                      <Save className="h-4 w-4" />
                      {selectedIsActive ? 'Save goal' : 'Start goal'}
                    </Button>
                  </div>
                  {saveMessage && (
                    <p className="text-success-strong text-xs font-medium">{saveMessage}</p>
                  )}
                  {formError && (
                    <p className="text-danger-strong text-xs font-medium">{formError}</p>
                  )}
                </div>
              </div>
            </InsetPanel>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-content mb-3 text-base font-semibold">
                  What supports this goal
                </h3>
                {selectedReadiness.strengths.length === 0 ? (
                  <p className="rounded-panel bg-surface-inset text-content-secondary p-4 text-sm">
                    Add financial and identity evidence to surface positive readiness signals.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {selectedReadiness.strengths.map((item) => (
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
                {selectedReadiness.friction.length === 0 ? (
                  <p className="rounded-panel bg-success-soft text-success-strong p-4 text-sm">
                    No major friction points detected from the current evidence.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {selectedReadiness.friction.slice(0, 5).map((item) => (
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
                    The smallest set of actions likely to improve the selected goal.
                  </p>
                </div>
              </div>
              {actions.length === 0 ? (
                <p className="text-content-secondary text-sm">
                  Nothing urgent. Keep your evidence fresh and revisit this goal when your
                  circumstances change.
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
                <UploadCloud className="text-brand-900 h-4 w-4" />
                <h2 className="text-content text-base font-semibold">How this gets smarter</h2>
              </div>
              <p className="text-content-secondary text-sm">
                Goals become sharper as EquiScore sees more reliable evidence. The same transaction
                history can support several outcomes, but each goal weighs the signals differently.
              </p>
              <div className="rounded-panel bg-surface-inset text-content-secondary mt-4 p-3 text-sm">
                <p className="text-content font-medium">Next product layer</p>
                <p className="mt-1">
                  Goal-specific share packs and a clearer evidence checklist for each selected
                  outcome.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  )
}
