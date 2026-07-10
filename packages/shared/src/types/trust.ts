export type TrustTier = 'A' | 'B' | 'C' | 'D' | 'E'

export type ScorecardType = 'general' | 'tenant' | 'lender_readiness' | 'telecom'

export type FraudRisk = 'pass' | 'review' | 'high_risk'

export type IdentityConfidence = 'low' | 'medium' | 'high'

export interface TrustSubScores {
  profileCompleteness: number      // 0–100
  verificationStrength: number     // 0–100
  identityConfidence: number       // 0–100
  incomeStability: number          // 0–100
  affordability: number            // 0–100
  rentalReliability: number        // 0–100
  financialStability: number       // 0–100
}

export interface ReasonCode {
  code: string
  dimension: keyof TrustSubScores
  sentiment: 'positive' | 'negative' | 'neutral'
  message: string
  weight: number
}

export interface TrustScore {
  id: string
  userId: string
  scorecardType: ScorecardType
  scoreVersion: string
  subScores: TrustSubScores
  overallScore: number
  overallTier: TrustTier
  fraudRisk: FraudRisk
  reasonCodes: ReasonCode[]
  computedAt: string
}

export interface TrustFeatures {
  // Banking signals
  monthsOfBankHistory: number
  connectedAccountsCount: number
  averageMonthlyIncome: number
  incomeVolatility: number           // coefficient of variation
  recurringSalaryDetected: boolean
  recurringRentDetected: boolean
  averageEndMonthBalance: number
  savingsMonthsBuffer: number
  rentToIncomeRatio: number
  overdraftDependency: number        // fraction of months with overdraft
  missedPaymentIndicators: number

  // Identity signals
  accountHolderNameMatch: boolean
  addressMatchConfidence: number     // 0–1
  documentCount: number
  verifiedSourcesCount: number

  // Document-evidence signals (extracted + matched against the profile, so a
  // document only counts once its contents corroborate the user)
  identityDocumentVerified: boolean  // a readable photo ID whose name matches the profile
  dobVerified: boolean               // an ID whose date of birth matched the profile
  addressDocumentVerified: boolean   // an address document whose address matched the profile
  incomeDocumentVerified: boolean    // a payslip/P60/etc. read as genuine income evidence

  // Profile signals
  profileFieldsComplete: number      // 0–1 fraction
  selfDeclaredOnly: boolean
  openBankingConnected: boolean
  hasUploadedDocuments: boolean

  // Residency signals
  residencyStatus: string | null     // maps to ResidencyStatus enum values
  yearsInUK: number                  // derived from ukMoveDate; 0 if unknown
}

export const TIER_LABELS: Record<TrustTier, string> = {
  A: 'Highly verified and financially stable',
  B: 'Verified and generally reliable',
  C: 'Partially verified with moderate confidence',
  D: 'Limited evidence or inconsistent profile',
  E: 'Insufficient confidence — further review needed',
}

export const TIER_THRESHOLDS: Array<{ tier: TrustTier; minScore: number }> = [
  { tier: 'A', minScore: 80 },
  { tier: 'B', minScore: 65 },
  { tier: 'C', minScore: 50 },
  { tier: 'D', minScore: 35 },
  { tier: 'E', minScore: 0 },
]

export const SCORECARD_WEIGHTS: Record<ScorecardType, TrustSubScores> = {
  general: {
    profileCompleteness: 10,
    verificationStrength: 20,
    identityConfidence: 15,
    incomeStability: 15,
    affordability: 20,
    rentalReliability: 10,
    financialStability: 10,
  },
  tenant: {
    profileCompleteness: 8,
    verificationStrength: 18,
    identityConfidence: 12,
    incomeStability: 15,
    affordability: 22,
    rentalReliability: 18,
    financialStability: 7,
  },
  lender_readiness: {
    profileCompleteness: 8,
    verificationStrength: 15,
    identityConfidence: 12,
    incomeStability: 22,
    affordability: 25,
    rentalReliability: 8,
    financialStability: 10,
  },
  telecom: {
    profileCompleteness: 10,
    verificationStrength: 20,
    identityConfidence: 20,
    incomeStability: 15,
    affordability: 20,
    rentalReliability: 5,
    financialStability: 10,
  },
}
