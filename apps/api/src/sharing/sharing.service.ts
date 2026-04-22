import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { randomBytes } from 'crypto'

const SHARE_TTL_DAYS = 30

@Injectable()
export class SharingService {
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

    return db.sharedProfile.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    })
  }

  async getPublicProfile(token: string) {
    const shared = await db.sharedProfile.findUnique({
      where: { shareToken: token },
      include: {
        trustScore: true,
        user: {
          include: { profile: { select: { fullName: true, employmentType: true, nationality: true } } },
        },
      },
    })

    if (!shared) throw new NotFoundException('Profile not found')
    if (shared.revokedAt) throw new ForbiddenException('This profile link has been revoked')
    if (shared.expiresAt < new Date()) throw new ForbiddenException('This profile link has expired')

    // Increment view count
    await db.sharedProfile.update({
      where: { id: shared.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    })

    // Return safe partner-facing view (no PII beyond what's needed)
    return {
      applicantName: shared.user.profile?.fullName,
      trustTier: shared.trustScore.overallTier,
      overallScore: shared.trustScore.overallScore,
      verificationStrength: shared.trustScore.verificationStrengthScore,
      incomeConfidence: shared.trustScore.incomeStabilityScore,
      affordabilityScore: shared.trustScore.affordabilityScore,
      rentalReliability: shared.trustScore.rentalReliabilityScore,
      identityConfidence: shared.trustScore.identityConfidenceScore,
      fraudRisk: shared.trustScore.fraudRisk,
      reasonCodes: shared.trustScore.reasonCodes,
      computedAt: shared.trustScore.computedAt,
      expiresAt: shared.expiresAt,
    }
  }
}
