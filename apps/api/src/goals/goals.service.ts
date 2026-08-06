import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  db,
  Prisma,
  type ConsumerGoal,
  type ConsumerGoalApplicationMode,
  type ConsumerGoalPriority,
  type ConsumerGoalStatus,
  type ConsumerGoalType,
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

const DEFAULT_TITLES: Record<ConsumerGoalType, string> = {
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

  async createGoal(userId: string, dto: UpdateConsumerGoalDto) {
    const type = this.safeGoalType(dto.type ?? 'rental')
    const nextStatus = (dto.status ?? 'active') as ConsumerGoalStatus
    const activeCount = await db.consumerGoal.count({ where: { userId, status: 'active' } })
    const shouldBePrimary = nextStatus === 'active' && (dto.isPrimary === true || activeCount === 0)

    return db.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.consumerGoal.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        })
      }

      const goal = await tx.consumerGoal.create({
        data: {
          userId,
          type,
          status: nextStatus,
          isPrimary: shouldBePrimary,
          ...this.createFields(dto, type),
        },
      })
      return this.serialize(goal)
    })
  }

  async getPrimaryGoal(userId: string) {
    const primary = await db.consumerGoal.findFirst({
      where: { userId, isPrimary: true, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    })
    if (primary) return this.serialize(primary)

    const active = await db.consumerGoal.findFirst({
      where: { userId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    })
    if (active) return this.serialize(active)

    return this.createGoal(userId, {
      type: 'rental',
      status: 'active',
      isPrimary: true,
      title: DEFAULT_TITLES.rental,
      label: DEFAULT_TITLES.rental,
      applicationMode: 'unknown',
    })
  }

  async updatePrimaryGoal(userId: string, dto: UpdateConsumerGoalDto) {
    const primary = await db.consumerGoal.findFirst({
      where: { userId, isPrimary: true, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    })

    if (primary) {
      return this.updateGoalById(userId, primary.id, { ...dto, status: 'active', isPrimary: true })
    }

    return this.createGoal(userId, {
      ...dto,
      type: dto.type ?? 'rental',
      status: 'active',
      isPrimary: true,
    })
  }

  async updateGoalById(userId: string, goalId: string, dto: UpdateConsumerGoalDto) {
    const existing = await db.consumerGoal.findFirst({ where: { id: goalId, userId } })
    if (!existing) throw new NotFoundException('Goal not found')

    const type = dto.type ? this.safeGoalType(dto.type) : existing.type
    const nextStatus = (dto.status ?? existing.status) as ConsumerGoalStatus
    const shouldBePrimary =
      nextStatus === 'active' && (dto.isPrimary !== undefined ? dto.isPrimary : existing.isPrimary)

    return db.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.consumerGoal.updateMany({
          where: { userId, isPrimary: true, id: { not: goalId } },
          data: { isPrimary: false },
        })
      }

      const goal = await tx.consumerGoal.update({
        where: { id: goalId },
        data: {
          ...(dto.type !== undefined ? { type } : {}),
          ...(dto.status !== undefined ? { status: nextStatus } : {}),
          ...(dto.isPrimary !== undefined || nextStatus !== 'active'
            ? { isPrimary: shouldBePrimary }
            : {}),
          ...this.mutableFields(dto, type),
        },
      })
      return this.serialize(goal)
    })
  }

  async updateGoal(userId: string, rawType: string, dto: UpdateConsumerGoalDto) {
    const type = this.safeGoalType(rawType)
    const existing = await db.consumerGoal.findFirst({
      where: { userId, type },
      orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
    })

    if (existing) return this.updateGoalById(userId, existing.id, { ...dto, type })
    return this.createGoal(userId, { ...dto, type })
  }

  async setPrimaryGoal(userId: string, rawType: string) {
    const type = this.safeGoalType(rawType)
    const existing = await db.consumerGoal.findFirst({
      where: { userId, type, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    })

    if (existing) return this.setPrimaryGoalById(userId, existing.id)

    return this.createGoal(userId, {
      type,
      status: 'active',
      isPrimary: true,
      title: DEFAULT_TITLES[type],
      label: DEFAULT_TITLES[type],
    })
  }

  async setPrimaryGoalById(userId: string, goalId: string) {
    const existing = await db.consumerGoal.findFirst({
      where: { id: goalId, userId, status: 'active' },
    })
    if (!existing) throw new NotFoundException('Active goal not found')

    return db.$transaction(async (tx) => {
      await tx.consumerGoal.updateMany({
        where: { userId, isPrimary: true, id: { not: goalId } },
        data: { isPrimary: false },
      })
      const goal = await tx.consumerGoal.update({
        where: { id: goalId },
        data: { isPrimary: true },
      })
      return this.serialize(goal)
    })
  }

  private createFields(dto: UpdateConsumerGoalDto, type: ConsumerGoalType) {
    const title = this.goalTitle(dto, type)
    return {
      title,
      label: title,
      priority: (dto.priority ?? 'normal') as ConsumerGoalPriority,
      targetDate: this.parseOptionalDate(dto.targetDate) ?? null,
      targetAmount: dto.targetAmount ?? null,
      currentAmount: dto.currentAmount ?? null,
      monthlyContribution: dto.monthlyContribution ?? null,
      reservedFunds: dto.reservedFunds ?? null,
      assumptions: this.jsonField(dto.assumptions),
      targetMonthlyRent: dto.targetMonthlyRent ?? null,
      moveDate: this.parseOptionalDate(dto.moveDate) ?? null,
      applicationMode: (dto.applicationMode ?? 'unknown') as ConsumerGoalApplicationMode,
      depositAvailable: dto.depositAvailable ?? null,
      notes: dto.notes?.trim() || null,
      completedAt: this.parseOptionalDate(dto.completedAt) ?? null,
    }
  }

  private mutableFields(
    dto: UpdateConsumerGoalDto,
    type: ConsumerGoalType
  ): Prisma.ConsumerGoalUpdateInput {
    const nextTitle =
      dto.title !== undefined || dto.label !== undefined ? this.goalTitle(dto, type) : undefined

    return {
      ...(nextTitle !== undefined ? { title: nextTitle, label: nextTitle } : {}),
      ...(dto.priority !== undefined
        ? { priority: (dto.priority ?? 'normal') as ConsumerGoalPriority }
        : {}),
      ...(dto.targetDate !== undefined
        ? { targetDate: this.parseOptionalDate(dto.targetDate) }
        : {}),
      ...(dto.targetAmount !== undefined ? { targetAmount: dto.targetAmount } : {}),
      ...(dto.currentAmount !== undefined ? { currentAmount: dto.currentAmount } : {}),
      ...(dto.monthlyContribution !== undefined
        ? { monthlyContribution: dto.monthlyContribution }
        : {}),
      ...(dto.reservedFunds !== undefined ? { reservedFunds: dto.reservedFunds } : {}),
      ...(dto.assumptions !== undefined ? { assumptions: this.jsonField(dto.assumptions) } : {}),
      ...(dto.targetMonthlyRent !== undefined ? { targetMonthlyRent: dto.targetMonthlyRent } : {}),
      ...(dto.moveDate !== undefined ? { moveDate: this.parseOptionalDate(dto.moveDate) } : {}),
      ...(dto.applicationMode !== undefined
        ? { applicationMode: (dto.applicationMode ?? 'unknown') as ConsumerGoalApplicationMode }
        : {}),
      ...(dto.depositAvailable !== undefined ? { depositAvailable: dto.depositAvailable } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      ...(dto.completedAt !== undefined
        ? { completedAt: this.parseOptionalDate(dto.completedAt) }
        : {}),
    }
  }

  private goalTitle(dto: UpdateConsumerGoalDto, type: ConsumerGoalType) {
    return dto.title?.trim() || dto.label?.trim() || DEFAULT_TITLES[type]
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
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date')
    return parsed
  }

  private jsonField(value: Record<string, unknown> | null | undefined) {
    if (value === undefined) return undefined
    if (value === null) return Prisma.JsonNull
    return value as Prisma.InputJsonObject
  }

  private serialize(goal: ConsumerGoal) {
    return {
      id: goal.id,
      type: goal.type,
      status: goal.status,
      isPrimary: goal.isPrimary,
      title: goal.title ?? goal.label,
      priority: goal.priority,
      label: goal.label ?? goal.title,
      targetDate: goal.targetDate?.toISOString() ?? null,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      monthlyContribution: goal.monthlyContribution,
      reservedFunds: goal.reservedFunds,
      assumptions: goal.assumptions,
      targetMonthlyRent: goal.targetMonthlyRent,
      moveDate: goal.moveDate?.toISOString() ?? null,
      applicationMode: goal.applicationMode,
      depositAvailable: goal.depositAvailable,
      notes: goal.notes,
      completedAt: goal.completedAt?.toISOString() ?? null,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }
  }
}
