import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import type { UpdateProfileData } from '@equiscore/shared'
import { AuditService } from '../audit/audit.service'
import { OnboardingDto } from './onboarding.dto'

@Injectable()
export class ProfileService {
  constructor(private readonly audit: AuditService) {}
  async getProfile(userId: string) {
    const profile = await db.userProfile.findUnique({
      where: { userId },
    })
    if (!profile) throw new NotFoundException('Profile not found')
    return profile
  }

  async ensureProfile(userId: string) {
    return db.userProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, profileStage: 'created' },
    })
  }

  async completeOnboarding(userId: string, data: OnboardingDto) {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const monthlyIncomeDeclared = this.finiteNumber(data.monthlyIncomeDeclared)
    const monthlyRentDeclared = this.finiteNumber(data.monthlyRentDeclared)
    const employmentType = data.employmentType as never | undefined

    // Derive a full name from the two components for backcompat with anything
    // still reading the legacy fullName column.
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()

    return db.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId },
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
          fullName,
          dob: new Date(data.dob),
          residencyStatus: data.residencyStatus as never,
          ukMoveDate: data.ukMoveDate ? new Date(data.ukMoveDate) : undefined,
          employmentType: data.employmentType as never,
          monthlyIncomeDeclared,
          monthlyRentDeclared,
          profileStage: 'profile_building',
        },
        create: {
          userId,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName,
          dob: new Date(data.dob),
          residencyStatus: data.residencyStatus as never,
          ukMoveDate: data.ukMoveDate ? new Date(data.ukMoveDate) : undefined,
          employmentType,
          monthlyIncomeDeclared,
          monthlyRentDeclared,
          profileStage: 'profile_building',
        },
      })

      // Upsert current address
      await tx.userAddress.updateMany({
        where: { userId, isCurrent: true },
        data: { isCurrent: false },
      })

      await tx.userAddress.create({
        data: {
          userId,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          postcode: data.postcode,
          country: 'GB',
          fromDate: new Date(),
          isCurrent: true,
        },
      })

      // Upsert employment profile
      await tx.employmentProfile.updateMany({
        where: { userId, isCurrent: true },
        data: { isCurrent: false },
      })

      if (employmentType && employmentType !== 'unemployed') {
        await tx.employmentProfile.create({
          data: {
            userId,
            employmentType,
            employerName: data.employerName,
            jobTitle: data.jobTitle,
            monthlyIncomeDeclared,
            payFrequency: data.payFrequency as never,
            isCurrent: true,
          },
        })
      }

      if (monthlyRentDeclared && monthlyRentDeclared > 0) {
        await tx.rentalProfile.create({
          data: {
            userId,
            monthlyRentDeclared,
            landlordName: data.landlordName,
            tenancyStartDate: data.tenancyStartDate ? new Date(data.tenancyStartDate) : undefined,
            isCurrent: true,
          },
        })
      }

      this.audit.log(userId, 'profile.onboarding_completed')
      return profile
    })
  }

  async getAddresses(userId: string) {
    return db.userAddress.findMany({
      where: { userId },
      orderBy: { fromDate: 'desc' },
    })
  }

  async getEmployment(userId: string) {
    return db.employmentProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getRentalProfile(userId: string) {
    return db.rentalProfile.findFirst({
      where: { userId, isCurrent: true },
    })
  }

  async updateProfile(userId: string, data: UpdateProfileData) {
    // If firstName/lastName are provided, derive fullName from them for backcompat.
    const fullName =
      data.firstName || data.lastName
        ? [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || undefined
        : data.fullName

    const updated = await db.userProfile.update({
      where: { userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        dob: data.dob ? new Date(data.dob) : undefined,
        nationality: data.nationality,
        residencyStatus: data.residencyStatus as never,
        employmentType: data.employmentType as never,
        monthlyIncomeDeclared: data.monthlyIncomeDeclared,
        monthlyRentDeclared: data.monthlyRentDeclared,
      },
    })
    this.audit.log(userId, 'profile.updated', { fields: Object.keys(data) })
    return updated
  }

  async updateProfileStage(userId: string, stage: string) {
    return db.userProfile.update({
      where: { userId },
      data: { profileStage: stage as never },
    })
  }

  /**
   * Export all user data as a JSON object (UK GDPR right of access / portability).
   * Gathers profile, addresses, employment, rental, documents, bank accounts +
   * transactions, trust scores, share links, audit events, and goals.
   */
  async exportUserData(userId: string) {
    const [user, addresses, employment, rental, documents, trustScores, sharedProfiles, auditEvents, goals] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      db.userAddress.findMany({ where: { userId } }),
      db.employmentProfile.findMany({ where: { userId } }),
      db.rentalProfile.findMany({ where: { userId } }),
      db.uploadedDocument.findMany({ where: { userId }, select: { id: true, documentType: true, verificationStatus: true, uploadedAt: true, reviewedAt: true } }),
      db.trustScore.findMany({ where: { userId }, orderBy: { computedAt: 'desc' } }),
      db.sharedProfile.findMany({ where: { userId }, select: { id: true, targetType: true, expiresAt: true, viewCount: true, createdAt: true, revokedAt: true } }),
      db.auditEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      db.consumerGoal.findMany({ where: { userId } }),
    ])

    // Bank data (connections, accounts, transactions)
    const bankConnections = await db.bankConnection.findMany({
      where: { userId },
      include: {
        bankAccounts: {
          include: {
            transactions: { orderBy: { bookedAt: 'desc' }, take: 500 },
          },
        },
      },
    })

    return {
      exportedAt: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            profile: user.profile,
          }
        : null,
      addresses,
      employment,
      rental,
      documents,
      bankConnections: bankConnections.map((c) => ({
        ...c,
        accessToken: undefined,
        refreshToken: undefined,
      })),
      trustScores,
      sharedProfiles,
      auditEvents,
      goals,
    }
  }

  /**
   * Permanently delete the user and all their data.
   * - Revokes all share links first (so recipients can't access stale data).
   * - Hard-deletes the User row (cascades to all owned data per schema).
   * - The Clerk user is deleted separately from the frontend via Clerk's
   *   user.delete() after this succeeds.
   * - Audit logs the deletion intent before the user row is gone.
   */
  async deleteAccount(userId: string) {
    // Revoke all active share links before deletion
    await db.sharedProfile.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    // Log the deletion intent (the audit event is user-scoped, so it cascades
    // — we log it, it's deleted with the user, but the intent is captured).
    this.audit.log(userId, 'account.deleted')

    // Hard-delete the user — cascades to profile, addresses, employment,
    // bank connections/accounts/transactions, documents, trust scores, share
    // links, audit events, goals, etc. per the schema's onDelete: Cascade.
    await db.user.delete({ where: { id: userId } })
  }

  private finiteNumber(value: number | null | undefined): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }
}
