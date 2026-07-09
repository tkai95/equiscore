import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { db } from '@equiscore/database'
import { buildInsightProfile } from './engine'
import type { InsightProfile, NormalizedTxn, ProfileContext } from './engine'
import { parseStatementCsv } from './ingest/csv-statement'
import { extractTransactionsFromPdf } from './ingest/pdf-extractor'
import { checkBalanceContinuity } from './engine/integrity'
import { classify } from './engine/classify'
import { resolveCategory } from './engine/expenses'
import { normalizeCounterparty } from './engine/normalize'
import { monthKey, toDate, round2 } from './engine/util'
import { classifyTransaction } from '../banking/transaction-classifier'
import { ScoringService } from '../scoring/scoring.service'
import { AuditService } from '../audit/audit.service'
import type { PreviewProfileDto } from './insights.dto'

@Injectable()
export class InsightsService implements OnModuleInit {
  private readonly logger = new Logger(InsightsService.name)

  constructor(
    private readonly scoringService: ScoringService,
    private readonly audit: AuditService
  ) {}

  /**
   * On boot, any import still "processing" belongs to a process that has since
   * died (a deploy or crash killed its in-memory promise), so it can never
   * finish. Mark those older than a few minutes as failed so the user sees a
   * clear "try again" instead of a spinner that never resolves. The age guard
   * avoids racing a job a sibling instance genuinely started seconds ago.
   */
  async onModuleInit(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 3 * 60 * 1000)
      const reaped = await db.statementImportJob.updateMany({
        where: { status: 'processing', createdAt: { lt: cutoff } },
        data: {
          status: 'failed',
          error: 'The import was interrupted. Please try uploading again.',
          completedAt: new Date(),
        },
      })
      if (reaped.count > 0) this.logger.warn(`Reaped ${reaped.count} orphaned import job(s) on boot`)
    } catch (err) {
      this.logger.error(`Import-job reaper failed: ${err instanceof Error ? err.message : err}`)
    }
  }

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
    return this.persistStatement(userId, parsed.transactions, {
      sourceType: 'csv',
      skipped: parsed.detected.rowsSkipped,
      warnings: parsed.warnings,
    })
  }

  /**
   * Start an async PDF import. Reading a PDF with Claude takes 30–90s, so we
   * create a persisted job, kick off processing in the background, and return
   * immediately — the user can navigate away or close the browser and pick the
   * result back up (a global chip polls for completion).
   */
  async startPdfImportJob(userId: string, pdfBuffer: Buffer, fileName?: string) {
    const job = await db.statementImportJob.create({
      data: { userId, sourceType: 'pdf', fileName: fileName ?? null, status: 'processing' },
    })
    // Fire-and-forget; the promise keeps the event loop alive and captures its
    // own errors onto the job row, so it never rejects unhandled.
    void this.runPdfImportJob(job.id, userId, pdfBuffer)
    return { jobId: job.id, status: job.status }
  }

  private async runPdfImportJob(jobId: string, userId: string, pdfBuffer: Buffer): Promise<void> {
    const startedAt = Date.now()
    this.logger.log(`Import ${jobId}: reading PDF (${(pdfBuffer.length / 1024).toFixed(0)} KB)`)
    try {
      const apiKey = process.env['ANTHROPIC_API_KEY']
      if (!apiKey) throw new Error('Statement reading is not available right now.')

      const extraction = await extractTransactionsFromPdf(apiKey, pdfBuffer.toString('base64'))
      this.logger.log(
        `Import ${jobId}: extracted ${extraction.transactions.length} txns in ${((Date.now() - startedAt) / 1000).toFixed(0)}s`
      )

      // Cancelled during the slow read? Stop before persisting anything.
      const current = await db.statementImportJob.findUnique({ where: { id: jobId } })
      if (!current || current.status === 'cancelled') {
        this.logger.log(`Import ${jobId}: cancelled, discarding result`)
        return
      }

      if (extraction.transactions.length === 0) {
        throw new Error(
          extraction.warnings.join(' ') || 'No transactions could be read from this statement.'
        )
      }

      const result = await this.persistStatement(userId, extraction.transactions, {
        sourceType: 'pdf',
        skipped: 0,
        warnings: extraction.warnings,
        accountHolderName: extraction.accountHolderName,
      })

      await db.statementImportJob.update({
        where: { id: jobId },
        data: { status: 'completed', result: result as never, completedAt: new Date() },
      })
      this.logger.log(`Import ${jobId}: completed in ${((Date.now() - startedAt) / 1000).toFixed(0)}s`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong reading the statement.'
      this.logger.error(`Import ${jobId}: failed after ${((Date.now() - startedAt) / 1000).toFixed(0)}s — ${message}`)
      await db.statementImportJob
        .update({
          where: { id: jobId },
          data: { status: 'failed', error: message, completedAt: new Date() },
        })
        .catch(() => undefined)
    }
  }

  // The extractor self-aborts at 5 min, so a live read always resolves (complete
  // or failed) well within this. Reaching it means the job is genuinely orphaned.
  private static readonly JOB_STALE_MS = 6 * 60 * 1000

  /** A job stuck "processing" past the timeout (e.g. a container restart) reads as failed. */
  private withStaleness<T extends { status: string; createdAt: Date }>(job: T): T {
    if (job.status === 'processing' && Date.now() - job.createdAt.getTime() > InsightsService.JOB_STALE_MS) {
      return { ...job, status: 'failed', error: 'Timed out while reading the statement. Please try again.' } as T
    }
    return job
  }

  async getImportJob(userId: string, jobId: string) {
    const job = await db.statementImportJob.findFirst({ where: { id: jobId, userId } })
    return job ? this.withStaleness(job) : null
  }

  /** Recent jobs for the global "analysis complete" chip. */
  async listImportJobs(userId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const jobs = await db.statementImportJob.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return jobs.map((j) => this.withStaleness(j))
  }

  async cancelImportJob(userId: string, jobId: string) {
    const job = await db.statementImportJob.findFirst({ where: { id: jobId, userId } })
    if (!job) throw new NotFoundException('Import not found')
    if (job.status === 'processing') {
      return db.statementImportJob.update({
        where: { id: jobId },
        data: { status: 'cancelled', completedAt: new Date() },
      })
    }
    return job
  }

  /**
   * Shared statement-persistence path for CSV and PDF: run the anti-tamper
   * ledger check, persist as a statement-sourced connection, and recompute.
   */
  private async persistStatement(
    userId: string,
    txns: NormalizedTxn[],
    opts: { sourceType: 'csv' | 'pdf'; skipped: number; warnings: string[]; accountHolderName?: string | null }
  ) {
    // Anti-tamper gate. A real bank export is a ledger: each row's running
    // balance must equal the previous balance plus or minus that row's amount.
    // A doctored CSV — or a misread PDF — breaks this, so we refuse to score it
    // rather than let a wrong figure inflate a score that gets shared.
    // (Statements with no balance column can't be checked, so they pass.)
    const integrity = checkBalanceContinuity(txns)
    if (integrity.hasBalances && !integrity.continuous) {
      const b = integrity.breaks[0]
      this.audit.log(userId, 'statement.integrity_failed', {
        sourceType: opts.sourceType,
        checkedRows: integrity.checkedRows,
        breaks: integrity.breaks.length,
        firstBreak: b ?? null,
      })
      const where = b ? ` around ${b.date} (expected ${b.expected}, we read ${b.actual})` : ''
      throw new BadRequestException(
        opts.sourceType === 'pdf'
          ? `The figures we read from this statement don't add up${where} — the scan may be unclear. Please try a clearer copy or a CSV export from your bank.`
          : `This statement's running balance doesn't reconcile${where}. This usually means the file is incomplete or has been edited. Please upload the original, unmodified export from your bank.`
      )
    }

    const dates = txns.map((t) => t.date).sort()
    const coverageStart = dates[0]!
    const coverageEnd = dates[dates.length - 1]!
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
        accountHolderName: opts.accountHolderName ?? undefined,
        accountType: 'current',
        currency: 'GBP',
        currentBalance: closingBalance ?? undefined,
        syncedAt: new Date(),
      },
    })

    await db.bankTransaction.createMany({
      data: txns.map((t, i) => ({
        bankAccountId: account.id,
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
      sourceType: opts.sourceType,
      transactions: txns.length,
      skipped: opts.skipped,
      coverageStart,
      coverageEnd,
    })

    const score = await this.scoringService.recompute(userId)

    return {
      connectionId: connection.id,
      imported: txns.length,
      skipped: opts.skipped,
      coverageStart,
      coverageEnd,
      closingBalance,
      ledgerVerified: integrity.hasBalances && integrity.continuous,
      warnings: opts.warnings,
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

  private async loadNormalizedTxns(userId: string): Promise<NormalizedTxn[]> {
    const rows = await db.bankTransaction.findMany({
      where: { bankAccount: { bankConnection: { userId } } },
      orderBy: { bookedAt: 'desc' },
      select: { bookedAt: true, amount: true, direction: true, description: true, merchantName: true },
    })
    return rows.map((t) => ({
      date: t.bookedAt.toISOString().slice(0, 10),
      amount: Math.abs(t.amount),
      direction: t.direction,
      description: t.description,
      merchantName: t.merchantName,
      balance: null,
    }))
  }

  /**
   * Drill-down behind a summary row: the transactions (and sub-aggregates) that
   * make up a spend category, a recurring commitment, or a single month. Uses
   * the exact same classification the profile does, so a drawer always
   * reconciles with the card it opened from.
   */
  async getBreakdown(userId: string, type: string, key: string) {
    const txns = await this.loadNormalizedTxns(userId)
    const months = new Set(txns.map((t) => monthKey(toDate(t.date)))).size || 1
    if (type === 'category') return this.categoryBreakdown(txns, key, months)
    if (type === 'commitment') return this.commitmentBreakdown(txns, key)
    if (type === 'income') return this.incomeBreakdown(txns, key)
    if (type === 'month') return this.monthBreakdown(txns, key)
    throw new BadRequestException('Unknown breakdown type')
  }

  private merchantName(t: NormalizedTxn): string {
    return t.merchantName?.trim() || t.description?.trim() || 'Unknown'
  }

  private categoryBreakdown(txns: NormalizedTxn[], key: string, months: number) {
    const debits = txns.filter((t) => t.direction === 'debit')
    const matches = debits.filter((t) => resolveCategory(t, classify(t)).key === key)
    const label = matches[0] ? resolveCategory(matches[0], classify(matches[0])).label : key
    const total = matches.reduce((s, t) => s + t.amount, 0)

    const merchantMap = new Map<string, { total: number; count: number }>()
    for (const t of matches) {
      const name = this.merchantName(t)
      const m = merchantMap.get(name) ?? { total: 0, count: 0 }
      m.total += t.amount
      m.count++
      merchantMap.set(name, m)
    }
    const merchants = [...merchantMap.entries()]
      .map(([name, m]) => ({ name, total: round2(m.total), count: m.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    return {
      kind: 'category' as const,
      key,
      label,
      total: round2(total),
      monthlyAverage: round2(total / months),
      transactionCount: matches.length,
      merchants,
      transactions: matches.slice(0, 80).map((t) => ({
        date: t.date,
        description: t.description ?? label,
        amount: round2(t.amount),
      })),
    }
  }

  private commitmentBreakdown(txns: NormalizedTxn[], key: string) {
    const matches = txns.filter((t) => t.direction === 'debit' && normalizeCounterparty(t) === key)
    const total = matches.reduce((s, t) => s + t.amount, 0)
    const amounts = matches.map((t) => t.amount).sort((a, b) => a - b)
    const typicalAmount = amounts.length ? amounts[Math.floor(amounts.length / 2)]! : 0
    return {
      kind: 'commitment' as const,
      key,
      total: round2(total),
      count: matches.length,
      typicalAmount: round2(typicalAmount),
      transactions: matches.slice(0, 80).map((t) => ({
        date: t.date,
        description: t.description ?? '',
        amount: round2(t.amount),
      })),
    }
  }

  /** The money received from one income source, payment by payment (credits). */
  private incomeBreakdown(txns: NormalizedTxn[], key: string) {
    const matches = txns.filter((t) => t.direction === 'credit' && normalizeCounterparty(t) === key)
    const total = matches.reduce((s, t) => s + t.amount, 0)
    const amounts = matches.map((t) => t.amount).sort((a, b) => a - b)
    const typicalAmount = amounts.length ? amounts[Math.floor(amounts.length / 2)]! : 0
    return {
      kind: 'income' as const,
      key,
      total: round2(total),
      count: matches.length,
      typicalAmount: round2(typicalAmount),
      transactions: matches.slice(0, 80).map((t) => ({
        date: t.date,
        description: t.description ?? '',
        amount: round2(t.amount),
      })),
    }
  }

  private monthBreakdown(txns: NormalizedTxn[], key: string) {
    const inMonth = txns.filter((t) => monthKey(toDate(t.date)) === key)
    let income = 0
    let spend = 0
    const catMap = new Map<string, { label: string; total: number }>()
    for (const t of inMonth) {
      if (t.direction === 'credit') {
        income += t.amount
        continue
      }
      const base = classify(t)
      if (base === 'savings_transfer' || base === 'investment') continue
      spend += t.amount
      const def = resolveCategory(t, base)
      const c = catMap.get(def.key) ?? { label: def.label, total: 0 }
      c.total += t.amount
      catMap.set(def.key, c)
    }
    return {
      kind: 'month' as const,
      month: key,
      income: round2(income),
      spend: round2(spend),
      net: round2(income - spend),
      categories: [...catMap.values()]
        .map((c) => ({ label: c.label, total: round2(c.total) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
      largest: inMonth
        .filter((t) => t.direction === 'debit')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6)
        .map((t) => ({ date: t.date, description: t.description ?? '', amount: round2(t.amount) })),
    }
  }
}
