import type {
  SubScore,
  Rating,
  OverallScore,
  Tier,
  IncomeProfile,
  ExpenseProfile,
  PaymentBehaviour,
  Commitment,
  RiskAssessment,
  StatementIntegrity,
  ProfileContext,
} from './types'
import { clamp } from './util'

/**
 * Six customer-facing sub-scores — a re-projection of the deterministic
 * signals, so a lower score always comes with a reason, never a black box.
 */

const WEIGHTS: Record<string, number> = {
  incomeStability: 20,
  essentialPaymentConsistency: 22, // strongest trust signal
  affordability: 18,
  transactionClarity: 12,
  evidenceConfidence: 16,
  riskFlags: 12,
}

const TIER_THRESHOLDS: Array<{ tier: Tier; min: number }> = [
  { tier: 'A', min: 80 },
  { tier: 'B', min: 65 },
  { tier: 'C', min: 50 },
  { tier: 'D', min: 35 },
  { tier: 'E', min: 0 },
]

// Strength language only. "Verified" is reserved for the evidence line, which is
// source-aware (Open Banking vs uploaded statement) — a tier label must never
// imply bank verification for statement-only evidence.
const TIER_LABELS: Record<Tier, string> = {
  A: 'Strong financial profile',
  B: 'Solid, generally reliable profile',
  C: 'Moderate profile with partial evidence',
  D: 'Limited or inconsistent profile',
  E: 'Insufficient evidence for confidence',
}

export interface SubScoreInput {
  income: IncomeProfile
  expenses: ExpenseProfile
  paymentBehaviour: PaymentBehaviour
  commitments: Commitment[]
  risk: RiskAssessment
  integrity: StatementIntegrity
  transactionClarity: number // 0–1
  monthsOfHistory: number
  source: ProfileContext['source']
  nameMatch: boolean
  pendingQuestionCount: number
}

export function computeSubScores(input: SubScoreInput): {
  subScores: SubScore[]
  overall: OverallScore
} {
  const income = scoreIncomeStability(input)
  const payments = scoreEssentialPaymentConsistency(input)
  const affordability = scoreAffordability(input)
  const clarity = clamp(Math.round(input.transactionClarity * 100), 0, 100)
  const evidence = scoreEvidenceConfidence(input)
  const risk = clamp(100 - input.risk.score, 0, 100)

  const subScores: SubScore[] = [
    { key: 'incomeStability', label: 'Income stability', score: income, rating: rate(income) },
    { key: 'essentialPaymentConsistency', label: 'Essential payment consistency', score: payments, rating: rate(payments) },
    { key: 'affordability', label: 'Affordability', score: affordability, rating: rate(affordability) },
    { key: 'transactionClarity', label: 'Transaction clarity', score: clarity, rating: rate(clarity) },
    { key: 'evidenceConfidence', label: 'Evidence confidence', score: evidence, rating: rate(evidence) },
    // Kept keyed 'riskFlags' for the weighting; surfaced to users as "Context"
    // (a high score means nothing needs explaining, not that risk is "strong").
    { key: 'riskFlags', label: 'Context', score: risk, rating: rate(risk) },
  ]

  const overallScore = Math.round(
    subScores.reduce((acc, s) => acc + s.score * (WEIGHTS[s.key]! / 100), 0)
  )
  const tier = deriveTier(overallScore)

  return {
    subScores,
    overall: {
      score: overallScore,
      tier,
      label: TIER_LABELS[tier],
      limitingFactors: limitingFactors(input, subScores),
    },
  }
}

function scoreIncomeStability(i: SubScoreInput): number {
  let s = 0
  if (i.income.recurringSalaryDetected) s += 45
  else if (i.income.averageMonthlyIncome > 0 && i.income.volatility < 0.35) s += 25
  if (i.income.volatility <= 0.1) s += 25
  else if (i.income.volatility <= 0.35) s += 10
  else if (i.income.volatility > 0.6) s -= 10
  if (i.monthsOfHistory >= 6) s += 20
  else if (i.monthsOfHistory >= 3) s += 10
  if (i.income.averageMonthlyIncome > 0) s += 10
  return clamp(s, 0, 100)
}

function scoreEssentialPaymentConsistency(i: SubScoreInput): number {
  if (i.commitments.length === 0) return 30 // nothing to evidence yet
  let s = i.paymentBehaviour.onTimeRatio * 70
  if (i.paymentBehaviour.rentPaidConsistently) s += 15
  if (i.paymentBehaviour.returnedPayments === 0 && i.paymentBehaviour.missedPayments === 0) s += 15
  else s -= Math.min(20, (i.paymentBehaviour.returnedPayments + i.paymentBehaviour.missedPayments) * 5)
  return clamp(Math.round(s), 0, 100)
}

function scoreAffordability(i: SubScoreInput): number {
  let s = 0
  const income = i.income.averageMonthlyIncome
  const surplus = income - i.expenses.averageMonthlySpend
  const surplusRatio = income > 0 ? surplus / income : 0
  if (surplusRatio >= 0.2) s += 35
  else if (surplusRatio >= 0.05) s += 20
  else if (surplusRatio >= 0) s += 10
  else s -= 10

  const rent = i.commitments.find((c) => c.category === 'rent_payment')
  if (rent && income > 0) {
    const rentToIncome = rent.amount / income
    if (rentToIncome < 0.4) s += 25
    else if (rentToIncome < 0.6) s += 10
    else s -= 15
  }

  if (i.paymentBehaviour.overdraftMonths === 0) s += 20
  else if (i.paymentBehaviour.overdraftMonths !== null && i.paymentBehaviour.overdraftMonths <= 1) s += 10
  else if (i.paymentBehaviour.overdraftMonths !== null && i.paymentBehaviour.overdraftMonths >= 3) s -= 15

  return clamp(s, 0, 100)
}

function scoreEvidenceConfidence(i: SubScoreInput): number {
  // Statement-only evidence is trusted, but sits below cryptographically
  // verified Open Banking — the assurance gap made explicit.
  let s = i.source === 'open_banking' ? 60 : i.source === 'statement_upload' ? 45 : 40
  if (i.monthsOfHistory >= 6) s += 20
  else if (i.monthsOfHistory >= 3) s += 10
  if (i.nameMatch) s += 15

  // A statement whose ledger reconciles closes much of the gap to Open Banking.
  // One that doesn't cannot be relied on at all.
  if (i.source !== 'open_banking' && i.integrity.hasBalances) {
    if (i.integrity.continuous) s += 10
    else return clamp(Math.min(s, 25), 0, 100)
  }
  return clamp(s, 0, 100)
}

function rate(score: number): Rating {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'moderate'
  if (score >= 40) return 'medium'
  return 'limited'
}

function deriveTier(score: number): Tier {
  for (const { tier, min } of TIER_THRESHOLDS) if (score >= min) return tier
  return 'E'
}

function limitingFactors(i: SubScoreInput, subs: SubScore[]): string[] {
  const out: string[] = []
  const by = (k: string) => subs.find((s) => s.key === k)!
  if (i.integrity.hasBalances && !i.integrity.continuous)
    out.push('The uploaded statement does not reconcile and cannot be relied on')
  if (i.source === 'statement_upload' && by('evidenceConfidence').rating !== 'strong')
    out.push('Evidence is statement-only, not yet bank-verified')
  if (i.pendingQuestionCount > 0)
    out.push(`${i.pendingQuestionCount} transaction${i.pendingQuestionCount > 1 ? 's' : ''} still need context`)
  if (!i.income.recurringSalaryDetected && i.income.primaryCharacter !== 'employment')
    out.push('No verified recurring salary detected')
  if (by('affordability').rating === 'medium' || by('affordability').rating === 'limited')
    out.push('Limited monthly surplus after essentials')
  if (i.risk.level !== 'low')
    out.push('Some transactions warrant review')
  return out.slice(0, 4)
}
