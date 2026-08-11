import type {
  NormalizedTxn,
  ProfileContext,
  InsightProfile,
  StabilitySignals,
  Period,
  MonthlyPoint,
  IncomeProfile,
  ExpenseProfile,
  PaymentBehaviour,
  SubScore,
  CounterpartyResolutionEntry,
} from './types'
import { detectRecurringStreams } from './recurrence'
import { analyzeIncome, incomeEligibleKeys } from './income'
import { detectExternalAccounts } from './external-accounts'
import { detectInternalTransfers } from './internal-transfers'
import { analyzeExpenses, resolveCategory } from './expenses'
import { analyzeCommitments } from './commitments'
import { analyzeAffordability } from './affordability'
import { detectRisk } from './risk'
import { checkBalanceContinuity } from './integrity'
import { generateQuestions } from './questions'
import { computeSubScores } from './subscores'
import { classify } from './classify'
import { normalizeCounterparty, looksLikePerson, nameMatchScore } from './normalize'
import { toDate, monthKey, round2 } from './util'

/**
 * The single deterministic pass: normalized transactions → full insight
 * profile (income, expenses, commitments, stability, risk, questions,
 * sub-scores). Source-agnostic — the same engine serves Open Banking,
 * uploaded statements, and test fixtures.
 */
export function buildInsightProfile(input: NormalizedTxn[], ctx: ProfileContext): InsightProfile {
  const txns = [...input].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
  const resolvedIds = new Set(ctx.resolvedQuestionIds ?? [])

  const period = computePeriod(txns)
  const months = new Set(txns.map((t) => monthKey(toDate(t.date)))).size

  // Net out transfers between the user's own connected accounts before any
  // behavioural analysis: a £400 standing order that leaves the salary account
  // and lands in the savings account is one internal movement, not £400 of both
  // income and spending. Everything income/spend/commitment-related runs on the
  // netted set; coverage (period) and per-account integrity use the full set.
  const internalTxns = detectInternalTransfers(txns)
  const netTxns = internalTxns.size > 0 ? txns.filter((t) => !internalTxns.has(t)) : txns
  // Money moving between the user's own connected accounts, per month — surfaced
  // so the assistant can describe it correctly (it is NOT income or spending).
  const internalTransfersMonthly = round2(
    [...internalTxns].filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0) /
      Math.max(1, months)
  )

  const creditStreams = detectRecurringStreams(netTxns, 'credit')
  const debitStreams = detectRecurringStreams(netTxns, 'debit')
  const recurringKeys = new Set([...creditStreams, ...debitStreams].map((s) => s.key))

  const incomeKeys = incomeEligibleKeys(netTxns, creditStreams)
  const income = analyzeIncome(netTxns, creditStreams, resolvedIds, incomeKeys)
  const recurringDebitKeys = new Set(debitStreams.map((s) => s.key))

  // ── Counterparty resolutions → three DISTINCT key sets ───────────────────
  // These MUST stay separate: collapsing them would repeat the exact double-
  // counting / wrong-netting failure the PRD (§19, §21, §22, §40) warns against.
  //
  // ownAccountKeys: genuinely the user's own account → transfers are internal,
  //   netted OUT of spend and cashflow (existing semantics, unchanged).
  // jointAccountKeys: a joint household account → NOT netted out (the money
  //   really left and we don't know what it funded downstream), but routed to
  //   a household_funding bucket instead of discretionary spend.
  // creditCardKeys: the user's own credit card → NOT netted out (the £4,000
  //   really left), but the commitment is flagged debt_service / not new
  //   consumption. Proper netting only when the card statement is also ingested.
  //
  // Legacy `transfer:` answers continue to feed ownAccountKeys for backward
  // compatibility; persisted CounterpartyResolution rows are the canonical
  // source going forward.
  const resolutions = ctx.counterpartyResolutions ?? new Map<string, CounterpartyResolutionEntry>()
  const ownAccountKeys = new Set<string>([
    // Legacy: free-text "transfer:<key>" answers matching "own account".
    ...Object.entries(ctx.answers ?? {})
      .filter(([id, ans]) => id.startsWith('transfer:') && /own account|my own|myself/i.test(ans))
      .map(([id]) => id.slice('transfer:'.length)),
    // Canonical: persisted resolutions with role own_account.
    ...[...resolutions.entries()].filter(([, r]) => r.role === 'own_account').map(([k]) => k),
  ])
  const jointAccountKeys = new Set<string>(
    [...resolutions.entries()].filter(([, r]) => r.role === 'joint_household_account').map(([k]) => k),
  )
  const creditCardKeys = new Set<string>(
    [...resolutions.entries()].filter(([, r]) => r.role === 'credit_card' || r.role === 'loan').map(([k]) => k),
  )
  const rentProviderKeys = new Set<string>(
    [...resolutions.entries()].filter(([, r]) => r.role === 'rent_provider').map(([k]) => k),
  )
  // The day salary lands — used to spot money swept out just after payday.
  // Cadence allow-list mirrors detectSalaryStream (income.ts): monthly, four-
  // weekly, fortnightly, or weekly. Fortnightly/weekly salaries don't have a
  // stable "day of month" (they drift), but typicalDayOfMonth is nullable and
  // downstream consumers tolerate null — keeping them in the candidate set
  // preserves parity with the salary-detection flag.
  const salaryDayOfMonth =
    creditStreams
      .filter(
        (s) =>
          (s.cadence === 'monthly' || s.cadence === 'four_weekly' || s.cadence === 'fortnightly' || s.cadence === 'weekly') &&
          s.occurrences >= 3,
      )
      .sort((a, b) => b.amount - a.amount)[0]?.typicalDayOfMonth ?? null

  const externalAccounts = detectExternalAccounts(netTxns, debitStreams, {
    accountHolderName: ctx.accountHolderName,
    months,
    salaryDayOfMonth,
    ownAccountKeys,
  })

  const expenses = analyzeExpenses(netTxns, resolvedIds, months, ctx.answers, recurringDebitKeys, ownAccountKeys, jointAccountKeys)
  const { commitments, paymentBehaviour } = analyzeCommitments(debitStreams, netTxns, ctx.answers)
  const integrity = checkBalanceContinuity(txns)
  const risk = detectRisk(netTxns, recurringKeys, paymentBehaviour.overdraftMonths, resolvedIds, integrity)

  const transactionClarity = computeClarity(netTxns, resolvedIds, recurringKeys)
  // resolvedCounterpartyKeys: counterparties the user has already resolved via a
  // persisted CounterpartyResolution. Passed to generateQuestions so it doesn't
  // re-ask about a relationship the user already confirmed.
  const resolvedCounterpartyKeys = new Set<string>([...(ctx.counterpartyResolutions ?? new Map()).keys()])
  const questions = generateQuestions({ income, expenses, unusual: risk.unusual, debitStreams, externalAccounts, resolvedIds, resolvedCounterpartyKeys })
  const stability = deriveStability(income, expenses, paymentBehaviour, commitments, months)
  const nameMatch = nameMatchScore(ctx.profileName, ctx.accountHolderName) > 0.7

  const { subScores, overall } = computeSubScores({
    income,
    expenses,
    paymentBehaviour,
    commitments,
    risk,
    integrity,
    transactionClarity,
    monthsOfHistory: months,
    source: ctx.source,
    nameMatch,
    pendingQuestionCount: risk.unusual.filter((u) => u.status === 'pending_context').length,
  })

  const monthly = computeMonthly(netTxns, incomeKeys, ownAccountKeys)
  const affordability = analyzeAffordability(income, expenses, commitments, paymentBehaviour)
  const summary = buildSummary({ income, expenses, subScores, source: ctx.source })

  return {
    period,
    income,
    expenses,
    commitments,
    paymentBehaviour,
    stability,
    risk: { level: risk.level, score: risk.score, typologies: risk.typologies, clearedTypologies: risk.clearedTypologies },
    integrity,
    unusual: risk.unusual,
    questions,
    subScores,
    transactionClarity: round2(transactionClarity),
    overall,
    monthly,
    affordability,
    externalAccounts,
    internalTransfersMonthly,
    summary,
    source: ctx.source,
  }
}

/**
 * Per-calendar-month cashflow. Money in vs money out (savings/investment
 * transfers are not "spend"), and the essential portion of that spend so we can
 * show surplus-after-essentials, best/tightest month, and the latest month.
 */
function computeMonthly(
  txns: NormalizedTxn[],
  incomeKeys: Set<string>,
  ownAccountKeys: Set<string>
): MonthlyPoint[] {
  const map = new Map<string, { income: number; spend: number; essentialSpend: number }>()
  for (const t of txns) {
    const key = monthKey(toDate(t.date))
    const m = map.get(key) ?? { income: 0, spend: 0, essentialSpend: 0 }
    if (t.direction === 'credit') {
      // Only genuine income counts toward the month's "money in" — one-off
      // personal transfers are money received, but not income.
      if (incomeKeys.has(normalizeCounterparty(t))) m.income += t.amount
    } else {
      const base = classify(t)
      // Transfers to savings/investments and to the customer's own account are
      // internal movement, not spending.
      const internal =
        base === 'savings_transfer' || base === 'investment' || ownAccountKeys.has(normalizeCounterparty(t))
      if (!internal) {
        m.spend += t.amount
        if (resolveCategory(t, base).essential) m.essentialSpend += t.amount
      }
    }
    map.set(key, m)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, m]) => ({
      month,
      income: round2(m.income),
      spend: round2(m.spend),
      essentialSpend: round2(m.essentialSpend),
      net: round2(m.income - m.spend),
      surplusAfterEssentials: round2(m.income - m.essentialSpend),
    }))
}

/**
 * A deterministic, plain-English read of the whole profile. No model involved:
 * every clause is a template over the sub-scores and cashflow, so the words can
 * never disagree with the numbers on the page.
 */
function buildSummary(p: {
  income: IncomeProfile
  expenses: ExpenseProfile
  subScores: SubScore[]
  source: ProfileContext['source']
}): string {
  const ratingOf = (key: string) => p.subScores.find((s) => s.key === key)?.rating ?? 'medium'
  const word = (r: string) => (r === 'strong' ? 'strong' : r === 'limited' ? 'limited' : 'moderate')

  // Income clause.
  const stable =
    p.income.consistency === 'very_consistent' || p.income.consistency === 'consistent'
  const charNoun: Record<string, string> = {
    employment: 'employment income',
    self_employed: 'self-employed income',
    gig: 'gig and freelance income',
    benefits: 'benefits income',
    mixed: 'income from mixed sources',
    unclear: 'income that still needs context',
  }
  const incomeClause =
    p.income.averageMonthlyIncome > 0
      ? `${stable ? 'stable' : 'variable'} ${charNoun[p.income.primaryCharacter] ?? 'income'}`
      : 'no clearly identified regular income'

  // Payment reliability clause.
  const payR = ratingOf('essentialPaymentConsistency')
  const payClause =
    payR === 'strong'
      ? 'consistent, on-time essential bill payments'
      : payR === 'moderate'
        ? 'generally reliable essential bill payments'
        : 'some gaps in essential bill payments'

  // Affordability clause.
  const surplus = p.income.averageMonthlyIncome - p.expenses.averageMonthlySpend
  const essentialSpend = p.expenses.averageMonthlySpend * p.expenses.essentialShare
  const surplusAfterEssentials = p.income.averageMonthlyIncome - essentialSpend
  const affR = ratingOf('affordability')
  const surplusDescriptor =
    surplus <= 0
      ? 'the monthly surplus is negative'
      : surplusAfterEssentials <= 0
        ? 'there is little left after essential costs'
        : affR === 'strong'
          ? 'there is a comfortable surplus after essential costs'
          : 'the surplus after essential costs is positive but limited'
  const affordabilityClause = `Affordability is ${word(affR)} because ${surplusDescriptor}.`

  // Evidence clause.
  const evR = ratingOf('evidenceConfidence')
  const evidenceBasis =
    p.source === 'open_banking'
      ? 'the profile is based on verified Open Banking data'
      : p.source === 'statement_upload'
        ? 'the profile is based on an uploaded statement rather than Open Banking'
        : 'the profile is based on sample data'
  const evidenceClause = `Evidence confidence is ${word(evR)} because ${evidenceBasis}.`

  return `This profile shows ${incomeClause} with ${payClause}. ${affordabilityClause} ${evidenceClause}`
}

function computePeriod(txns: NormalizedTxn[]): Period {
  if (txns.length === 0) {
    return { from: '', to: '', months: 0, transactionCount: 0 }
  }
  const from = txns[0]!.date
  const to = txns[txns.length - 1]!.date
  const months = new Set(txns.map((t) => monthKey(toDate(t.date)))).size
  return { from, to, months, transactionCount: txns.length }
}

/**
 * Fraction of transaction value the engine actually understands.
 *
 * A keyword match is not the only way to understand money: a stable recurring
 * stream is understood by its *shape* even when the description is opaque
 * (a salary as "BACS CREDIT ACME LTD"). What genuinely remains unclear is
 * one-off, unclassified value — and regular payments to an individual, whose
 * nature we can't infer. Those are exactly what we ask the customer about, so
 * clarity rises as questions get answered.
 */
function computeClarity(
  txns: NormalizedTxn[],
  resolvedIds: Set<string>,
  recurringKeys: Set<string>
): number {
  let total = 0
  let clear = 0
  const familyResolved = resolvedIds.has('expense:family_support')

  txns.forEach((t, i) => {
    total += t.amount
    if (classify(t) !== 'other') {
      clear += t.amount
      return
    }
    if (resolvedIds.has(`txn:${t.date}:${Math.round(t.amount)}:${i}`)) {
      clear += t.amount
      return
    }

    const key = normalizeCounterparty(t)
    if (!recurringKeys.has(key)) return // one-off, unclassified → genuinely unclear

    // Recurring, but paid to an individual: we know the rhythm, not the reason.
    const ambiguousPerson = t.direction === 'debit' && looksLikePerson(key) && !familyResolved
    if (!ambiguousPerson) clear += t.amount
  })

  return total > 0 ? clear / total : 1
}

function deriveStability(
  income: InsightProfile['income'],
  expenses: InsightProfile['expenses'],
  payment: InsightProfile['paymentBehaviour'],
  commitments: InsightProfile['commitments'],
  months: number
): StabilitySignals {
  const rent = commitments.find((c) => c.category === 'rent_payment')
  return {
    stableIncome:
      income.averageMonthlyIncome > 0 &&
      (income.consistency === 'very_consistent' || income.consistency === 'consistent'),
    rentNeverMissed: Boolean(rent && rent.missedCount === 0),
    billsPaidOnTime: payment.onTimeRatio >= 0.95 && payment.returnedPayments <= 1,
    positiveMonthlySurplus: income.averageMonthlyIncome > expenses.averageMonthlySpend,
    noOverdraftDependency: (payment.overdraftMonths ?? 0) === 0,
    noRecurringFailedPayments: payment.returnedPayments <= 1 && payment.missedPayments <= 1,
    monthsOfHistory: months,
  }
}
