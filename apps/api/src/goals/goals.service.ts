import { BadRequestException, Injectable } from '@nestjs/common'
import {
  db,
  type ConsumerGoal,
  type ConsumerGoalApplicationMode,
  type ConsumerGoalStatus,
  type ConsumerGoalType,
  type Prisma,
} from '@equiscore/database'
import type { UpdateConsumerGoalDto } from './goals.dto'

const GOAL_TYPES = [
  'rental',
  'banking_access',
  'utilities_phone',
  'future_credit',
  'income_proof',
  'stronger_profile',
] as const satisfies readonly ConsumerGoalType[]

const DEFAULT_LABELS: Record<ConsumerGoalType, string> = {
  rental: 'Rent a home',
  banking_access: 'Open or recover banking access',
  utilities_phone: 'Set up utilities or a phone contract',
  future_credit: 'Prepare for future credit',
  income_proof: 'Prove income clearly',
  stronger_profile: 'Strengthen my Trust Profile',
}

@Injectable()
export class GoalsService {
  async listGoals(userId: string) {
    const goals = await db.consumerGoal.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
    })
    return goals.map((goal) => this.serialize(goal))
  }

  async getPrimaryGoal(userId: string) {
    const primary = await db.consumerGoal.findFirst({
      where: { userId, isPrimary: true, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    })
    if (primary) return this.serialize(primary)

    const seeded = await this.upsertGoal(userId, 'rental', {
      type: 'rental',
      status: 'active',
      isPrimary: true,
      label: DEFAULT_LABELS.rental,
      applicationMode: 'unknown',
    })
    return this.serialize(seeded)
  }

  async updatePrimaryGoal(userId: string, dto: UpdateConsumerGoalDto) {
    const type = this.safeGoalType(dto.type ?? 'rental')
    const goal = await this.upsertGoal(userId, type, {
      ...dto,
      type,
      status: 'active',
      isPrimary: true,
    })
    return this.serialize(goal)
  }

  async updateGoal(userId: string, rawType: string, dto: UpdateConsumerGoalDto) {
    const type = this.safeGoalType(rawType)
    const goal = await this.upsertGoal(userId, type, { ...dto, type })
    return this.serialize(goal)
  }

  async setPrimaryGoal(userId: string, rawType: string) {
    const type = this.safeGoalType(rawType)
    const goal = await this.upsertGoal(userId, type, {
      type,
      status: 'active',
      isPrimary: true,
      label: DEFAULT_LABELS[type],
    })
    return this.serialize(goal)
  }

  private async upsertGoal(userId: string, type: ConsumerGoalType, dto: UpdateConsumerGoalDto) {
    const nextStatus = (dto.status ?? 'active') as ConsumerGoalStatus
    const shouldBePrimary = nextStatus === 'active' && dto.isPrimary === true
    const updateData: Prisma.ConsumerGoalUpdateInput = {
      ...this.mutableFields(dto, type),
      ...(dto.status !== undefined ? { status: nextStatus } : {}),
      ...(dto.isPrimary !== undefined || nextStatus !== 'active'
        ? { isPrimary: shouldBePrimary }
        : {}),
    }

    return db.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.consumerGoal.updateMany({
          where: { userId, isPrimary: true, type: { not: type } },
          data: { isPrimary: false },
        })
      }

      return tx.consumerGoal.upsert({
        where: { userId_type: { userId, type } },
        update: updateData,
        create: {
          userId,
          type,
          status: nextStatus,
          isPrimary: shouldBePrimary,
          label: dto.label?.trim() || DEFAULT_LABELS[type],
          targetMonthlyRent: dto.targetMonthlyRent ?? null,
          moveDate: this.parseOptionalDate(dto.moveDate) ?? null,
          applicationMode: (dto.applicationMode ?? 'unknown') as ConsumerGoalApplicationMode,
          depositAvailable: dto.depositAvailable ?? null,
          notes: dto.notes?.trim() || null,
        },
      })
    })
  }

  private mutableFields(
    dto: UpdateConsumerGoalDto,
    type: ConsumerGoalType
  ): Prisma.ConsumerGoalUpdateInput {
    return {
      ...(dto.label !== undefined ? { label: dto.label?.trim() || DEFAULT_LABELS[type] } : {}),
      ...(dto.targetMonthlyRent !== undefined ? { targetMonthlyRent: dto.targetMonthlyRent } : {}),
      ...(dto.moveDate !== undefined ? { moveDate: this.parseOptionalDate(dto.moveDate) } : {}),
      ...(dto.applicationMode !== undefined
        ? { applicationMode: (dto.applicationMode ?? 'unknown') as ConsumerGoalApplicationMode }
        : {}),
      ...(dto.depositAvailable !== undefined ? { depositAvailable: dto.depositAvailable } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
    }
  }

  private safeGoalType(value: string): ConsumerGoalType {
    if (!GOAL_TYPES.includes(value as ConsumerGoalType)) {
      throw new BadRequestException('Invalid goal type')
    }
    return value as ConsumerGoalType
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
