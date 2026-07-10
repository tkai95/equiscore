import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { computeTrustScore, SCORE_VERSION } from '@equiscore/shared'
import type { ScorecardType, TrustFeatures, TrustTier } from '@equiscore/shared'
import { FeatureEngineeringService, type EvidenceExclusion } from './feature-engineering.service'
import { AuditService } from '../audit/audit.service'
import {
  computeFinancialDataAsOf,
  computeValidUntil,
  deriveScoreStatus,
  isCurrent,
  type EvidenceManifestEntry,
  type ScoreDisplayStatus,
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
   * Deterministic "how to raise your score" engine. For each fixable gap we
   * re-run computeTrustScore with that one thing improved and report the actual
   * point gain — so an action says "+9, C to B", never a vague nudge. Only the
   * verification/identity/completeness levers are here; financial behaviour is
   * the applicant's situation, and flagged-transaction explanations live on the
   * Insights page.
   */
  async getImprovements(userId: string, scorecardType: ScorecardType = 'general') {
    const features = await this.featureEngineering.computeFeatures(userId)
    const current = computeTrustScore({ userId, scorecardType, features })

    const gainFrom = (mod: Partial<TrustFeatures>): number => {
      const s = computeTrustScore({ userId, scorecardType, features: { ...features, ...mod } })
      return Math.max(0, s.overallScore - current.overallScore)
    }
    const tierAt = (mod: Partial<TrustFeatures>): TrustTier =>
      computeTrustScore({ userId, scorecardType, features: { ...features, ...mod } }).overallTier

    const improvements: Array<{
      id: string
      title: string
      detail: string
      href: string
      estimatedGain: number | null
      reachesTier: TrustTier | null
      dimension: string
    }> = []
    const hasBank = features.connectedAccountsCount > 0

    if (!hasBank) {
      improvements.push({
        id: 'add_bank',
        title: 'Add your bank data',
        detail:
          'Connect a bank via Open Banking or upload a statement. This is the single biggest step — it lets us verify your income, rent, and payment reliability.',
        href: '/dashboard/connections',
        estimatedGain: null,
        reachesTier: null,
        dimension: 'Verification Strength',
      })
    } else {
      if (!features.accountHolderNameMatch) {
        const mod: Partial<TrustFeatures> = { accountHolderNameMatch: true }
        const g = gainFrom(mod)
        if (g > 0)
          improvements.push({
            id: 'name_match',
            title: 'Match your name to your bank account',
            detail:
              'The name on your bank data does not match your profile. Set your profile name to your legal name as it appears at the bank, or reconnect the correct account.',
            href: '/dashboard/profile',
            estimatedGain: g,
            reachesTier: tierAt(mod),
            dimension: 'Identity Confidence',
          })
      }
      if (!features.openBankingConnected) {
        const mod: Partial<TrustFeatures> = {
          openBankingConnected: true,
          verifiedSourcesCount: features.verifiedSourcesCount + 1,
        }
        const g = gainFrom(mod)
        if (g > 0)
          improvements.push({
            id: 'open_banking',
            title: 'Connect your bank via Open Banking',
            detail:
              'A live Open Banking connection is stronger evidence than an uploaded statement, and keeps your score current automatically.',
            href: '/dashboard/connections',
            estimatedGain: g,
            reachesTier: tierAt(mod),
            dimension: 'Verification Strength',
          })
      }
      if (!features.identityDocumentVerified) {
        // The realistic outcome of uploading a matching photo ID: we read it and
        // confirm the name (and date of birth) against the profile.
        const mod: Partial<TrustFeatures> = {
          identityDocumentVerified: true,
          dobVerified: true,
          verifiedSourcesCount: features.verifiedSourcesCount + 1,
        }
        const g = gainFrom(mod)
        if (g > 0)
          improvements.push({
            id: 'documents',
            title: 'Verify your identity with a photo ID',
            detail:
              'Upload a passport or driving licence — we read it and confirm your name and date of birth against your profile, raising your identity and verification scores.',
            href: '/dashboard/documents',
            estimatedGain: g,
            reachesTier: tierAt(mod),
            dimension: 'Identity Confidence',
          })
      }
      if (features.profileFieldsComplete < 1) {
        const mod: Partial<TrustFeatures> = { profileFieldsComplete: 1 }
        const g = gainFrom(mod)
        if (g > 0)
          improvements.push({
            id: 'profile',
            title: 'Complete your profile',
            detail:
              'Add the remaining details — date of birth, nationality, residency status, and employment type.',
            href: '/dashboard/profile',
            estimatedGain: g,
            reachesTier: tierAt(mod),
            dimension: 'Profile Completeness',
          })
      }
    }

    improvements.sort((a, b) => (b.estimatedGain ?? 999) - (a.estimatedGain ?? 999))
    return { currentScore: current.overallScore, currentTier: current.overallTier, improvements }
  }

  /**
   * The evidence backing a score, with the latest date each source covers.
   *
   * Coverage — not upload time — is what anchors freshness, so we take the most
   * recent transaction date per connection rather than `lastSyncedAt`. A sync
   * that returns nothing new does not make a stale score fresh again.
   */
  private async buildEvidenceManifest(
    userId: string,
    exclude?: EvidenceExclusion
  ): Promise<EvidenceManifestEntry[]> {
    const excludeConnections =
      exclude?.connectionIds && exclude.connectionIds.length > 0
        ? { id: { notIn: exclude.connectionIds } }
        : {}
    const excludeDocuments =
      exclude?.documentIds && exclude.documentIds.length > 0
        ? { id: { notIn: exclude.documentIds } }
        : {}

    const [connections, documents] = await Promise.all([
      db.bankConnection.findMany({
        where: { userId, connectionStatus: 'active', ...excludeConnections },
        select: { id: true },
      }),
      db.uploadedDocument.findMany({
        where: { userId, verificationStatus: { not: 'rejected' }, ...excludeDocuments },
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

  /**
   * Latest score with its freshness resolved — what the applicant should see
   * about their own profile, mirroring the recipient view. Legacy scores get a
   * fallback freshness date from current evidence rather than reading as stale.
   */
  async getLatestScoreWithStatus(userId: string, scorecardType: ScorecardType = 'general') {
    const score = await this.getLatestScore(userId, scorecardType)
    if (!score) return null

    const manifestIntact = await this.verifyEvidenceIntact(userId, score.evidenceManifest)
    const { financialDataAsOf, validUntil } = await this.resolveFreshness(userId, score)
    const status = deriveScoreStatus({ financialDataAsOf, validUntil, manifestIntact, now: new Date() })

    return { ...score, financialDataAsOf, validUntil, status, isCurrent: isCurrent(status) }
  }

  /**
   * Dry-run: what the score would be if a piece of evidence were removed.
   *
   * Recomputes features both with and without the excluded source and returns
   * the delta — WITHOUT persisting anything. This is what turns an irreversible
   * disconnect or deletion into an informed choice ("B/78 → C/59"). Because the
   * scoring engine is a pure function, this is cheap and exact.
   */
  async previewImpact(
    userId: string,
    exclude: EvidenceExclusion,
    scorecardType: ScorecardType = 'general'
  ): Promise<{
    current: { overallScore: number; overallTier: TrustTier; status: ScoreDisplayStatus }
    projected: { overallScore: number; overallTier: TrustTier; status: ScoreDisplayStatus }
    delta: number
  }> {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    // Both scores computed live from the same moment, so the delta is internally
    // consistent even if the stored score predates recent evidence changes.
    const [currentFeatures, projectedFeatures] = await Promise.all([
      this.featureEngineering.computeFeatures(userId),
      this.featureEngineering.computeFeatures(userId, exclude),
    ])

    const current = computeTrustScore({ userId, scorecardType, features: currentFeatures })
    const projected = computeTrustScore({ userId, scorecardType, features: projectedFeatures })

    const [currentManifest, projectedManifest] = await Promise.all([
      this.buildEvidenceManifest(userId),
      this.buildEvidenceManifest(userId, exclude),
    ])

    return {
      current: {
        overallScore: current.overallScore,
        overallTier: current.overallTier,
        status: this.statusFromManifest(currentManifest),
      },
      projected: {
        overallScore: projected.overallScore,
        overallTier: projected.overallTier,
        status: this.statusFromManifest(projectedManifest),
      },
      delta: projected.overallScore - current.overallScore,
    }
  }

  private statusFromManifest(manifest: EvidenceManifestEntry[]): ScoreDisplayStatus {
    const financialDataAsOf = computeFinancialDataAsOf(manifest)
    return deriveScoreStatus({
      financialDataAsOf,
      validUntil: computeValidUntil(financialDataAsOf),
      manifestIntact: true,
      now: new Date(),
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
