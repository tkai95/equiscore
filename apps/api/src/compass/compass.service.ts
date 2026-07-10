import { Injectable } from '@nestjs/common'
import { db } from '@equiscore/database'
import { InsightsService } from '../insights/insights.service'
import { ScoringService } from '../scoring/scoring.service'
import type { InsightProfile } from '../insights/engine'
import type {
  CompassAccount,
  CompassCommitment,
  CompassMoneyFlow,
  CompassMonthlyReview,
  CompassOpportunity,
  CompassPayload,
  CompassPriority,
} from './compass.types'

const DAY = 24 * 60 * 60 * 1000

const r2 = (n: number) => Math.round(n * 100) / 100
const r0 = (n: number) => Math.round(n)
/** Whole-pound GBP with the sign in the right place ("-£500", not "£-500"). */
const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

/** Commitment categories that are non-negotiable outgoings. */
const ESSENTIAL_COMMITMENT_CATEGORIES = new Set([
  'rent_payment',
  'utilities',
  'loan_repayment',
  'healthcare',
])

const PRIORITY_RANK: Record<CompassPriority, number> = { high: 0, medium: 1, low: 2 }

/**
 * EquiScore Compass service.
 *
 * A pure transformation of the deterministic `InsightProfile` (plus a balance
 * snapshot and the persisted TrustScore) into the Compass coaching payload.
 * It introduces NO new source of truth: income is already netted of internal
 * transfers upstream, categories/commitments reconcile with the Insights
 * drawers, and score factors come straight from the reason codes. The only
 * genuinely new computation here is forward-looking framing — savings rate,
 * emergency-buffer runway, best/tightest month, next-due projection, and the
 * derived savings opportunities — none of which invent figures the engine
 * didn't already produce.
 */
@Injectable()
export class CompassService {
  constructor(
    private readonly insights: InsightsService,
    private readonly scoring: ScoringService,
  ) {}

  async getForUser(userId: string): Promise<CompassPayload> {
    const profile = await this.insights.getProfileForUser(userId)
    const accounts = await this.loadAccounts(userId)
    const [scoreRow, improvements] = await Promise.all([
      this.scoring.getLatestScoreWithStatus(userId).catch(() => null),
      this.scoring
        .getImprovements(userId)
        .then((r) => r.improvements)
        .catch(() => []),
    ])

    const hasData = profile.period.transactionCount > 0

    const monthlyIncome = r0(profile.income.averageMonthlyIncome)
    const monthlySpend = r0(profile.expenses.averageMonthlySpend)

    // Savings = money reaching savings/investment destinations, whether we
    // infer them (unconnected) or the user has connected the savings account.
    // When a savings account is connected, the transfer into it is netted
    // upstream as an internal transfer, so we recover it from the account's
    // credits and subtract that portion from the "shuffling between accounts"
    // figure to avoid showing the same pounds twice.
    const connectedSavings = await this.connectedSavingsInflow(accounts, profile.period.months)
    const monthlySavings = r0(this.externalSavingsFlow(profile) + connectedSavings)
    const internalShuffling = r0(Math.max(0, profile.internalTransfersMonthly - connectedSavings))
    const surplus = r0(profile.affordability.surplusAfterAll)

    const opportunities = this.deriveOpportunities(profile, monthlySavings, monthlyIncome)
    const resilience = this.buildResilience(profile, accounts, monthlySavings)
    const monthlyReview = this.buildMonthlyReview(profile)

    const topCommitments = [...profile.commitments]
      .sort((a, b) => this.monthlyEquiv(b) - this.monthlyEquiv(a))
      .slice(0, 5)
      .map((c) => c.name)

    return {
      hasData,
      asOf: scoreRow?.financialDataAsOf ? new Date(scoreRow.financialDataAsOf).toISOString() : profile.period.to || null,
      status: scoreRow?.status ?? null,
      source: profile.source,
      monthsOfHistory: profile.period.months,

      overview: {
        monthlyIncome,
        monthlySpend,
        monthlySurplus: surplus,
        monthlySavings,
        internalTransfersMonthly: internalShuffling,
        personalTransfersMonthly: r0(profile.income.personalTransfersMonthly),
        topCommitments,
        topOpportunities: opportunities.slice(0, 3).map((o) => o.title),
        profileImpact: this.profileImpact(profile),
      },

      moneyMap: this.buildMoneyMap(profile, accounts, monthlySavings, internalShuffling),
      income: this.buildIncome(profile),
      spending: this.buildSpending(profile),
      commitments: this.buildCommitments(profile),
      paymentBehaviour: {
        onTimeRatio: r2(profile.paymentBehaviour.onTimeRatio),
        returnedPayments: profile.paymentBehaviour.returnedPayments,
        missedPayments: profile.paymentBehaviour.missedPayments,
        overdraftMonths: profile.paymentBehaviour.overdraftMonths,
        rentPaidConsistently: profile.paymentBehaviour.rentPaidConsistently,
        narrative: profile.paymentBehaviour.narrative,
      },
      resilience,
      monthlyReview,

      impact: {
        overallScore: scoreRow?.overallScore ?? null,
        overallTier: scoreRow?.overallTier ?? null,
        status: scoreRow?.status ?? null,
        reasonCodes: this.reasonCodes(scoreRow),
        improvements: improvements.map((i) => ({
          id: i.id,
          title: i.title,
          detail: i.detail,
          href: i.href,
          estimatedGain: i.estimatedGain,
          reachesTier: i.reachesTier,
          dimension: i.dimension,
        })),
      },

      opportunities,
    }
  }

  // ─── Accounts & balances ──────────────────────────────────────────────────

  private async loadAccounts(userId: string) {
    return db.bankAccount.findMany({
      where: { bankConnection: { userId } },
      select: {
        id: true,
        accountName: true,
        accountType: true,
        accountHolderName: true,
        currentBalance: true,
      },
    })
  }

  /** Money landing in the user's connected savings accounts, per month. */
  private async connectedSavingsInflow(
    accounts: Awaited<ReturnType<CompassService['loadAccounts']>>,
    months: number,
  ): Promise<number> {
    const ids = accounts.filter((a) => a.accountType === 'savings').map((a) => a.id)
    if (ids.length === 0) return 0
    const agg = await db.bankTransaction.aggregate({
      where: { bankAccountId: { in: ids }, direction: 'credit' },
      _sum: { amount: true },
    })
    return Math.abs(agg._sum.amount ?? 0) / Math.max(1, months)
  }

  /** Liquid balance = current + savings account balances (excludes credit). */
  private liquidBalance(
    accounts: Awaited<ReturnType<CompassService['loadAccounts']>>,
    profile: InsightProfile,
  ): number | null {
    const withBalance = accounts.filter(
      (a) => a.currentBalance != null && (a.accountType === 'current' || a.accountType === 'savings'),
    )
    if (withBalance.length > 0) {
      return r0(withBalance.reduce((s, a) => s + (a.currentBalance ?? 0), 0))
    }
    // Statement uploads carry no live balance but do carry a reconciled closing balance.
    if (profile.integrity.closingBalance != null) return r0(profile.integrity.closingBalance)
    return null
  }

  // ─── Money map ────────────────────────────────────────────────────────────

  /** Detected monthly flow into INFERRED (unconnected) savings / investment. */
  private externalSavingsFlow(profile: InsightProfile): number {
    return profile.externalAccounts
      .filter((a) => a.type === 'savings' || a.type === 'investment')
      .reduce((s, a) => s + a.monthlyFlow, 0)
  }

  private buildMoneyMap(
    profile: InsightProfile,
    accounts: Awaited<ReturnType<CompassService['loadAccounts']>>,
    monthlySavings: number,
    internalShuffling: number,
  ): CompassPayload['moneyMap'] {
    const externalIncome = r0(profile.income.averageMonthlyIncome)
    const personalTransfers = r0(profile.income.personalTransfersMonthly)
    const internalTransfers = internalShuffling
    const toEssentials = r0(profile.affordability.essentialOutgoings)
    const toDiscretionary = r0(profile.affordability.discretionarySpend)
    const retained = r0(externalIncome - monthlySavings - toEssentials - toDiscretionary)

    const flows: CompassMoneyFlow[] = []
    if (externalIncome > 0)
      flows.push({
        id: 'income',
        from: 'External income',
        to: 'Your accounts',
        monthly: externalIncome,
        kind: 'income',
        confidence: 'high',
        detail: 'Salary and other genuine income, after removing money moved between your own accounts.',
      })
    if (personalTransfers > 0)
      flows.push({
        id: 'personal',
        from: 'Money from people',
        to: 'Your accounts',
        monthly: personalTransfers,
        kind: 'personal',
        confidence: 'medium',
        detail: 'One-off or occasional credits from individuals. Not counted as income.',
      })
    if (internalTransfers > 0)
      flows.push({
        id: 'internal',
        from: 'Your accounts',
        to: 'Your other accounts',
        monthly: internalTransfers,
        kind: 'internal',
        confidence: 'high',
        detail: 'Money you move between your own accounts. Never counted as income or spending.',
      })
    if (toEssentials > 0)
      flows.push({
        id: 'essentials',
        from: 'Your accounts',
        to: 'Bills & essentials',
        monthly: toEssentials,
        kind: 'bills',
        confidence: 'high',
        detail: 'Rent, utilities, council tax, loan repayments and other essential outgoings.',
      })
    if (toDiscretionary > 0)
      flows.push({
        id: 'discretionary',
        from: 'Your accounts',
        to: 'Everyday spending',
        monthly: toDiscretionary,
        kind: 'discretionary',
        confidence: 'high',
        detail: 'Groceries, transport, eating out, shopping and other flexible spend.',
      })
    if (monthlySavings > 0)
      flows.push({
        id: 'savings',
        from: 'Your accounts',
        to: 'Savings & investments',
        monthly: monthlySavings,
        kind: 'savings',
        confidence: 'medium',
        detail: 'Money moving to savings or investment destinations.',
      })

    const mapped: CompassAccount[] = accounts.map((a) => ({
      label: a.accountName || this.accountTypeLabel(a.accountType),
      type: a.accountType,
      role: this.accountTypeLabel(a.accountType),
      connected: true,
      monthlyIn: null,
      monthlyOut: null,
      confidence: 'high',
      note: a.accountHolderName ? `Held by ${a.accountHolderName}` : 'Connected account',
    }))

    const inferred: CompassAccount[] = profile.externalAccounts.map((a) => ({
      label: a.label,
      type: a.type,
      role: this.inferredRole(a.type),
      connected: false,
      monthlyIn: a.direction === 'inflow' || a.direction === 'both' ? r0(a.monthlyFlow) : null,
      monthlyOut: a.direction === 'outflow' || a.direction === 'both' ? r0(a.monthlyFlow) : null,
      confidence: a.confidence,
      note: a.reason,
    }))

    return {
      externalIncome,
      personalTransfers,
      internalTransfers,
      toSavings: monthlySavings,
      toEssentials,
      toDiscretionary,
      retained,
      accounts: [...mapped, ...inferred],
      flows,
      note:
        inferred.length > 0
          ? 'We spotted regular movement to accounts you have not connected. Confirm them to complete the picture.'
          : 'Connect or upload more accounts to see the full flow of your money.',
    }
  }

  private accountTypeLabel(type: string): string {
    switch (type) {
      case 'current':
        return 'Current account'
      case 'savings':
        return 'Savings account'
      case 'credit_card':
        return 'Credit card'
      case 'business':
        return 'Business account'
      default:
        return 'Account'
    }
  }

  private inferredRole(type: string): string {
    switch (type) {
      case 'savings':
        return 'Savings (inferred)'
      case 'investment':
        return 'Investment (inferred)'
      case 'credit':
        return 'Credit (inferred)'
      case 'own_current':
        return 'Own account (inferred)'
      default:
        return 'Unconfirmed destination'
    }
  }

  // ─── Income ───────────────────────────────────────────────────────────────

  private buildIncome(profile: InsightProfile): CompassPayload['income'] {
    const inc = profile.income
    return {
      monthlyIncome: r0(inc.averageMonthlyIncome),
      netAnnualIncome: r0(inc.netAnnualIncome),
      estimatedGrossAnnualSalary: inc.estimatedGrossAnnualSalary != null ? r0(inc.estimatedGrossAnnualSalary) : null,
      salaryMonthlyNet: inc.salaryMonthlyNet != null ? r0(inc.salaryMonthlyNet) : null,
      personalTransfersMonthly: r0(inc.personalTransfersMonthly),
      volatility: r2(inc.volatility),
      consistency: inc.consistency,
      character: inc.primaryCharacter,
      characterTags: inc.characterTags,
      recurringSalaryDetected: inc.recurringSalaryDetected,
      paydayOfMonth: null,
      sources: inc.sources.map((s) => ({
        name: s.name,
        key: s.key,
        category: s.category,
        monthlyAverage: r0(s.monthlyAverage),
        monthsPresent: s.monthsPresent,
        pendingConfirmation: s.pendingConfirmation,
      })),
      narrative: inc.narrative,
    }
  }

  // ─── Spending ─────────────────────────────────────────────────────────────

  private buildSpending(profile: InsightProfile): CompassPayload['spending'] {
    return {
      averageMonthlySpend: r0(profile.expenses.averageMonthlySpend),
      essentialShare: r2(profile.expenses.essentialShare),
      categories: profile.expenses.categories.map((c) => ({
        key: c.key,
        label: c.label,
        monthlyAverage: r0(c.monthlyAverage),
        total: r0(c.total),
        share: r2(c.share),
        essential: c.essential,
        unconfirmed: c.unconfirmed,
      })),
      narrative: profile.expenses.narrative,
    }
  }

  // ─── Commitments ──────────────────────────────────────────────────────────

  private monthlyEquiv(c: InsightProfile['commitments'][number]): number {
    // Empirical monthly spend on this payee: typical amount × payments-per-month.
    return c.amount * (c.occurrences / Math.max(1, c.monthsCovered))
  }

  private buildCommitments(profile: InsightProfile): CompassCommitment[] {
    return profile.commitments.map((c) => ({
      name: c.name,
      key: c.key,
      category: c.category,
      amount: r0(c.amount),
      cadence: c.cadence,
      monthlyEquivalent: r0(this.monthlyEquiv(c)),
      typicalDayOfMonth: c.typicalDayOfMonth,
      consistency: c.consistency,
      occurrences: c.occurrences,
      monthsCovered: c.monthsCovered,
      missedCount: c.missedCount,
      returnedCount: c.returnedCount,
      essential: ESSENTIAL_COMMITMENT_CATEGORIES.has(c.category),
      nextExpected: this.projectNextDue(c.cadence, c.typicalDayOfMonth),
    }))
  }

  /** Project the next payment date from the typical day-of-month (monthly only). */
  private projectNextDue(cadence: string, day: number | null): { date: string; inDays: number } | null {
    if (cadence !== 'monthly' || day == null) return null
    const now = new Date()
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const clampDay = (y: number, m: number) => Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate())
    let y = now.getUTCFullYear()
    let m = now.getUTCMonth()
    let candidate = Date.UTC(y, m, clampDay(y, m))
    if (candidate < today) {
      m += 1
      if (m > 11) {
        m = 0
        y += 1
      }
      candidate = Date.UTC(y, m, clampDay(y, m))
    }
    return { date: new Date(candidate).toISOString().slice(0, 10), inDays: Math.round((candidate - today) / DAY) }
  }

  // ─── Resilience ───────────────────────────────────────────────────────────

  private buildResilience(
    profile: InsightProfile,
    accounts: Awaited<ReturnType<CompassService['loadAccounts']>>,
    monthlySavings: number,
  ): CompassPayload['resilience'] {
    const aff = profile.affordability
    const income = r0(aff.monthlyIncome)
    const essentials = r0(aff.essentialOutgoings)
    const savingsRate = income > 0 ? r2(monthlySavings / income) : 0

    const liquid = this.liquidBalance(accounts, profile)
    const overdrawn = liquid != null && liquid < 0
    // Never show negative "months covered"; an overdrawn balance is zero buffer.
    const monthsCovered = liquid != null && essentials > 0 ? Math.max(0, r2(liquid / essentials)) : null
    const target = r0(essentials * 3)

    const { bestMonth, tightestMonth } = this.bestAndTightest(profile)

    return {
      monthlyIncome: income,
      essentialOutgoings: essentials,
      discretionarySpend: r0(aff.discretionarySpend),
      surplusAfterAll: r0(aff.surplusAfterAll),
      savingsRate,
      monthlySavings,
      emergencyBuffer: {
        monthsCovered,
        liquidBalance: liquid,
        basis: monthsCovered != null ? 'balance' : 'unavailable',
        estimate: profile.source !== 'open_banking',
        target,
        note:
          monthsCovered == null
            ? 'Connect an account with a live balance to see how many months of essentials you could cover.'
            : overdrawn
              ? 'Your available balance is currently overdrawn, so there is no buffer yet.'
              : `Based on your available balance of ${gbp(liquid ?? 0)} against ${gbp(essentials)} of monthly essentials.`,
      },
      ratios: {
        rentToIncome: aff.ratios.rentToIncome != null ? r2(aff.ratios.rentToIncome) : null,
        debtToIncome: r2(aff.ratios.debtToIncome),
        commitmentsToIncome: r2(aff.ratios.commitmentsToIncome),
        essentialsToIncome: r2(aff.ratios.essentialsToIncome),
        savingsToIncome: savingsRate,
      },
      stressTest: {
        incomeDropPct: aff.stressTest.incomeDropPct,
        surplusUnderStress: r0(aff.stressTest.surplusUnderStress),
        stillPositive: aff.stressTest.stillPositive,
        essentialsCovered: aff.stressTest.essentialsCovered,
      },
      currentRent: aff.currentRent != null ? r0(aff.currentRent) : null,
      maxAffordableRent: r0(aff.maxAffordableRent),
      headroomForNewRent: r0(aff.headroomForNewRent),
      rating: aff.rating,
      bestMonth,
      tightestMonth,
      stability: {
        stableIncome: profile.stability.stableIncome,
        rentNeverMissed: profile.stability.rentNeverMissed,
        billsPaidOnTime: profile.stability.billsPaidOnTime,
        positiveMonthlySurplus: profile.stability.positiveMonthlySurplus,
        noOverdraftDependency: profile.stability.noOverdraftDependency,
        noRecurringFailedPayments: profile.stability.noRecurringFailedPayments,
        monthsOfHistory: profile.stability.monthsOfHistory,
      },
      notes: aff.notes,
    }
  }

  /** Complete months only (excludes the in-progress current calendar month). */
  private completeMonths(profile: InsightProfile): InsightProfile['monthly'] {
    const currentKey = new Date().toISOString().slice(0, 7)
    const complete = profile.monthly.filter((m) => m.month < currentKey)
    return complete.length > 0 ? complete : profile.monthly
  }

  private bestAndTightest(profile: InsightProfile): {
    bestMonth: CompassPayload['resilience']['bestMonth']
    tightestMonth: CompassPayload['resilience']['tightestMonth']
  } {
    const months = this.completeMonths(profile)
    if (months.length < 2) return { bestMonth: null, tightestMonth: null }
    let best = months[0]!
    let tight = months[0]!
    for (const m of months) {
      if (m.surplusAfterEssentials > best.surplusAfterEssentials) best = m
      if (m.surplusAfterEssentials < tight.surplusAfterEssentials) tight = m
    }
    return {
      bestMonth: { month: best.month, label: this.monthLabel(best.month), surplus: r0(best.surplusAfterEssentials) },
      tightestMonth: { month: tight.month, label: this.monthLabel(tight.month), surplus: r0(tight.surplusAfterEssentials) },
    }
  }

  // ─── Monthly review ───────────────────────────────────────────────────────

  private buildMonthlyReview(profile: InsightProfile): CompassMonthlyReview | null {
    const months = this.completeMonths(profile)
    if (months.length === 0) return null
    const latest = months[months.length - 1]!
    const priors = months.slice(Math.max(0, months.length - 7), months.length - 1)
    const avg = (pick: (m: InsightProfile['monthly'][number]) => number) =>
      priors.length ? priors.reduce((s, m) => s + pick(m), 0) / priors.length : pick(latest)

    const vsAverage = {
      income: r0(latest.income - avg((m) => m.income)),
      spend: r0(latest.spend - avg((m) => m.spend)),
      net: r0(latest.net - avg((m) => m.net)),
    }

    const currentKey = new Date().toISOString().slice(0, 7)
    return {
      month: latest.month,
      label: this.monthLabel(latest.month),
      isComplete: latest.month < currentKey,
      income: r0(latest.income),
      spend: r0(latest.spend),
      essentialSpend: r0(latest.essentialSpend),
      net: r0(latest.net),
      surplusAfterEssentials: r0(latest.surplusAfterEssentials),
      vsAverage,
      headline: this.reviewHeadline(vsAverage, priors.length > 0),
    }
  }

  private reviewHeadline(vs: { income: number; spend: number; net: number }, hasBaseline: boolean): string {
    if (!hasBaseline) return 'Your first full month of history. We will compare future months against it.'
    const spendUp = vs.spend
    const incomeMove = vs.income
    if (Math.abs(spendUp) < 40 && Math.abs(incomeMove) < 40)
      return 'A steady month, in line with your usual pattern.'
    if (Math.abs(spendUp) >= Math.abs(incomeMove)) {
      return spendUp > 0
        ? `Spending was about £${Math.abs(spendUp).toLocaleString('en-GB')} higher than usual.`
        : `Spending was about £${Math.abs(spendUp).toLocaleString('en-GB')} lower than usual.`
    }
    return incomeMove > 0
      ? `Income was about £${Math.abs(incomeMove).toLocaleString('en-GB')} higher than usual.`
      : `Income was about £${Math.abs(incomeMove).toLocaleString('en-GB')} lower than usual.`
  }

  private monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number)
    const d = new Date(Date.UTC(y!, (m! - 1), 1))
    return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
  }

  // ─── Savings opportunities (derived, deterministic, stateless) ─────────────

  private deriveOpportunities(
    profile: InsightProfile,
    monthlySavings: number,
    monthlyIncome: number,
  ): CompassOpportunity[] {
    const out: CompassOpportunity[] = []
    const cat = (key: string) => profile.expenses.categories.find((c) => c.key === key)
    const push = (o: Omit<CompassOpportunity, 'estimatedAnnualLow' | 'estimatedAnnualHigh'>) =>
      out.push({
        ...o,
        estimatedAnnualLow: o.estimatedSavingLow != null ? o.estimatedSavingLow * 12 : null,
        estimatedAnnualHigh: o.estimatedSavingHigh != null ? o.estimatedSavingHigh * 12 : null,
      })

    const mobile = cat('mobile_internet')
    // Only worth reviewing above a floor, and never promise saving more than spent.
    if (mobile && mobile.monthlyAverage >= 10) {
      const high = Math.min(20, Math.round(mobile.monthlyAverage))
      push({
        id: 'review_mobile_broadband',
        type: 'provider_review',
        title: 'Review your mobile & broadband',
        description: `You pay about £${mobile.monthlyAverage.toLocaleString('en-GB')} a month for mobile and internet. If any contract is out of its minimum term, cheaper deals may be available.`,
        reason: 'Recurring mobile/broadband spend detected.',
        estimatedSavingLow: Math.min(5, high),
        estimatedSavingHigh: high,
        effort: 'low',
        priority: 'medium',
        linkedKey: 'mobile_internet',
      })
    }

    const subs = cat('subscriptions')
    if (subs && subs.monthlyAverage >= 15) {
      push({
        id: 'review_subscriptions',
        type: 'subscriptions_review',
        title: 'Review your subscriptions',
        description: `About £${subs.monthlyAverage.toLocaleString('en-GB')} a month goes on subscriptions and entertainment. Cancelling anything unused is an easy saving.`,
        reason: 'Recurring subscription spend above £15/month.',
        estimatedSavingLow: 15,
        estimatedSavingHigh: Math.min(45, Math.round(subs.monthlyAverage)),
        effort: 'low',
        priority: subs.monthlyAverage >= 40 ? 'high' : 'medium',
        linkedKey: 'subscriptions',
      })
    }

    const utilities = cat('utilities')
    if (utilities && utilities.monthlyAverage >= 80) {
      push({
        id: 'review_energy',
        type: 'provider_review',
        title: 'Review your energy tariff',
        description: `Energy and utilities are around £${utilities.monthlyAverage.toLocaleString('en-GB')} a month. It may be worth checking whether a better tariff is available.`,
        reason: 'Utility spend above £80/month.',
        estimatedSavingLow: 10,
        estimatedSavingHigh: 40,
        effort: 'medium',
        priority: 'medium',
        linkedKey: 'utilities',
      })
    }

    if (profile.affordability.surplusAfterAll > 0 && monthlyIncome > 0 && monthlySavings / monthlyIncome < 0.1) {
      push({
        id: 'build_buffer',
        type: 'build_buffer',
        title: 'Build your savings buffer',
        description: `You have about £${r0(profile.affordability.surplusAfterAll).toLocaleString('en-GB')} left over most months but are saving little of it. Setting aside a regular amount builds resilience.`,
        reason: 'Positive surplus with a low savings rate.',
        estimatedSavingLow: null,
        estimatedSavingHigh: null,
        effort: 'low',
        priority: 'medium',
        linkedKey: null,
      })
    }

    if (profile.paymentBehaviour.overdraftMonths != null && profile.paymentBehaviour.overdraftMonths > 0) {
      push({
        id: 'reduce_overdraft',
        type: 'reduce_overdraft',
        title: 'Reduce overdraft reliance',
        description: `Your balance went into overdraft in ${profile.paymentBehaviour.overdraftMonths} month${profile.paymentBehaviour.overdraftMonths === 1 ? '' : 's'}. Overdraft fees are an avoidable cost and can weigh on your profile.`,
        reason: 'Overdraft usage detected from balances.',
        estimatedSavingLow: null,
        estimatedSavingHigh: null,
        effort: 'medium',
        priority: 'high',
        linkedKey: null,
      })
    }

    const rentRatio = profile.affordability.ratios.rentToIncome
    if (rentRatio != null && rentRatio > 0.4) {
      push({
        id: 'high_rent_ratio',
        type: 'affordability_review',
        title: 'Rent is a large share of your income',
        description: `Rent is about ${Math.round(rentRatio * 100)}% of your take-home. Lenders and landlords usually look for under 40%. Worth keeping in mind when planning a move.`,
        reason: 'Rent-to-income ratio above 40%.',
        estimatedSavingLow: null,
        estimatedSavingHigh: null,
        effort: 'high',
        priority: rentRatio > 0.5 ? 'high' : 'medium',
        linkedKey: null,
      })
    }

    return out.sort((a, b) => {
      const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (p !== 0) return p
      return (b.estimatedSavingHigh ?? 0) - (a.estimatedSavingHigh ?? 0)
    })
  }

  // ─── Impact ───────────────────────────────────────────────────────────────

  private reasonCodes(scoreRow: { reasonCodes?: unknown } | null): CompassPayload['impact']['reasonCodes'] {
    if (!scoreRow || !Array.isArray(scoreRow.reasonCodes)) return []
    return (scoreRow.reasonCodes as Array<Record<string, unknown>>)
      .filter((r) => r && typeof r.code === 'string')
      .map((r) => ({
        code: String(r.code),
        dimension: String(r.dimension ?? ''),
        sentiment: String(r.sentiment ?? 'neutral'),
        message: String(r.message ?? ''),
        weight: typeof r.weight === 'number' ? r.weight : 0,
      }))
  }

  private profileImpact(profile: InsightProfile): string[] {
    const out: string[] = []
    if (profile.stability.stableIncome) out.push('Stable, recurring income supports your score.')
    if (profile.paymentBehaviour.rentPaidConsistently && profile.stability.rentNeverMissed)
      out.push('Rent is paid consistently, one of the strongest positive signals.')
    if (profile.affordability.rating === 'comfortable' || profile.affordability.rating === 'manageable')
      out.push(`Affordability looks ${profile.affordability.rating}.`)
    else out.push('Surplus is tight, which limits affordability headroom.')
    if (!profile.stability.noOverdraftDependency) out.push('Overdraft reliance may hold your profile back.')
    return out.slice(0, 4)
  }
}
