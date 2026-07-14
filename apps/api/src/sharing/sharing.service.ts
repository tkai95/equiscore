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

type ShareContext = {
  targetType?: string
  targetName?: string
  packType?: 'rental'
  goalId?: string
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
  private monthsUntil(date: Date | null | undefined) {
    if (!date) return null
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 0
    return Math.max(1, Math.ceil(days / 30))
  }

  private async buildRentalSharePack(
    userId: string,
    profile: Awaited<ReturnType<InsightsService['getProfileForUser']>>,
    goalId?: string
  ) {
    const goal = goalId
      ? await db.consumerGoal.findFirst({ where: { id: goalId, userId, type: 'rental' } })
      : await db.consumerGoal.findFirst({
          where: { userId, type: 'rental', status: 'active' },
          orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
        })

    if (!goal) return null

    const targetRent = goal.targetMonthlyRent ?? null
    const monthlyIncome = profile.income.averageMonthlyIncome
    const targetRentToIncome = targetRent && monthlyIncome > 0 ? targetRent / monthlyIncome : null
    const maxAffordableRent = profile.affordability.maxAffordableRent
    const affordabilityHeadroom =
      targetRent != null && maxAffordableRent > 0 ? maxAffordableRent - targetRent : null
    const estimatedUpfrontCash = targetRent != null ? Math.round(targetRent * 2.5) : null
    const depositAvailable = goal.depositAvailable ?? 0
    const upfrontCashGap =
      estimatedUpfrontCash != null ? Math.max(0, estimatedUpfrontCash - depositAvailable) : null
    const monthsRemaining = this.monthsUntil(goal.moveDate)
    const monthlyFundingRequired =
      upfrontCashGap != null && monthsRemaining != null && monthsRemaining > 0
        ? Math.ceil(upfrontCashGap / monthsRemaining)
        : null

    const missing: string[] = []
    const watchouts: string[] = []
    const strengths: string[] = []

    if (targetRent == null) missing.push('Target monthly rent has not been supplied.')
    if (!goal.moveDate) missing.push('Expected move date has not been supplied.')
    if (monthlyIncome <= 0) missing.push('Verified income is not visible in the current evidence.')

    if (targetRentToIncome != null && targetRentToIncome <= 0.35) {
      strengths.push('Target rent appears within a typical rent-to-income range.')
    } else if (targetRentToIncome != null) {
      watchouts.push('Target rent may be high compared with verified monthly income.')
    }

    if (affordabilityHeadroom != null && affordabilityHeadroom >= 0) {
      strengths.push('Target rent is within the current estimated sustainable rent range.')
    } else if (affordabilityHeadroom != null) {
      watchouts.push('Target rent is above the current estimated sustainable rent range.')
    }

    if (profile.paymentBehaviour.rentPaidConsistently || profile.stability.rentNeverMissed) {
      strengths.push('Rent or rent-like payments appear consistent.')
    } else {
      watchouts.push('Direct rent-payment reliability evidence is limited or not detected.')
    }

    if (upfrontCashGap != null && upfrontCashGap === 0) {
      strengths.push('Declared upfront cash appears to cover the planning estimate.')
    } else if (upfrontCashGap != null) {
      watchouts.push(
        'Declared upfront cash may not yet cover deposit, first month and moving buffer.'
      )
    }

    const status =
      profile.period.transactionCount === 0 || missing.length > 0
        ? 'needs_detail'
        : watchouts.length > 0
          ? 'ready_with_conditions'
          : 'ready'

    return {
      type: 'rental' as const,
      createdFromGoalId: goal.id,
      goal: {
        title: goal.title ?? goal.label ?? 'Rent a home',
        targetMonthlyRent: targetRent,
        moveDate: goal.moveDate?.toISOString() ?? null,
        applicationMode: goal.applicationMode ?? 'unknown',
        depositAvailable,
        notes: goal.notes,
      },
      readiness: {
        status,
        headline:
          status === 'ready'
            ? 'Rental pack looks ready to review'
            : status === 'ready_with_conditions'
              ? 'Rental pack is reviewable with context'
              : 'Rental pack needs more detail',
        strengths,
        watchouts,
        missing,
      },
      metrics: {
        targetRentToIncome,
        maxAffordableRent,
        affordabilityHeadroom,
        estimatedUpfrontCash,
        upfrontCashGap,
        monthsRemaining,
        monthlyFundingRequired,
      },
      assumptions: [
        'Upfront cash is estimated as 2.5x monthly rent for planning only.',
        'Sustainable rent is estimated from connected income, commitments and surplus.',
        'This pack is evidence for review and is not a guarantee of tenancy acceptance.',
      ],
    }
  }

  private async buildRecipientInsight(userId: string, context?: ShareContext) {
    try {
      const p = await this.insights.getProfileForUser(userId)
      if (p.period.transactionCount === 0) return null
      const stability = p.stability as unknown as Record<string, boolean | number>
      const snapshot = {
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

      if (context?.packType === 'rental') {
        return {
          ...snapshot,
          sharePack: await this.buildRentalSharePack(userId, p, context.goalId),
        }
      }

      return snapshot
    } catch {
      return null
    }
  }

  async createShareLink(userId: string, trustScoreId: string, context: ShareContext = {}) {
    const score = await db.trustScore.findFirst({
      where: { id: trustScoreId, userId },
    })
    if (!score) throw new NotFoundException('Score not found')

    const token = randomBytes(24).toString('base64url')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS)

    // Freeze the recipient insight at share time. A share link is a point-in-time
    // snapshot: whatever the applicant's evidence shows NOW is what the recipient
    // sees for the life of this link, regardless of later changes. To share an
    // updated picture, the applicant creates a new link.
    const insightSnapshot = await this.buildRecipientInsight(userId, context)

    const link = await db.sharedProfile.create({
      data: {
        userId,
        trustScoreId,
        shareToken: token,
        expiresAt,
        targetType: context.targetType,
        targetName: context.targetName,
        insightSnapshot: insightSnapshot ?? undefined,
      },
    })

    await db.userProfile.updateMany({
      where: { userId, profileStage: { not: 'complete' } },
      data: { profileStage: 'complete' },
    })

    this.audit.log(userId, 'share_link.created', {
      shareLinkId: link.id,
      targetType: context.targetType,
      targetName: context.targetName,
      packType: context.packType,
      goalId: context.goalId,
    })

    return link
  }

  async getMyShareLinks(userId: string) {
    return db.sharedProfile.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        trustScore: { select: { overallTier: true, overallScore: true, computedAt: true } },
      },
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
          include: {
            profile: { select: { fullName: true, employmentType: true, nationality: true } },
          },
        },
      },
    })

    if (!shared) throw new NotFoundException('Profile not found')
    if (shared.revokedAt)
      throw new ForbiddenException('The applicant has revoked access to this profile')
    if (shared.expiresAt < new Date()) throw new ForbiddenException('This share link has expired')

    // The score frozen at share time — the exact TrustScore the applicant chose
    // to share, NOT their latest. The link is a snapshot; the applicant reshares
    // to publish an updated score.
    const score = await db.trustScore.findFirst({
      where: { id: shared.trustScoreId, userId: shared.userId },
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

    // Use the insight frozen at share time. Fall back to a live build only for
    // links created before snapshots existed, so old links keep working.
    const insight =
      (shared.insightSnapshot as Awaited<ReturnType<typeof this.buildRecipientInsight>>) ??
      (await this.buildRecipientInsight(shared.userId))

    // Coverage caveat — tells a recipient the picture may be partial without
    // leaking the applicant's specific hidden accounts/liabilities. Reuses the
    // same signal the score already carries so the two never disagree.
    const scoreReasonCodes = (score.reasonCodes as Array<{ code: string }> | null) ?? []
    const partialPicture = scoreReasonCodes.some((r) => r.code === 'PARTIAL_ACCOUNT_COVERAGE')
    const coverage = {
      partialPicture,
      note: partialPicture
        ? 'This profile is based on one connected account. Some activity suggests the applicant holds other accounts that are not included here.'
        : null,
    }

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
      coverage,
      insight,
    }
  }
}
