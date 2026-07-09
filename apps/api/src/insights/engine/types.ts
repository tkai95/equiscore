import type { TransactionCategory } from '@prisma/client'

/**
 * Insight-profile engine — types.
 *
 * The engine is deliberately source-agnostic: it consumes a normalized
 * transaction shape that can come from Open Banking, a parsed PDF/CSV
 * statement, or a test fixture. Everything downstream (classification,
 * recurrence detection, sub-scores, questions) is deterministic.
 */

// ─── Input ────────────────────────────────────────────────────────────────────

export interface NormalizedTxn {
  /** ISO date (YYYY-MM-DD) or any Date-parseable string. */
  date: string
  /** Positive magnitude of the transaction. */
  amount: number
  direction: 'credit' | 'debit'
  description: string | null
  merchantName?: string | null
  /** Running balance after this transaction, if the source provides it (statements do). */
  balance?: number | null
}

export interface ProfileContext {
  /** Where the transactions came from — drives evidence-confidence scoring. */
  source: 'open_banking' | 'statement_upload' | 'test'
  /** Name on the account, if known — for name-match / income character. */
  accountHolderName?: string | null
  /** Profile full name, to check against the account holder. */
  profileName?: string | null
  /** Declared monthly rent, if the user gave one (used for rent-to-income). */
  declaredMonthlyRent?: number | null
  /** Answers already given to previously-generated questions, keyed by question id. */
  resolvedQuestionIds?: string[]
}

// ─── Output ───────────────────────────────────────────────────────────────────

export type Consistency = 'very_consistent' | 'consistent' | 'variable' | 'one_off'
export type Cadence = 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly' | 'quarterly' | 'irregular'
export type Rating = 'strong' | 'moderate' | 'medium' | 'limited'
export type Tier = 'A' | 'B' | 'C' | 'D' | 'E'
export type RiskLevel = 'low' | 'low_moderate' | 'moderate' | 'high'

export interface Period {
  from: string
  to: string
  months: number
  transactionCount: number
}

export interface IncomeSource {
  name: string
  category: TransactionCategory
  total: number
  monthlyAverage: number
  monthsPresent: number
  /** Awaiting user confirmation before it counts as regular income. */
  pendingConfirmation: boolean
}

export type IncomeCharacter =
  | 'employment'
  | 'self_employed'
  | 'gig'
  | 'benefits'
  | 'mixed'
  | 'unclear'

export interface IncomeProfile {
  averageMonthlyIncome: number
  /** Coefficient of variation across months (0 = flat, higher = volatile). */
  volatility: number
  consistency: Consistency
  recurringSalaryDetected: boolean
  primaryCharacter: IncomeCharacter
  /** Human-readable descriptors: "employer-based", "paid monthly", "UK-sourced"… */
  characterTags: string[]
  sources: IncomeSource[]
  narrative: string
}

export interface ExpenseCategory {
  key: string
  label: string
  total: number
  monthlyAverage: number
  share: number // 0–1 of total observed spend
  essential: boolean
  /** True when the category's classification is still awaiting user context. */
  unconfirmed: boolean
}

export interface ExpenseProfile {
  averageMonthlySpend: number
  essentialShare: number // 0–1
  hasCreditOrLoanRepayments: boolean
  categories: ExpenseCategory[]
  narrative: string
}

export interface Commitment {
  name: string
  category: TransactionCategory
  amount: number // typical (median) amount
  cadence: Cadence
  /** Median day-of-month the payment lands (1–31); null for non-monthly cadences. */
  typicalDayOfMonth: number | null
  /** Standard deviation of the payment day, in days. */
  dayVariance: number
  consistency: Consistency
  occurrences: number
  monthsCovered: number
  /** Months in the covered window where the payment was expected but missing. */
  missedCount: number
  returnedCount: number
}

export interface PaymentBehaviour {
  onTimeRatio: number // 0–1
  returnedPayments: number
  missedPayments: number
  overdraftMonths: number | null // null when balance data unavailable
  rentPaidConsistently: boolean
  narrative: string
}

export interface StabilitySignals {
  stableIncome: boolean
  rentNeverMissed: boolean
  billsPaidOnTime: boolean
  positiveMonthlySurplus: boolean
  noOverdraftDependency: boolean
  noRecurringFailedPayments: boolean
  monthsOfHistory: number
}

export interface UnusualTransaction {
  id: string
  date: string
  amount: number
  direction: 'credit' | 'debit'
  counterparty: string
  reason: string // why it stood out
  typology: string | null // matched red-flag typology, if any
  context: {
    isolated: boolean
    namedRecipient: boolean
    normalBeforeAfter: boolean
    matchesTypology: boolean
  }
  status: 'pending_context' | 'resolved'
}

export interface FollowUpQuestion {
  id: string
  question: string
  detail: string
  /** Quick-answer chips the UI can offer. */
  options: string[]
  relatedTxnIds: string[]
  clarifies: string // what answering it improves
}

export interface SubScore {
  key: string
  label: string
  score: number // 0–100
  rating: Rating
}

export interface RiskAssessment {
  level: RiskLevel
  score: number // 0–100 (higher = more risk)
  typologies: string[] // matched, if any
  clearedTypologies: string[] // explicitly checked and absent
}

export interface StatementIntegrity {
  hasBalances: boolean
  /** Every row's running balance reconciles with the previous row. */
  continuous: boolean
  checkedRows: number
  breaks: Array<{ date: string; expected: number; actual: number }>
  openingBalance: number | null
  closingBalance: number | null
}

export interface OverallScore {
  score: number // 0–100
  tier: Tier
  label: string
  limitingFactors: string[]
}

/** One calendar month of cashflow, for trend/best-month/surplus diagnostics. */
export interface MonthlyPoint {
  month: string // "YYYY-MM"
  income: number // money in
  spend: number // money out, excluding transfers to savings/investments
  essentialSpend: number // the essential portion of that spend
  net: number // income − spend
  surplusAfterEssentials: number // income − essentialSpend
}

export interface InsightProfile {
  period: Period
  income: IncomeProfile
  expenses: ExpenseProfile
  commitments: Commitment[]
  paymentBehaviour: PaymentBehaviour
  stability: StabilitySignals
  risk: RiskAssessment
  integrity: StatementIntegrity
  unusual: UnusualTransaction[]
  questions: FollowUpQuestion[]
  subScores: SubScore[]
  /** Fraction of transaction value that is confidently classified (0–1). */
  transactionClarity: number
  overall: OverallScore
  /** Per-month cashflow series (oldest → newest). */
  monthly: MonthlyPoint[]
  /** Plain-English, deterministic summary of the whole profile. */
  summary: string
  source: ProfileContext['source']
}
