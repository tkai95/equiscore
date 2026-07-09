import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { computeTrustScore, SCORE_VERSION } from '@equiscore/shared'
import type { ScorecardType, TrustFeatures } from '@equiscore/shared'
import { FeatureEngineeringService } from './feature-engineering.service'
import { AuditService } from '../audit/audit.service'
import {
  computeFinancialDataAsOf,
  computeValidUntil,
  type EvidenceManifestEntry,
} from './score-status'

@Injectable()
export class ScoringService {
  constructor(
    private readonly featureEngineering: FeatureEngineeringService,
    private readonly audit: AuditService
  ) {}

  async recompute(userId: string, scorecardType: ScorecardType = 'general') {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const features = await this.featureEngineering.computeFeatures(userId)
    const result = computeTrustScore({ userId, scorecardType, features })

    // Capture what backed this score *while the evidence still exists*. Neither
    // the manifest nor the feature snapshot can be reconstructed after deletion.
    const evidenceManifest = await this.buildEvidenceManifest(userId)
    const financialDataAsOf = computeFinancialDataAsOf(evidenceManifest)
    const validUntil = computeValidUntil(financialDataAsOf)

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
        financialDataAsOf,
        validUntil,
        evidenceManifest: evidenceManifest as never,
        featureSnapshot: this.buildFeatureSnapshot(features) as never,
        computedAt: new Date(result.computedAt),
      },
    })

    await db.userProfile.updateMany({
      where: { userId, profileStage: { notIn: ['scored', 'complete'] } },
      data: { profileStage: 'scored' },
    })

    this.audit.log(userId, 'score.computed', {
      scoreId: score.id,
      scorecardType,
      overallScore: score.overallScore,
      overallTier: score.overallTier,
      financialDataAsOf,
      validUntil,
      evidenceSources: evidenceManifest.length,
    })

    return score
  }

  /**
   * The evidence backing a score, with the latest date each source covers.
   *
   * Coverage — not upload time — is what anchors freshness, so we take the most
   * recent transaction date per connection rather than `lastSyncedAt`. A sync
   * that returns nothing new does not make a stale score fresh again.
   */
  private async buildEvidenceManifest(userId: string): Promise<EvidenceManifestEntry[]> {
    const [connections, documents] = await Promise.all([
      db.bankConnection.findMany({
        where: { userId, connectionStatus: 'active' },
        select: { id: true },
      }),
      db.uploadedDocument.findMany({
        where: { userId, verificationStatus: { not: 'rejected' } },
        select: { id: true },
      }),
    ])

    const manifest: EvidenceManifestEntry[] = []

    for (const connection of connections) {
      const latest = await db.bankTransaction.aggregate({
        where: { bankAccount: { bankConnectionId: connection.id } },
        _max: { bookedAt: true },
      })
      manifest.push({
        evidenceSourceId: connection.id,
        type: 'open_banking',
        coverageEnd: latest._max.bookedAt?.toISOString() ?? null,
        statusAtComputation: 'active',
      })
    }

    for (const document of documents) {
      manifest.push({
        evidenceSourceId: document.id,
        type: 'document',
        coverageEnd: null, // identity documents do not anchor financial freshness
        statusAtComputation: 'active',
      })
    }

    return manifest
  }

  /**
   * A non-raw summary of the features behind the score, so a historical score
   * stays explainable once its underlying transactions have been deleted.
   */
  private buildFeatureSnapshot(features: TrustFeatures) {
    return {
      incomeAverageMonthly: Math.round(features.averageMonthlyIncome),
      incomeVolatilityBand: bandForVolatility(features.incomeVolatility),
      recurringSalaryDetected: features.recurringSalaryDetected,
      recurringRentDetected: features.recurringRentDetected,
      expenseAverageMonthly: null,
      affordabilityBand: bandForBalance(features.averageEndMonthBalance),
      savingsMonthsBuffer: Math.round(features.savingsMonthsBuffer * 10) / 10,
      overdraftDependency: Math.round(features.overdraftDependency * 100) / 100,
      missedPaymentIndicators: features.missedPaymentIndicators,
      evidenceCoverageMonths: features.monthsOfBankHistory,
      documentCount: features.documentCount,
      verifiedSourcesCount: features.verifiedSourcesCount,
    }
  }

  /**
   * Freshness for a score, tolerating rows written before freshness was tracked.
   *
   * A legacy score has no `financialDataAsOf`, which would otherwise make it
   * read as "not financially verified" even for a user with a live bank
   * connection. Rather than backfilling every historical row, derive the date
   * from the evidence the user holds *now*. The stored columns fill themselves
   * on the next recompute.
   */
  async resolveFreshness(
    userId: string,
    score: { financialDataAsOf: Date | null; validUntil: Date | null }
  ): Promise<{ financialDataAsOf: Date | null; validUntil: Date | null }> {
    if (score.financialDataAsOf) {
      return { financialDataAsOf: score.financialDataAsOf, validUntil: score.validUntil }
    }

    const latest = await db.bankTransaction.aggregate({
      where: { bankAccount: { bankConnection: { userId, connectionStatus: 'active' } } },
      _max: { bookedAt: true },
    })
    const financialDataAsOf = latest._max.bookedAt ?? null
    return { financialDataAsOf, validUntil: computeValidUntil(financialDataAsOf) }
  }

  /**
   * Verify every source named in a score's manifest still exists and is active.
   * A false result means a recompute failed or never ran — the score must not
   * then be presented as current.
   */
  async verifyEvidenceIntact(userId: string, manifest: unknown): Promise<boolean> {
    if (!Array.isArray(manifest)) return true // legacy scores predate the manifest
    const entries = manifest as EvidenceManifestEntry[]
    if (entries.length === 0) return true

    for (const entry of entries) {
      if (entry.type === 'open_banking') {
        const count = await db.bankConnection.count({
          where: { id: entry.evidenceSourceId, userId, connectionStatus: 'active' },
        })
        if (count === 0) return false
      } else {
        const count = await db.uploadedDocument.count({
          where: { id: entry.evidenceSourceId, userId },
        })
        if (count === 0) return false
      }
    }
    return true
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

function bandForVolatility(cv: number): 'low' | 'moderate' | 'high' {
  if (cv <= 0.2) return 'low'
  if (cv <= 0.5) return 'moderate'
  return 'high'
}

function bandForBalance(balance: number): 'comfortable' | 'tight' | 'negative' {
  if (balance < 0) return 'negative'
  if (balance < 250) return 'tight'
  return 'comfortable'
}
