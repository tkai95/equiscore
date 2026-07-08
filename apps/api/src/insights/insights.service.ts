import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { buildInsightProfile } from './engine'
import type { InsightProfile, NormalizedTxn, ProfileContext } from './engine'
import type { PreviewProfileDto } from './insights.dto'

@Injectable()
export class InsightsService {
  /**
   * Build a profile straight from posted transactions — no database, no
   * Open Banking. This is the path for testing against real (anonymized)
   * statements and, later, for parsed PDF/CSV uploads.
   */
  preview(dto: PreviewProfileDto): InsightProfile {
    const txns: NormalizedTxn[] = dto.transactions.map((t) => ({
      date: t.date,
      amount: Math.abs(t.amount),
      direction: t.direction,
      description: t.description ?? null,
      merchantName: t.merchantName ?? null,
      balance: t.balance ?? null,
    }))

    const ctx: ProfileContext = {
      source: dto.source ?? 'statement_upload',
      accountHolderName: dto.accountHolderName ?? null,
      profileName: dto.profileName ?? null,
      declaredMonthlyRent: dto.declaredMonthlyRent ?? null,
      resolvedQuestionIds: dto.resolvedQuestionIds ?? [],
    }

    return buildInsightProfile(txns, ctx)
  }

  /** Build a profile from whatever transactions the user already has stored. */
  async getProfileForUser(userId: string): Promise<InsightProfile> {
    const [user, accounts, transactions, rentalProfile] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, include: { profile: true } }),
      db.bankAccount.findMany({
        where: { bankConnection: { userId } },
        include: { bankConnection: { select: { providerName: true } } },
      }),
      db.bankTransaction.findMany({
        where: { bankAccount: { bankConnection: { userId } } },
        orderBy: { bookedAt: 'asc' },
        select: {
          bookedAt: true,
          amount: true,
          direction: true,
          description: true,
          merchantName: true,
        },
      }),
      db.rentalProfile.findFirst({ where: { userId, isCurrent: true } }),
    ])

    if (!user) throw new NotFoundException('User not found')

    const txns: NormalizedTxn[] = transactions.map((t) => ({
      date: t.bookedAt.toISOString().slice(0, 10),
      amount: Math.abs(t.amount),
      direction: t.direction,
      description: t.description,
      merchantName: t.merchantName,
      // The Open Banking feed carries no per-transaction running balance;
      // parsed statements do, and will populate this.
      balance: null,
    }))

    const isOpenBanking = accounts.some((a) => a.bankConnection.providerName === 'truelayer')

    const ctx: ProfileContext = {
      source: isOpenBanking ? 'open_banking' : 'statement_upload',
      accountHolderName: accounts.find((a) => a.accountHolderName)?.accountHolderName ?? null,
      profileName: user.profile?.fullName ?? null,
      declaredMonthlyRent: rentalProfile?.monthlyRentDeclared ?? null,
      resolvedQuestionIds: [],
    }

    return buildInsightProfile(txns, ctx)
  }
}
