import { BadRequestException, Injectable } from '@nestjs/common'
import {
  db,
  type ConsumerGoal,
  type ConsumerGoalApplicationMode,
  type ConsumerGoalType,
  type Prisma,
} from '@equiscore/database'
import type { UpdateConsumerGoalDto } from './goals.dto'

const DEFAULT_RENTAL_LABEL = 'Rent a home'

@Injectable()
export class GoalsService {
  async getPrimaryGoal(userId: string) {
    const primary = await db.consumerGoal.findFirst({
      where: { userId, isPrimary: true, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    })
    if (primary) return this.serialize(primary)

    const seeded = await db.consumerGoal.upsert({
      where: { userId_type: { userId, type: 'rental' } },
      update: { status: 'active', isPrimary: true, label: DEFAULT_RENTAL_LABEL },
      create: {
        userId,
        type: 'rental',
        status: 'active',
        isPrimary: true,
        label: DEFAULT_RENTAL_LABEL,
        applicationMode: 'unknown',
      },
    })
    return this.serialize(seeded)
  }

  async updatePrimaryGoal(userId: string, dto: UpdateConsumerGoalDto) {
    const type = (dto.type ?? 'rental') as ConsumerGoalType
    const data: Prisma.ConsumerGoalUpdateInput = {
      status: 'active',
      isPrimary: true,
      ...this.mutableFields(dto),
    }

    const goal = await db.$transaction(async (tx) => {
      await tx.consumerGoal.updateMany({
        where: { userId, isPrimary: true, type: { not: type } },
        data: { isPrimary: false },
      })
      return tx.consumerGoal.upsert({
        where: { userId_type: { userId, type } },
        update: data,
        create: {
          userId,
          type,
          status: 'active',
          isPrimary: true,
          label: dto.label?.trim() || DEFAULT_RENTAL_LABEL,
          targetMonthlyRent: dto.targetMonthlyRent ?? null,
          moveDate: this.parseOptionalDate(dto.moveDate),
          applicationMode: (dto.applicationMode ?? 'unknown') as ConsumerGoalApplicationMode,
          depositAvailable: dto.depositAvailable ?? null,
          notes: dto.notes?.trim() || null,
        },
      })
    })

    return this.serialize(goal)
  }

  private mutableFields(dto: UpdateConsumerGoalDto): Prisma.ConsumerGoalUpdateInput {
    return {
      ...(dto.label !== undefined ? { label: dto.label?.trim() || DEFAULT_RENTAL_LABEL } : {}),
      ...(dto.targetMonthlyRent !== undefined ? { targetMonthlyRent: dto.targetMonthlyRent } : {}),
      ...(dto.moveDate !== undefined ? { moveDate: this.parseOptionalDate(dto.moveDate) } : {}),
      ...(dto.applicationMode !== undefined
        ? { applicationMode: (dto.applicationMode ?? 'unknown') as ConsumerGoalApplicationMode }
        : {}),
      ...(dto.depositAvailable !== undefined ? { depositAvailable: dto.depositAvailable } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
    }
  }

  private parseOptionalDate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid move date')
    return parsed
  }

  private serialize(goal: ConsumerGoal) {
    return {
      id: goal.id,
      type: goal.type,
      status: goal.status,
      isPrimary: goal.isPrimary,
      label: goal.label,
      targetMonthlyRent: goal.targetMonthlyRent,
      moveDate: goal.moveDate?.toISOString() ?? null,
      applicationMode: goal.applicationMode,
      depositAvailable: goal.depositAvailable,
      notes: goal.notes,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }
  }
}
