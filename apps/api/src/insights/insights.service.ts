import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { buildInsightProfile } from './engine'
import type { InsightProfile, NormalizedTxn, ProfileContext } from './engine'
import { parseStatementCsv } from './ingest/csv-statement'
import { checkBalanceContinuity } from './engine/integrity'
import { classifyTransaction } from '../banking/transaction-classifier'
import { ScoringService } from '../scoring/scoring.service'
import { AuditService } from '../audit/audit.service'
import type { PreviewProfileDto } from './insights.dto'

@Injectable()
export class InsightsService {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly audit: AuditService
  ) {}

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

  /**
   * Parse a CSV bank statement and build a profile — no database, no auth.
   * The testing counterpart to importCsv: lets us validate the parser + engine
   * on a real export before persisting anything.
   */
  previewCsv(csv: string, ctx: Partial<ProfileContext>): {
    profile: InsightProfile
    parse: ReturnType<typeof parseStatementCsv>['detected'] & { warnings: string[] }
  } {
    const parsed = parseStatementCsv(csv)
    const profile = buildInsightProfile(parsed.transactions, {
      source: 'statement_upload',
      accountHolderName: ctx.accountHolderName ?? null,
      profileName: ctx.profileName ?? null,
      declaredMonthlyRent: ctx.declaredMonthlyRent ?? null,
      resolvedQuestionIds: ctx.resolvedQuestionIds ?? [],
    })
    return { profile, parse: { ...parsed.detected, warnings: parsed.warnings } }
  }

  /**
   * Import a CSV bank statement for a signed-in user: parse it, persist the
   * transactions as a statement-sourced connection (so the normal feature +
   * scoring pipeline runs over them unchanged), and recompute the score.
   *
   * A statement is a first-class evidence source, so its coverage dates flow
   * straight into the freshness model — an old statement produces an old
   * `financialDataAsOf` and expires accordingly.
   */
  async importCsv(userId: string, csv: string) {
    const parsed = parseStatementCsv(csv)
    if (parsed.transactions.length === 0) {
      throw new BadRequestException(
        parsed.warnings.join(' ') || 'No transactions could be read from this file.'
      )
    }

    const txns = parsed.transactions

    // Anti-tamper gate. A real bank export is a ledger: each row's running
    // balance must equal the previous balance plus or minus that row's amount.
    // Editing an amount, or dropping a row from the middle, breaks this. We
    // refuse to score a statement that doesn't reconcile rather than let a
    // doctored file produce an inflated score that gets shared with a landlord.
    // (Statements without a balance column can't be checked, so they pass.)
    const integrity = checkBalanceContinuity(txns)
    if (integrity.hasBalances && !integrity.continuous) {
      const b = integrity.breaks[0]
      this.audit.log(userId, 'statement.integrity_failed', {
        checkedRows: integrity.checkedRows,
        breaks: integrity.breaks.length,
        firstBreak: b ?? null,
      })
      throw new BadRequestException(
        `This statement's running balance doesn't reconcile${
          b ? ` around ${b.date} (expected ${b.expected}, the file shows ${b.actual})` : ''
        }. This usually means the file is incomplete or has been edited. Please upload the original, unmodified export from your bank.`
      )
    }

    const dates = txns.map((t) => t.date).sort()
    const coverageStart = dates[0]!
    const coverageEnd = dates[dates.length - 1]!
    // Closing balance = the balance on the latest-dated row, if the file has one.
    const closingBalance =
      [...txns]
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .reverse()
        .find((t) => typeof t.balance === 'number')?.balance ?? null

    const connection = await db.bankConnection.create({
      data: {
        userId,
        providerName: 'statement_upload',
        institutionName: 'Uploaded bank statement',
        connectionStatus: 'active',
        lastSyncedAt: new Date(),
      },
    })

    const account = await db.bankAccount.create({
      data: {
        bankConnectionId: connection.id,
        externalAccountId: `stmt_${connection.id}`,
        accountName: 'Uploaded statement',
        accountType: 'current',
        currency: 'GBP',
        currentBalance: closingBalance ?? undefined,
        syncedAt: new Date(),
      },
    })

    await db.bankTransaction.createMany({
      data: txns.map((t, i) => ({
        bankAccountId: account.id,
        // No provider txn id exists, so synthesize a deterministic, unique one.
        externalTxnId: `${t.date}-${t.direction}-${Math.round(t.amount * 100)}-${i}`,
        bookedAt: new Date(t.date),
        amount: t.amount,
        currency: 'GBP',
        description: t.description,
        merchantName: t.merchantName,
        category: classifyTransaction({
          description: t.description ?? null,
          merchantName: t.merchantName ?? null,
          amount: t.amount,
          direction: t.direction,
          tlCategory: '',
        }),
        direction: t.direction,
      })),
      skipDuplicates: true,
    })

    this.audit.log(userId, 'statement.imported', {
      connectionId: connection.id,
      transactions: txns.length,
      skipped: parsed.detected.rowsSkipped,
      coverageStart,
      coverageEnd,
    })

    const score = await this.scoringService.recompute(userId)

    return {
      connectionId: connection.id,
      imported: txns.length,
      skipped: parsed.detected.rowsSkipped,
      coverageStart,
      coverageEnd,
      closingBalance,
      // True when the file carried balances and every row reconciled.
      ledgerVerified: integrity.hasBalances && integrity.continuous,
      warnings: parsed.warnings,
      overallScore: score.overallScore,
      overallTier: score.overallTier,
    }
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
