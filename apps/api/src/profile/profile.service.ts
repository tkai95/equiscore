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
    const updated = await db.userProfile.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        dob: data.dob ? new Date(data.dob) : undefined,
        nationality: data.nationality,
        residencyStatus: data.residencyStatus,
        employmentType: data.employmentType,
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

  private finiteNumber(value: number | null | undefined): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }
}
