import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { computeTrustScore, SCORE_VERSION } from '@equiscore/shared'
import type { ScorecardType } from '@equiscore/shared'
import { FeatureEngineeringService } from './feature-engineering.service'

@Injectable()
export class ScoringService {
  constructor(private readonly featureEngineering: FeatureEngineeringService) {}

  async recompute(userId: string, scorecardType: ScorecardType = 'general') {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const features = await this.featureEngineering.computeFeatures(userId)
    const result = computeTrustScore({ userId, scorecardType, features })

    const score = await db.trustScore.create({
      data: {
        userId,
        scorecardType,
        scoreVersion: SCORE_VERSION,
        profileCompletenessScore: result.subScores.profileCompleteness,
        verificationStrengthScore: result.subScores.verificationStrength,
        identityConfidenceScore: result.subScores.identityConfidence,
        incomeStabilityScore: result.subScores.incomeStability,
        affordabilityScore: result.subScores.affordability,
        rentalReliabilityScore: result.subScores.rentalReliability,
        financialStabilityScore: result.subScores.financialStability,
        overallScore: result.overallScore,
        overallTier: result.overallTier as never,
        fraudRisk: result.fraudRisk as never,
        reasonCodes: result.reasonCodes as never,
        computedAt: new Date(result.computedAt),
      },
    })

    await db.userProfile.updateMany({
      where: { userId, profileStage: { notIn: ['scored', 'complete'] } },
      data: { profileStage: 'scored' },
    })

    return score
  }

  async getLatestScore(userId: string, scorecardType: ScorecardType = 'general') {
    return db.trustScore.findFirst({
      where: { userId, scorecardType },
      orderBy: { computedAt: 'desc' },
    })
  }

  async getScoreHistory(userId: string, scorecardType: ScorecardType = 'general') {
    return db.trustScore.findMany({
      where: { userId, scorecardType },
      orderBy: { computedAt: 'desc' },
      take: 20,
    })
  }
}
