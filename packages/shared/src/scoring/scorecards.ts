import type { TrustFeatures } from '../types/trust'
import { REASON_CODES } from './reason-codes'
import type { ReasonCode } from '../types/trust'

export interface ScorecardResult {
  score: number
  reasonCodes: ReasonCode[]
}

// ─── Profile Completeness ─────────────────────────────────────────────────────

export function scoreProfileCompleteness(features: TrustFeatures): ScorecardResult {
  const base = Math.min(100, Math.round(features.profileFieldsComplete * 100))
  // Partial account coverage caps completeness — the picture is incomplete while
  // the evidence points to accounts we can't see. A modest hold-back (this
  // dimension carries the least weight), enough to surface the prompt to connect.
  if (features.partialAccountCoverage) {
    return { score: Math.min(base, 85), reasonCodes: [REASON_CODES.PARTIAL_ACCOUNT_COVERAGE] }
  }
  return { score: base, reasonCodes: [] }
}

// ─── Verification Strength ────────────────────────────────────────────────────

export function scoreVerificationStrength(features: TrustFeatures): ScorecardResult {
  const codes: ReasonCode[] = []
  let total = 0

  if (features.openBankingConnected) {
    total += 25
    codes.push(REASON_CODES.OB_CONNECTED)
  }

  if (features.monthsOfBankHistory >= 6) {
    total += 10
    codes.push(REASON_CODES.TXN_HISTORY_6M)
  } else if (features.monthsOfBankHistory >= 3) {
    total += 5
    codes.push(REASON_CODES.TXN_HISTORY_3M)
  }

  if (features.accountHolderNameMatch) {
    total += 15
    codes.push(REASON_CODES.NAME_MATCH)
  }

  // A verified photo ID (contents read and name matched) — not merely an upload.
  if (features.identityDocumentVerified) {
    total += 10
    codes.push(REASON_CODES.DOCUMENT_UPLOADED)
  }

  if (features.addressMatchConfidence > 0.7) {
    total += 10
    codes.push(REASON_CODES.ADDRESS_VERIFIED)
  }

  // A document was uploaded but hasn't verified against the profile yet.
  if (
    features.hasUploadedDocuments &&
    !features.identityDocumentVerified &&
    features.addressMatchConfidence <= 0.7
  ) {
    codes.push(REASON_CODES.DOCUMENT_UNVERIFIED)
  }

  if (features.connectedAccountsCount >= 1) {
    total += 5
  }

  // Cap self-declared only profiles
  if (features.selfDeclaredOnly) {
    total = Math.min(total, 35)
    codes.push(REASON_CODES.SELF_DECLARED_ONLY)
  }

  return { score: Math.min(100, total), reasonCodes: codes }
}

// ─── Identity Confidence ──────────────────────────────────────────────────────

export function scoreIdentityConfidence(features: TrustFeatures): ScorecardResult {
  const codes: ReasonCode[] = []
  let total = 0

  // A verified government photo ID whose name matched the profile.
  if (features.identityDocumentVerified) {
    total += 25
    codes.push(REASON_CODES.IDENTITY_DOCUMENT)
  }

  // Date of birth independently confirmed by that ID.
  if (features.dobVerified) {
    total += 10
    codes.push(REASON_CODES.DOB_VERIFIED)
  }

  if (features.addressMatchConfidence > 0.8) {
    total += 20
    codes.push(REASON_CODES.ADDRESS_CONSISTENT)
  } else if (features.addressMatchConfidence > 0.5) {
    total += 10
  }

  if (features.accountHolderNameMatch) {
    total += 30
    codes.push(REASON_CODES.PROFILE_CONSISTENT)
  } else if (features.openBankingConnected && !features.accountHolderNameMatch) {
    total -= 20
    codes.push(REASON_CODES.NAME_MISMATCH)
  }

  if (features.verifiedSourcesCount >= 2) {
    total += 20
    codes.push(REASON_CODES.ADDRESS_CONSISTENT)
  }

  // Residency status — informative signal, not a penalty for any legitimate status
  if (features.residencyStatus) {
    const residencyBonus: Record<string, number> = {
      british_citizen: 10,
      settled_status: 8,
      pre_settled_status: 5,
      student_visa: 5,
      work_visa: 5,
      refugee: 4,
      asylum_seeker: 4,
      other: 3,
    }
    total += residencyBonus[features.residencyStatus] ?? 3
    codes.push(REASON_CODES.RESIDENCY_STATUS_PROVIDED)
  }

  // Time in UK — longer history = stronger identity anchor
  if (features.yearsInUK >= 3) {
    total += 10
    codes.push(REASON_CODES.ESTABLISHED_UK_RESIDENT)
  } else if (features.yearsInUK > 0 && features.yearsInUK < 1) {
    codes.push(REASON_CODES.RECENT_UK_ARRIVAL)
  }

  return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes }
}

// ─── Income Stability ─────────────────────────────────────────────────────────

export function scoreIncomeStability(features: TrustFeatures): ScorecardResult {
  const codes: ReasonCode[] = []
  let total = 0

  // Every positive income signal below requires actual income evidence. Without
  // it, a zeroed volatility (0 < 0.2) would otherwise read as "low variance" and
  // award points for having no data at all.
  const hasIncomeData = features.averageMonthlyIncome > 0

  if (features.recurringSalaryDetected) {
    total += 30
    codes.push(REASON_CODES.SALARY_RECURRING)
  }

  // Gig income consistency (variance < 0.3 = fairly consistent)
  if (!features.recurringSalaryDetected && features.averageMonthlyIncome > 0 && features.incomeVolatility < 0.5) {
    total += 20
    codes.push(REASON_CODES.GIG_INCOME_CONSISTENT)
  }

  if (hasIncomeData && features.incomeVolatility < 0.2) {
    total += 20
    codes.push(REASON_CODES.LOW_INCOME_VARIANCE)
  } else if (features.incomeVolatility > 0.5) {
    total -= 10
    codes.push(REASON_CODES.HIGH_INCOME_VARIANCE)
  }

  if (features.averageMonthlyIncome > 0 && features.monthsOfBankHistory >= 3) {
    total += 15
    codes.push(REASON_CODES.NET_INFLOW_POSITIVE)
  }

  if (features.averageMonthlyIncome === 0 && !features.recurringSalaryDetected) {
    codes.push(REASON_CODES.NO_RECURRING_INCOME)
  }

  // A payslip / P60 / employment document that corroborates income.
  if (features.incomeDocumentVerified) {
    total += 10
    codes.push(REASON_CODES.INCOME_DOC_VERIFIED)
  }

  // Up to +5 for multiple income sources
  if (features.verifiedSourcesCount > 1) {
    total += 5
  }

  return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes }
}

// ─── Affordability ────────────────────────────────────────────────────────────

export function scoreAffordability(features: TrustFeatures): ScorecardResult {
  const codes: ReasonCode[] = []
  let total = 0

  // "Clean record" signals (no overdraft use, no returned payments) are only
  // meaningful when we have transactions to observe. Without bank history, a
  // zeroed feature is the absence of evidence, not a good record.
  const hasBankData = features.monthsOfBankHistory > 0

  // Rent-to-income ratio (healthy = < 40%)
  if (features.rentToIncomeRatio > 0 && features.rentToIncomeRatio < 0.4) {
    total += 25
    codes.push(REASON_CODES.RENT_INCOME_HEALTHY)
  } else if (features.rentToIncomeRatio >= 0.4 && features.rentToIncomeRatio < 0.6) {
    total += 10
  } else if (features.rentToIncomeRatio >= 0.6) {
    total -= 15
    codes.push(REASON_CODES.HIGH_RENT_RATIO)
  }

  if (features.averageEndMonthBalance > 0) {
    total += 25
    codes.push(REASON_CODES.RESIDUAL_BALANCE_HEALTHY)
  }

  if (features.savingsMonthsBuffer >= 2) {
    total += 20
    codes.push(REASON_CODES.SAVINGS_BUFFER)
  }

  if (hasBankData && features.overdraftDependency < 0.1) {
    total += 15
    codes.push(REASON_CODES.LOW_OVERDRAFT)
  } else if (features.overdraftDependency > 0.3) {
    total -= 15
    codes.push(REASON_CODES.OVERDRAFT_DEPENDENT)
  }

  if (hasBankData && features.missedPaymentIndicators === 0) {
    total += 15
    codes.push(REASON_CODES.NO_RETURNED_PAYMENTS)
  }

  return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes }
}

// ─── Rental Reliability ───────────────────────────────────────────────────────

export function scoreRentalReliability(features: TrustFeatures): ScorecardResult {
  const codes: ReasonCode[] = []
  let total = 0

  if (features.recurringRentDetected) {
    total += 25
    codes.push(REASON_CODES.RENT_RECURRING)

    // These bonuses only apply if rent is detected
    total += 20
    codes.push(REASON_CODES.RENT_AMOUNT_CONSISTENT)

    total += 20
    codes.push(REASON_CODES.RENT_TIMING_CONSISTENT)
  } else {
    codes.push(REASON_CODES.NO_RENT_EVIDENCE)
  }

  if (features.monthsOfBankHistory >= 6 && features.recurringRentDetected) {
    total += 20
    codes.push(REASON_CODES.RENT_HISTORY_6M)
  }

  // A verified address document (e.g. a tenancy agreement) supports the rental claim.
  if (features.addressDocumentVerified) {
    total += 15
    codes.push(REASON_CODES.TENANCY_DOCUMENT)
  }

  return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes }
}

// ─── Financial Stability ──────────────────────────────────────────────────────

export function scoreFinancialStability(features: TrustFeatures): ScorecardResult {
  const codes: ReasonCode[] = []
  let total = 0

  // As with affordability, steadiness signals need observed transactions —
  // otherwise zeroed volatility and a zeroed missed-payment count would award
  // points to a profile with no financial evidence at all.
  const hasBankData = features.monthsOfBankHistory > 0

  if (features.savingsMonthsBuffer > 0) {
    total += 25
    codes.push(REASON_CODES.SAVINGS_TREND_UP)
  }

  if (features.monthsOfBankHistory >= 6 && features.averageMonthlyIncome > 0) {
    total += 25
    codes.push(REASON_CODES.INCOME_CONTINUITY)
  }

  if (hasBankData && features.incomeVolatility < 0.25) {
    total += 20
    codes.push(REASON_CODES.LOW_SPEND_VOLATILITY)
  }

  if (hasBankData && features.missedPaymentIndicators === 0 && features.overdraftDependency < 0.15) {
    total += 20
    codes.push(REASON_CODES.DEBT_SERVICING_STABLE)
  }

  if (features.averageEndMonthBalance > 0 && features.savingsMonthsBuffer >= 1) {
    total += 10
    codes.push(REASON_CODES.STRONG_CASHFLOW)
  }

  return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes }
}
