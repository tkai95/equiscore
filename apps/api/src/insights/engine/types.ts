import type { TransactionCategory } from '@prisma/client'
import type { InferredAccount } from './external-accounts'

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
  /** Which of the user's accounts this belongs to — lets us net out transfers
   *  between two of their own connected accounts. Absent for a single source. */
  accountId?: string | null
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
  /** The actual answer text per question id, for answer-specific reclassification. */
  answers?: Record<string, string>
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
  /** Normalised counterparty key — used to fetch this source's payments. */
  key: string
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
  /** Genuine income annualised (averageMonthlyIncome × 12), net/take-home. */
  netAnnualIncome: number
  /**
   * Average monthly value of inflows we did NOT count as income — one-off or
   * sporadic credits from individuals (money from friends/family, repayments,
   * refunds). Surfaced so the distinction is explicit rather than hidden.
   */
  personalTransfersMonthly: number
  /** Net monthly take-home of the detected salary stream, if any. */
  salaryMonthlyNet: number | null
  /**
   * Estimated gross annual salary implied by the net salary received, grossed
   * up through PAYE + NI. Null unless a salary stream was detected. Estimate.
   */
  estimatedGrossAnnualSalary: number | null
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
  /** Normalised counterparty key — used to fetch this commitment's payments. */
  key: string
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

export type AffordabilityRating = 'comfortable' | 'manageable' | 'stretched' | 'at_risk'

/**
 * Deterministic affordability read from take-home income and real outgoings.
 * All figures are monthly. Income is net (what actually lands in the account),
 * so thresholds are calibrated to take-home, not gross.
 */
export interface AffordabilityProfile {
  monthlyIncome: number // net / take-home
  essentialOutgoings: number // essential spend incl. rent
  discretionarySpend: number
  currentRent: number | null
  debtRepayments: number // loan/credit repayments
  fixedCommitments: number // all recurring commitments
  disposableIncome: number // income − essentials
  surplusAfterAll: number // income − all spend
  ratios: {
    rentToIncome: number | null // 0–1
    debtToIncome: number // 0–1
    commitmentsToIncome: number // 0–1
    essentialsToIncome: number // 0–1
  }
  /** Highest rent this income could sustainably carry (conservative estimate). */
  maxAffordableRent: number
  /** How much more rent they could take on beyond what they pay now. */
  headroomForNewRent: number
  stressTest: {
    incomeDropPct: number
    surplusUnderStress: number
    stillPositive: boolean
    essentialsCovered: boolean
  }
  incomeIsVariable: boolean
  rating: AffordabilityRating
  notes: string[]
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
  /** Deterministic affordability read (ratios, max affordable rent, stress test). */
  affordability: AffordabilityProfile
  /** Other accounts the statement implies the person holds but we can't see. */
  externalAccounts: InferredAccount[]
  /** Money per month moving between the user's own connected accounts (netted
   *  out of income and spending). 0 when only one account is present. */
  internalTransfersMonthly: number
  /** Plain-English, deterministic summary of the whole profile. */
  summary: string
  source: ProfileContext['source']
}
