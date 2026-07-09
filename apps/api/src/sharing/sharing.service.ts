import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { randomBytes } from 'crypto'
import { AuditService } from '../audit/audit.service'
import { ScoringService } from '../scoring/scoring.service'
import { InsightsService } from '../insights/insights.service'
import { deriveScoreStatus, isCurrent, statusMessage } from '../scoring/score-status'

const SHARE_TTL_DAYS = 30

// Recipient-safe strengths: a curated subset of the stability signals.
const STRENGTH_LABELS: Record<string, string> = {
  stableIncome: 'Stable monthly income',
  rentNeverMissed: 'Rent paid consistently',
  billsPaidOnTime: 'Essential bills paid on time',
  positiveMonthlySurplus: 'Positive monthly surplus',
  noOverdraftDependency: 'No overdraft dependency',
  noRecurringFailedPayments: 'No recurring failed payments',
}

@Injectable()
export class SharingService {
  constructor(
    private readonly audit: AuditService,
    private readonly scoringService: ScoringService,
    private readonly insights: InsightsService
  ) {}

  /**
   * A curated, landlord-facing slice of the deterministic insight profile:
   * affordability and payment reliability, the things a letting decision turns
   * on. Deliberately excludes the spending breakdown, merchants, and raw
   * transactions — those stay private to the applicant.
   */
  private async buildRecipientInsight(userId: string) {
    try {
      const p = await this.insights.getProfileForUser(userId)
      if (p.period.transactionCount === 0) return null
      const stability = p.stability as unknown as Record<string, boolean | number>
      return {
        monthsOfHistory: p.period.months,
        income: {
          monthlyAverage: p.income.averageMonthlyIncome,
          character: p.income.primaryCharacter,
          consistency: p.income.consistency,
          recurringSalaryDetected: p.income.recurringSalaryDetected,
        },
        affordability: {
          rating: p.affordability.rating,
          currentRent: p.affordability.currentRent,
          rentToIncome: p.affordability.ratios.rentToIncome,
          disposableIncome: p.affordability.disposableIncome,
          surplusAfterAll: p.affordability.surplusAfterAll,
          maxAffordableRent: p.affordability.maxAffordableRent,
          stressTest: p.affordability.stressTest,
          notes: p.affordability.notes,
        },
        reliability: {
          rentPaidConsistently: p.paymentBehaviour.rentPaidConsistently,
          onTimeRatio: p.paymentBehaviour.onTimeRatio,
          returnedPayments: p.paymentBehaviour.returnedPayments,
          missedPayments: p.paymentBehaviour.missedPayments,
        },
        strengths: Object.entries(STRENGTH_LABELS)
          .filter(([key]) => stability[key] === true)
          .map(([, label]) => label),
        contextClear: p.risk.level === 'low' && p.unusual.length === 0,
        clearedTypologies: p.risk.clearedTypologies,
      }
    } catch {
      return null
    }
  }

  async createShareLink(userId: string, trustScoreId: string, targetType?: string, targetName?: string) {
    const score = await db.trustScore.findFirst({
      where: { id: trustScoreId, userId },
    })
    if (!score) throw new NotFoundException('Score not found')

    const token = randomBytes(24).toString('base64url')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS)

    const link = await db.sharedProfile.create({
      data: {
        userId,
        trustScoreId,
        shareToken: token,
        expiresAt,
        targetType,
        targetName,
      },
    })

    await db.userProfile.updateMany({
      where: { userId, profileStage: { not: 'complete' } },
      data: { profileStage: 'complete' },
    })

    this.audit.log(userId, 'share_link.created', {
      shareLinkId: link.id,
      targetType,
      targetName,
    })

    return link
  }

  async getMyShareLinks(userId: string) {
    return db.sharedProfile.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { trustScore: { select: { overallTier: true, overallScore: true, computedAt: true } } },
    })
  }

  async revokeShareLink(userId: string, shareId: string) {
    const link = await db.sharedProfile.findFirst({ where: { id: shareId, userId } })
    if (!link) throw new NotFoundException('Share link not found')

    const revoked = await db.sharedProfile.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    })

    this.audit.log(userId, 'share_link.revoked', { shareLinkId: shareId })

    return revoked
  }

  /**
   * Resolve a share token to a recipient-facing profile.
   *
   * A grant points at the *applicant*, not at a frozen score. We always render
   * their latest snapshot and evaluate its evidence live. This is what closes
   * the hole where someone could connect a bank, score well, share the link,
   * then disconnect — the recompute on disconnect means the latest score can no
   * longer be backed by that bank, so there is nothing stale left to serve.
   *
   * `trustScoreId` on the grant is kept purely as an audit record of what was
   * current at the moment of sharing. It is never rendered.
   *
   * Note that link expiry (access security) and score expiry (evidence
   * freshness) are different things: an expired *link* is refused, an expired
   * *score* is shown and clearly marked.
   */
  async getPublicProfile(token: string, ipAddress?: string) {
    const shared = await db.sharedProfile.findUnique({
      where: { shareToken: token },
      include: {
        user: {
          include: { profile: { select: { fullName: true, employmentType: true, nationality: true } } },
        },
      },
    })

    if (!shared) throw new NotFoundException('Profile not found')
    if (shared.revokedAt) throw new ForbiddenException('The applicant has revoked access to this profile')
    if (shared.expiresAt < new Date()) throw new ForbiddenException('This share link has expired')

    const score = await db.trustScore.findFirst({
      where: { userId: shared.userId },
      orderBy: { computedAt: 'desc' },
    })
    if (!score) throw new NotFoundException('This applicant does not have a score yet')

    const manifestIntact = await this.scoringService.verifyEvidenceIntact(
      shared.userId,
      score.evidenceManifest
    )
    // Tolerates scores written before freshness tracking existed.
    const { financialDataAsOf, validUntil } = await this.scoringService.resolveFreshness(
      shared.userId,
      score
    )
    const status = deriveScoreStatus({
      financialDataAsOf,
      validUntil,
      manifestIntact,
      now: new Date(),
    })

    const insight = await this.buildRecipientInsight(shared.userId)

    await db.sharedProfile.update({
      where: { id: shared.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    })

    this.audit.log(
      shared.userId,
      'share_link.viewed',
      { shareLinkId: shared.id, targetType: shared.targetType, scoreId: score.id, status },
      ipAddress
    )

    // Safe partner-facing view — no PII beyond what a decision needs, and never
    // a score presented as current when it is not.
    return {
      applicantName: shared.user.profile?.fullName,
      status,
      isCurrent: isCurrent(status),
      statusMessage: statusMessage(status),
      trustTier: score.overallTier,
      overallScore: score.overallScore,
      verificationStrength: score.verificationStrengthScore,
      incomeConfidence: score.incomeStabilityScore,
      affordabilityScore: score.affordabilityScore,
      rentalReliability: score.rentalReliabilityScore,
      identityConfidence: score.identityConfidenceScore,
      fraudRisk: score.fraudRisk,
      reasonCodes: score.reasonCodes,
      computedAt: score.computedAt,
      financialDataAsOf,
      validUntil,
      expiresAt: shared.expiresAt,
      insight,
    }
  }
}
