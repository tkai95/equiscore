/**
 * EquiScore Compass — web mirror of the API response contract
 * (apps/api/src/compass/compass.types.ts). Kept in sync by hand; the API is the
 * source of truth.
 */

export type CompassEffort = 'low' | 'medium' | 'high'
export type CompassPriority = 'low' | 'medium' | 'high'

export interface CompassMoneyFlow {
  id: string
  from: string
  to: string
  monthly: number
  kind: 'income' | 'internal' | 'savings' | 'bills' | 'discretionary' | 'personal'
  confidence: 'high' | 'medium'
  detail: string
}

export interface CompassAccount {
  label: string
  type: string
  role: string
  connected: boolean
  monthlyIn: number | null
  monthlyOut: number | null
  confidence: 'high' | 'medium'
  note: string
}

export interface CompassCommitment {
  name: string
  key: string
  category: string
  amount: number
  cadence: string
  monthlyEquivalent: number
  typicalDayOfMonth: number | null
  consistency: string
  occurrences: number
  monthsCovered: number
  missedCount: number
  returnedCount: number
  essential: boolean
  nextExpected: { date: string; inDays: number } | null
}

export interface CompassOpportunity {
  id: string
  type: string
  title: string
  description: string
  reason: string
  estimatedSavingLow: number | null
  estimatedSavingHigh: number | null
  estimatedAnnualLow: number | null
  estimatedAnnualHigh: number | null
  effort: CompassEffort
  priority: CompassPriority
  linkedKey: string | null
}

export interface CompassMonthlyReview {
  month: string
  label: string
  isComplete: boolean
  income: number
  spend: number
  essentialSpend: number
  net: number
  surplusAfterEssentials: number
  vsAverage: { income: number; spend: number; net: number }
  headline: string
}

export interface CompassPayload {
  hasData: boolean
  asOf: string | null
  status: string | null
  source: string
  monthsOfHistory: number

  overview: {
    monthlyIncome: number
    monthlySpend: number
    monthlySurplus: number
    monthlySavings: number
    internalTransfersMonthly: number
    personalTransfersMonthly: number
    topCommitments: string[]
    topOpportunities: string[]
    profileImpact: string[]
  }

  moneyMap: {
    externalIncome: number
    personalTransfers: number
    internalTransfers: number
    toSavings: number
    toEssentials: number
    toDiscretionary: number
    retained: number
    accounts: CompassAccount[]
    flows: CompassMoneyFlow[]
    note: string
  }

  income: {
    monthlyIncome: number
    netAnnualIncome: number
    estimatedGrossAnnualSalary: number | null
    salaryMonthlyNet: number | null
    personalTransfersMonthly: number
    volatility: number
    consistency: string
    character: string
    characterTags: string[]
    recurringSalaryDetected: boolean
    paydayOfMonth: number | null
    sources: Array<{
      name: string
      key: string
      category: string
      monthlyAverage: number
      monthsPresent: number
      pendingConfirmation: boolean
    }>
    narrative: string
  }

  spending: {
    averageMonthlySpend: number
    essentialShare: number
    categories: Array<{
      key: string
      label: string
      monthlyAverage: number
      total: number
      share: number
      essential: boolean
      unconfirmed: boolean
    }>
    narrative: string
  }

  commitments: CompassCommitment[]
  paymentBehaviour: {
    onTimeRatio: number
    returnedPayments: number
    missedPayments: number
    overdraftMonths: number | null
    rentPaidConsistently: boolean
    narrative: string
  }

  resilience: {
    monthlyIncome: number
    essentialOutgoings: number
    discretionarySpend: number
    surplusAfterAll: number
    savingsRate: number
    monthlySavings: number
    emergencyBuffer: {
      monthsCovered: number | null
      liquidBalance: number | null
      basis: 'balance' | 'unavailable'
      estimate: boolean
      target: number
      note: string
    }
    ratios: {
      rentToIncome: number | null
      debtToIncome: number
      commitmentsToIncome: number
      essentialsToIncome: number
      savingsToIncome: number
    }
    stressTest: {
      incomeDropPct: number
      surplusUnderStress: number
      stillPositive: boolean
      essentialsCovered: boolean
    }
    currentRent: number | null
    maxAffordableRent: number
    headroomForNewRent: number
    rating: string
    bestMonth: { month: string; label: string; surplus: number } | null
    tightestMonth: { month: string; label: string; surplus: number } | null
    stability: {
      stableIncome: boolean
      rentNeverMissed: boolean
      billsPaidOnTime: boolean
      positiveMonthlySurplus: boolean
      noOverdraftDependency: boolean
      noRecurringFailedPayments: boolean
      monthsOfHistory: number
    }
    notes: string[]
  }

  monthlyReview: CompassMonthlyReview | null

  impact: {
    overallScore: number | null
    overallTier: string | null
    status: string | null
    reasonCodes: Array<{
      code: string
      dimension: string
      sentiment: string
      message: string
      weight: number
    }>
    improvements: Array<{
      id: string
      title: string
      detail: string
      href: string
      estimatedGain: number | null
      reachesTier: string | null
      dimension: string
    }>
  }

  opportunities: CompassOpportunity[]
}
