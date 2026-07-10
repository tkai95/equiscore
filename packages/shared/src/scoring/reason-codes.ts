import type { ReasonCode, TrustSubScores } from '../types/trust'

type Dimension = keyof TrustSubScores

const rc = (
  code: string,
  dimension: Dimension,
  sentiment: ReasonCode['sentiment'],
  message: string,
  weight: number
): ReasonCode => ({ code, dimension, sentiment, message, weight })

export const REASON_CODES = {
  // Verification strength
  OB_CONNECTED: rc('OB_CONNECTED', 'verificationStrength', 'positive', 'Bank account verified via Open Banking', 25),
  TXN_HISTORY_6M: rc('TXN_HISTORY_6M', 'verificationStrength', 'positive', '6+ months of transaction history available', 10),
  TXN_HISTORY_3M: rc('TXN_HISTORY_3M', 'verificationStrength', 'positive', '3+ months of transaction history available', 5),
  NAME_MATCH: rc('NAME_MATCH', 'verificationStrength', 'positive', 'Account holder name matches profile', 15),
  DOCUMENT_UPLOADED: rc('DOCUMENT_UPLOADED', 'verificationStrength', 'positive', 'Identity document verified against your profile', 10),
  ADDRESS_VERIFIED: rc('ADDRESS_VERIFIED', 'verificationStrength', 'positive', 'Address confirmed by a matching document', 10),
  DOCUMENT_UNVERIFIED: rc('DOCUMENT_UNVERIFIED', 'verificationStrength', 'neutral', 'A document is awaiting verification or did not match your profile', 0),
  SELF_DECLARED_ONLY: rc('SELF_DECLARED_ONLY', 'verificationStrength', 'negative', 'Profile currently relies on self-declared information only', 0),

  // Income stability
  SALARY_RECURRING: rc('SALARY_RECURRING', 'incomeStability', 'positive', 'Regular salary income detected over 3+ months', 30),
  GIG_INCOME_CONSISTENT: rc('GIG_INCOME_CONSISTENT', 'incomeStability', 'positive', 'Consistent gig or freelance income detected', 20),
  LOW_INCOME_VARIANCE: rc('LOW_INCOME_VARIANCE', 'incomeStability', 'positive', 'Monthly income is stable with low variance', 20),
  NET_INFLOW_POSITIVE: rc('NET_INFLOW_POSITIVE', 'incomeStability', 'positive', '3+ months of positive net cash inflow', 15),
  HIGH_INCOME_VARIANCE: rc('HIGH_INCOME_VARIANCE', 'incomeStability', 'negative', 'Income pattern is highly variable month to month', -10),
  INCOME_DOC_VERIFIED: rc('INCOME_DOC_VERIFIED', 'incomeStability', 'positive', 'Income corroborated by a payslip, P60 or employment document', 10),
  NO_RECURRING_INCOME: rc('NO_RECURRING_INCOME', 'incomeStability', 'negative', 'No recurring income pattern currently detected', 0),

  // Affordability
  RENT_INCOME_HEALTHY: rc('RENT_INCOME_HEALTHY', 'affordability', 'positive', 'Rent-to-income ratio is within a healthy range', 25),
  RESIDUAL_BALANCE_HEALTHY: rc('RESIDUAL_BALANCE_HEALTHY', 'affordability', 'positive', 'End-of-month balance consistently healthy', 25),
  SAVINGS_BUFFER: rc('SAVINGS_BUFFER', 'affordability', 'positive', 'Savings buffer of 2+ months essential spend detected', 20),
  LOW_OVERDRAFT: rc('LOW_OVERDRAFT', 'affordability', 'positive', 'Minimal reliance on overdraft facilities', 15),
  NO_RETURNED_PAYMENTS: rc('NO_RETURNED_PAYMENTS', 'affordability', 'positive', 'No returned payment pattern detected', 15),
  HIGH_RENT_RATIO: rc('HIGH_RENT_RATIO', 'affordability', 'negative', 'Rent appears high relative to declared income', -15),
  OVERDRAFT_DEPENDENT: rc('OVERDRAFT_DEPENDENT', 'affordability', 'negative', 'Frequent overdraft use suggests financial pressure', -15),

  // Rental reliability
  RENT_RECURRING: rc('RENT_RECURRING', 'rentalReliability', 'positive', 'Recurring rent payment detected in transaction history', 25),
  RENT_AMOUNT_CONSISTENT: rc('RENT_AMOUNT_CONSISTENT', 'rentalReliability', 'positive', 'Rent payment amount is consistent', 20),
  RENT_TIMING_CONSISTENT: rc('RENT_TIMING_CONSISTENT', 'rentalReliability', 'positive', 'Rent payments appear on a regular schedule', 20),
  RENT_HISTORY_6M: rc('RENT_HISTORY_6M', 'rentalReliability', 'positive', '6+ months of rent payment history evidenced', 20),
  TENANCY_DOCUMENT: rc('TENANCY_DOCUMENT', 'rentalReliability', 'positive', 'Tenancy agreement or evidence uploaded', 15),
  NO_RENT_EVIDENCE: rc('NO_RENT_EVIDENCE', 'rentalReliability', 'neutral', 'Rental payment history not yet evidenced — connect a bank account to improve', 0),

  // Financial stability
  SAVINGS_TREND_UP: rc('SAVINGS_TREND_UP', 'financialStability', 'positive', 'Savings balance shows an upward trend', 25),
  INCOME_CONTINUITY: rc('INCOME_CONTINUITY', 'financialStability', 'positive', 'Income sources have been continuous over 6+ months', 25),
  LOW_SPEND_VOLATILITY: rc('LOW_SPEND_VOLATILITY', 'financialStability', 'positive', 'Spending pattern is steady and predictable', 20),
  DEBT_SERVICING_STABLE: rc('DEBT_SERVICING_STABLE', 'financialStability', 'positive', 'Debt repayments are consistent and manageable', 20),
  STRONG_CASHFLOW: rc('STRONG_CASHFLOW', 'financialStability', 'positive', 'Strong overall cash flow resilience detected', 10),

  // Identity confidence
  PROFILE_CONSISTENT: rc('PROFILE_CONSISTENT', 'identityConfidence', 'positive', 'Profile details are internally consistent across sources', 30),
  IDENTITY_DOCUMENT: rc('IDENTITY_DOCUMENT', 'identityConfidence', 'positive', 'Government-issued photo ID verified and matches your profile', 25),
  DOB_VERIFIED: rc('DOB_VERIFIED', 'identityConfidence', 'positive', 'Date of birth confirmed by an identity document', 10),
  ADDRESS_CONSISTENT: rc('ADDRESS_CONSISTENT', 'identityConfidence', 'positive', 'Address information is consistent across sources', 20),
  NAME_MISMATCH: rc('NAME_MISMATCH', 'identityConfidence', 'negative', 'Name on bank account does not fully match profile name', -20),
  RESIDENCY_STATUS_PROVIDED: rc('RESIDENCY_STATUS_PROVIDED', 'identityConfidence', 'positive', 'Residency status is on record', 8),
  ESTABLISHED_UK_RESIDENT: rc('ESTABLISHED_UK_RESIDENT', 'identityConfidence', 'positive', 'Established UK residency history of 3+ years', 10),
  RECENT_UK_ARRIVAL: rc('RECENT_UK_ARRIVAL', 'identityConfidence', 'neutral', 'Recently arrived in the UK — financial history is still being established', 0),
}
