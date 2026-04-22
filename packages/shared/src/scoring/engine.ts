import type {
  TrustFeatures,
  TrustScore,
  TrustSubScores,
  TrustTier,
  ScorecardType,
  ReasonCode,
  FraudRisk,
} from '../types/trust'
import { SCORECARD_WEIGHTS, TIER_THRESHOLDS } from '../types/trust'
import {
  scoreProfileCompleteness,
  scoreVerificationStrength,
  scoreIdentityConfidence,
  scoreIncomeStability,
  scoreAffordability,
  scoreRentalReliability,
  scoreFinancialStability,
} from './scorecards'

export const SCORE_VERSION = '1.0.0'

export interface ScoringInput {
  userId: string
  scorecardType: ScorecardType
  features: TrustFeatures
}

export function computeTrustScore(input: ScoringInput): Omit<TrustScore, 'id'> {
  const { userId, scorecardType, features } = input
  const weights = SCORECARD_WEIGHTS[scorecardType]

  const completeness = scoreProfileCompleteness(features)
  const verification = scoreVerificationStrength(features)
  const identity = scoreIdentityConfidence(features)
  const income = scoreIncomeStability(features)
  const affordability = scoreAffordability(features)
  const rental = scoreRentalReliability(features)
  const financial = scoreFinancialStability(features)

  const subScores: TrustSubScores = {
    profileCompleteness: completeness.score,
    verificationStrength: verification.score,
    identityConfidence: identity.score,
    incomeStability: income.score,
    affordability: affordability.score,
    rentalReliability: rental.score,
    financialStability: financial.score,
  }

  const overallScore = Math.round(
    Object.entries(subScores).reduce((acc, [key, value]) => {
      const weight = weights[key as keyof TrustSubScores] / 100
      return acc + value * weight
    }, 0)
  )

  const overallTier = deriveTier(overallScore)

  const allReasonCodes: ReasonCode[] = [
    ...completeness.reasonCodes,
    ...verification.reasonCodes,
    ...identity.reasonCodes,
    ...income.reasonCodes,
    ...affordability.reasonCodes,
    ...rental.reasonCodes,
    ...financial.reasonCodes,
  ]

  // Deduplicate reason codes by code string
  const seen = new Set<string>()
  const reasonCodes = allReasonCodes.filter((rc) => {
    if (seen.has(rc.code)) return false
    seen.add(rc.code)
    return true
  })

  const fraudRisk = deriveFraudRisk(features)

  return {
    userId,
    scorecardType,
    scoreVersion: SCORE_VERSION,
    subScores,
    overallScore,
    overallTier,
    fraudRisk,
    reasonCodes,
    computedAt: new Date().toISOString(),
  }
}

function deriveTier(score: number): TrustTier {
  for (const { tier, minScore } of TIER_THRESHOLDS) {
    if (score >= minScore) return tier
  }
  return 'E'
}

function deriveFraudRisk(features: TrustFeatures): FraudRisk {
  let riskScore = 0

  if (!features.accountHolderNameMatch && features.openBankingConnected) {
    riskScore += 30
  }
  if (features.selfDeclaredOnly && features.profileFieldsComplete > 0.9) {
    riskScore += 10
  }
  if (features.documentCount === 0 && features.openBankingConnected === false) {
    riskScore += 10
  }
  if (features.incomeVolatility > 0.8 && features.averageMonthlyIncome > 0) {
    riskScore += 10
  }

  if (riskScore >= 30) return 'high_risk'
  if (riskScore >= 10) return 'review'
  return 'pass'
}
