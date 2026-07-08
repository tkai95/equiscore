import type { NormalizedTxn, ProfileContext, InsightProfile, StabilitySignals, Period } from './types'
import { detectRecurringStreams } from './recurrence'
import { analyzeIncome } from './income'
import { analyzeExpenses } from './expenses'
import { analyzeCommitments } from './commitments'
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

  const creditStreams = detectRecurringStreams(txns, 'credit')
  const debitStreams = detectRecurringStreams(txns, 'debit')
  const recurringKeys = new Set([...creditStreams, ...debitStreams].map((s) => s.key))

  const income = analyzeIncome(txns, creditStreams, resolvedIds)
  const expenses = analyzeExpenses(txns, resolvedIds, months)
  const { commitments, paymentBehaviour } = analyzeCommitments(debitStreams, txns)
  const integrity = checkBalanceContinuity(txns)
  const risk = detectRisk(txns, recurringKeys, paymentBehaviour.overdraftMonths, resolvedIds, integrity)

  const transactionClarity = computeClarity(txns, resolvedIds, recurringKeys)
  const questions = generateQuestions({ income, expenses, unusual: risk.unusual, debitStreams, resolvedIds })
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
    source: ctx.source,
  }
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
