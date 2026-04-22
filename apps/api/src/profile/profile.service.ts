import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import type { OnboardingData } from '@equiscore/shared'

@Injectable()
export class ProfileService {
  async getProfile(userId: string) {
    const profile = await db.userProfile.findUnique({
      where: { userId },
    })
    if (!profile) throw new NotFoundException('Profile not found')
    return profile
  }

  async completeOnboarding(userId: string, data: OnboardingData) {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    return db.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId },
        update: {
          fullName: data.fullName,
          dob: new Date(data.dob),
          nationality: data.nationality,
          residencyStatus: data.residencyStatus,
          ukMoveDate: data.ukMoveDate ? new Date(data.ukMoveDate) : undefined,
          employmentType: data.employmentType,
          monthlyIncomeDeclared: data.monthlyIncomeDeclared,
          monthlyRentDeclared: data.monthlyRentDeclared,
          profileStage: 'profile_building',
        },
        create: {
          userId,
          fullName: data.fullName,
          dob: new Date(data.dob),
          nationality: data.nationality,
          residencyStatus: data.residencyStatus,
          ukMoveDate: data.ukMoveDate ? new Date(data.ukMoveDate) : undefined,
          employmentType: data.employmentType,
          monthlyIncomeDeclared: data.monthlyIncomeDeclared,
          monthlyRentDeclared: data.monthlyRentDeclared,
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

      if (data.employmentType !== 'unemployed') {
        await tx.employmentProfile.create({
          data: {
            userId,
            employmentType: data.employmentType,
            employerName: data.employerName,
            jobTitle: data.jobTitle,
            monthlyIncomeDeclared: data.monthlyIncomeDeclared,
            payFrequency: data.payFrequency,
            isCurrent: true,
          },
        })
      }

      if (data.monthlyRentDeclared && data.monthlyRentDeclared > 0) {
        await tx.rentalProfile.create({
          data: {
            userId,
            monthlyRentDeclared: data.monthlyRentDeclared,
            landlordName: data.landlordName,
            tenancyStartDate: data.tenancyStartDate ? new Date(data.tenancyStartDate) : undefined,
            isCurrent: true,
          },
        })
      }

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

  async updateProfileStage(userId: string, stage: string) {
    return db.userProfile.update({
      where: { userId },
      data: { profileStage: stage as never },
    })
  }
}
