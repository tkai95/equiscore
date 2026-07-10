import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
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

const GAMBLING =
  /\b(bet365|paddy ?power|william ?hill|ladbrokes|betfair|sky ?bet|coral|betfred|betway|888|pokerstars|draftkings|casino|poker|gambl|lottery|lotto)\b/i

// The one tool the assistant can call to pull exact transaction evidence.
const TRANSACTION_TOOL: Anthropic.Tool = {
  name: 'get_transactions',
  description:
    "Retrieve the user's ACTUAL transactions for exact evidence. Use this whenever the question needs specific underlying data — a particular month, a category (e.g. gambling), a merchant, the biggest/smallest payments, or explaining one transaction. For general questions answerable from the snapshot (score, totals, affordability, why a tier), do NOT call this.",
  input_schema: {
    type: 'object',
    properties: {
      month: { type: 'string', description: 'Filter to a single calendar month, format YYYY-MM' },
      category: {
        type: 'string',
        description:
          'Spending category: rent, groceries, utilities, mobile_internet, council_tax, transport, subscriptions, discretionary, gambling, family_support, loan_credit, cash, healthcare, education — or "income" for money in.',
      },
      search: { type: 'string', description: 'Match merchant or description text (e.g. a merchant name)' },
      direction: { type: 'string', enum: ['credit', 'debit'] },
      minAmount: { type: 'number', description: 'Only transactions at or above this amount' },
      sort: { type: 'string', enum: ['amount', 'date'], description: 'amount = largest first; date = newest first' },
      limit: { type: 'number', description: 'Max transactions to return (default 20, max 50)' },
    },
  },
}

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

    // Re-upload guard: the same statement (same coverage window and row count)
    // must not stack a second copy on top of the first and double the numbers.
    await this.replaceMatchingStatement(userId, coverageStart, coverageEnd, txns.length)

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

  /**
   * If the user already has an uploaded statement covering the exact same window
   * with the same number of rows, it's a re-upload of the same document — delete
   * the old copy so the new one replaces it instead of doubling every figure.
   */
  private async replaceMatchingStatement(
    userId: string,
    coverageStart: string,
    coverageEnd: string,
    count: number
  ): Promise<void> {
    const existing = await db.bankConnection.findMany({
      where: { userId, providerName: 'statement_upload' },
      select: { id: true },
    })
    for (const conn of existing) {
      const agg = await db.bankTransaction.aggregate({
        where: { bankAccount: { bankConnectionId: conn.id } },
        _min: { bookedAt: true },
        _max: { bookedAt: true },
        _count: true,
      })
      const start = agg._min.bookedAt ? agg._min.bookedAt.toISOString().slice(0, 10) : null
      const end = agg._max.bookedAt ? agg._max.bookedAt.toISOString().slice(0, 10) : null
      if (start === coverageStart && end === coverageEnd && agg._count === count) {
        await db.bankTransaction.deleteMany({ where: { bankAccount: { bankConnectionId: conn.id } } })
        await db.bankAccount.deleteMany({ where: { bankConnectionId: conn.id } })
        await db.bankConnection.delete({ where: { id: conn.id } })
        this.audit.log(userId, 'statement.replaced', { connectionId: conn.id, coverageStart, coverageEnd })
      }
    }
  }

  /** The follow-up questions this user has already answered (by question id). */
  async getResolvedQuestionIds(userId: string): Promise<string[]> {
    const answers = await db.insightQuestionAnswer.findMany({
      where: { userId },
      select: { questionId: true },
    })
    return answers.map((a) => a.questionId)
  }

  /** The user's answers, keyed by question id — for answer-specific reclassification. */
  async getQuestionAnswers(userId: string): Promise<Record<string, string>> {
    const rows = await db.insightQuestionAnswer.findMany({
      where: { userId },
      select: { questionId: true, answer: true },
    })
    return Object.fromEntries(rows.map((r) => [r.questionId, r.answer]))
  }

  /**
   * Capture the user's explanation of a flagged/ambiguous transaction. The
   * answer resolves the follow-up question (so it stops being asked), raises
   * transaction clarity, and — because the Trust Score now reads the same engine
   * — can move the score. Recomputes so every surface reflects the answer.
   */
  async answerQuestion(userId: string, questionId: string, answer: string) {
    await db.insightQuestionAnswer.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, answer },
      update: { answer },
    })
    this.audit.log(userId, 'insight.question_answered', { questionId })
    const score = await this.scoringService.recompute(userId)
    return { ok: true, overallScore: score.overallScore, overallTier: score.overallTier }
  }

  /**
   * Grounded assistant. The user asks about their payments, profile, or the
   * site; the LLM answers over a compact, deterministic snapshot of their own
   * data (never inventing figures). AI stays at the phrasing boundary — every
   * number it quotes came from the engine.
   */
  async chat(
    userId: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<{ answer: string }> {
    const system = this.chatSystem(await this.buildChatContext(userId))
    const answer = await this.callAssistant(system, history.slice(-8), message)
    this.audit.log(userId, 'insight.chat', { chars: message.length })
    return { answer }
  }

  /** Streaming variant — tokens are pushed to onToken as they arrive. */
  async chatStream(
    userId: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    onToken: (t: string) => void
  ): Promise<void> {
    const system = this.chatSystem(await this.buildChatContext(userId))
    await this.streamAssistant(userId, system, history.slice(-8), message, onToken)
    this.audit.log(userId, 'insight.chat', { chars: message.length, stream: true })
  }

  private chatSystem(context: string): string {
    return `You are the EquiScore assistant. EquiScore turns someone's bank data into a shareable Trust Profile — a score out of 100 and a tier from A (best) to E — that proves their financial reliability to landlords and lenders, alongside deep insight into their income, spending, affordability, and payment reliability.

RULES:
- Answer general questions (score, tier, why a tier, totals, affordability, how-to) from the SNAPSHOT below. Be specific with figures and always use £. Never invent numbers.
- For questions that need exact underlying evidence — a specific month, a category like gambling, a merchant, the biggest/smallest payments, or explaining one transaction — call the get_transactions tool to fetch the real transactions, then answer from what it returns. Do not guess at specifics the snapshot doesn't contain.
- Be warm, concise, and genuinely helpful. Format with Markdown: short paragraphs, **bold** for key figures, and bullet lists where it helps. Do not use headings larger than bold.
- When you recommend an action, include a Markdown link to the exact page so they can act in one click. Paths: Dashboard [/dashboard], My Trust Score [/dashboard/trust-score], Analytics [/dashboard/analytics], Connections (connect a bank or upload a statement) [/dashboard/connections], Documents (upload ID / proof of address) [/dashboard/documents], Share Profile [/dashboard/share], My Profile [/dashboard/profile]. For example: "[Upload your documents](/dashboard/documents)".

HOW THE SITE WORKS (to answer how-to questions):
- To raise the score: verify identity (name on the bank must match the profile), connect Open Banking or upload more evidence, upload an ID or proof of address, and explain any flagged transactions. The Trust Score is capped at Tier C until identity and verification are confirmed.
- To share with a landlord/lender: create a time-limited link on Share Profile — they see it with no account.
- To explain a flagged transaction: answer the follow-up questions on Analytics; the answer clears the flag and can raise the score.

THIS USER'S DATA:
${context}`
  }

  private async buildChatContext(userId: string): Promise<string> {
    const [profile, score] = await Promise.all([
      this.getProfileForUser(userId).catch(() => null),
      db.trustScore.findFirst({ where: { userId }, orderBy: { computedAt: 'desc' } }),
    ])
    const lines: string[] = []
    if (score) {
      lines.push(
        `Trust Score: ${score.overallScore}/100, Tier ${score.overallTier}. Dimensions — profile completeness ${score.profileCompletenessScore}, verification strength ${score.verificationStrengthScore}, identity confidence ${score.identityConfidenceScore}, income stability ${score.incomeStabilityScore}, affordability ${score.affordabilityScore}, rental reliability ${score.rentalReliabilityScore}, financial stability ${score.financialStabilityScore}.`
      )
    }
    if (profile && profile.period.transactionCount > 0) {
      const p = profile
      lines.push(
        `Evidence: ${p.source}, ${p.period.months} months, ${p.period.transactionCount} transactions (${p.period.from} to ${p.period.to}).`
      )
      lines.push(
        `Income: about £${p.income.averageMonthlyIncome}/month, ${p.income.primaryCharacter}, ${p.income.consistency}${p.income.recurringSalaryDetected ? ', recurring salary detected' : ''}. Sources: ${p.income.sources.map((s) => `${s.name} £${s.monthlyAverage}/mo`).join(', ')}.`
      )
      lines.push(
        `Spending: about £${p.expenses.averageMonthlySpend}/month, ${Math.round(p.expenses.essentialShare * 100)}% essential. Categories: ${p.expenses.categories.slice(0, 8).map((c) => `${c.label} £${c.monthlyAverage}/mo`).join(', ')}.`
      )
      if (p.commitments.length) {
        lines.push(
          `Recurring commitments: ${p.commitments.map((c) => `${c.name} £${c.amount} ${c.cadence} (${c.occurrences}/${Math.max(c.monthsCovered, c.occurrences)} paid${c.returnedCount ? `, ${c.returnedCount} returned` : ''})`).join('; ')}.`
        )
      }
      const a = p.affordability
      lines.push(
        `Affordability: ${a.rating}. Disposable after essentials £${a.disposableIncome}/month, surplus after all spending £${a.surplusAfterAll}/month, rent-to-income ${a.ratios.rentToIncome !== null ? Math.round(a.ratios.rentToIncome * 100) + '%' : 'n/a'}, estimated max sustainable rent £${a.maxAffordableRent}/month. Stress test (20% income drop): surplus £${a.stressTest.surplusUnderStress}, ${a.stressTest.stillPositive ? 'still positive' : 'negative'}.`
      )
      const last = p.monthly[p.monthly.length - 1]
      if (last) lines.push(`Latest month ${last.month}: money in £${last.income}, out £${last.spend}, net £${last.net}.`)
      if (p.externalAccounts.length) {
        lines.push(
          `Other accounts implied by this statement (not connected — a partial picture): ${p.externalAccounts.map((a) => `${a.label}${a.provider ? ` (${a.provider})` : ''} — ${a.reason}`).join('; ')} Suggest connecting them on Connections for a complete profile.`
        )
      }
      if (p.unusual.length) {
        lines.push(
          `Flagged for context (surfaced to explain, not counted against them): ${p.unusual.map((u) => `£${u.amount} ${u.direction === 'debit' ? 'to' : 'from'} ${u.counterparty} on ${u.date} (${u.reason})`).join('; ')}.`
        )
      }
      if (p.questions.length) {
        lines.push(`Open follow-up questions: ${p.questions.map((q) => q.question).join(' | ')}`)
      }
      const recentTxns = await db.bankTransaction.findMany({
        where: { bankAccount: { bankConnection: { userId } } },
        orderBy: { bookedAt: 'desc' },
        take: 40,
        select: { bookedAt: true, amount: true, direction: true, description: true, merchantName: true },
      })
      if (recentTxns.length) {
        lines.push(
          `Most recent transactions (newest first): ${recentTxns
            .map((t) => `${t.bookedAt.toISOString().slice(0, 10)} ${t.direction === 'credit' ? '+' : '-'}£${Math.abs(t.amount)} ${t.merchantName || t.description || ''}`.trim())
            .join('; ')}.`
        )
      }
    } else {
      lines.push('No bank data has been added yet — they should connect a bank or upload a statement on Connections.')
    }
    return lines.join('\n')
  }

  private async callAssistant(
    system: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string
  ): Promise<string> {
    const messages = [...history, { role: 'user' as const, content: message }]

    const glmKey = process.env['GLM_API_KEY']
    if (glmKey) {
      try {
        const baseUrl = process.env['GLM_BASE_URL'] ?? 'https://api.z.ai/api/paas/v4'
        const model = process.env['GLM_MODEL'] ?? 'glm-5.2'
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${glmKey}` },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            messages: [{ role: 'system', content: system }, ...messages],
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
          const content = data.choices?.[0]?.message?.content
          if (content) return content
        } else {
          this.logger.warn(`GLM chat failed: ${res.status}`)
        }
      } catch (err) {
        this.logger.warn(`GLM chat error: ${err instanceof Error ? err.message : err}`)
      }
    }

    const anthropicKey = process.env['ANTHROPIC_API_KEY']
    if (anthropicKey) {
      const client = new Anthropic({ apiKey: anthropicKey })
      const resp = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system,
        messages,
      })
      const block = resp.content[0]
      return block && block.type === 'text' ? block.text : "Sorry, I couldn't answer that just now."
    }

    return 'The assistant is not available right now. Please try again later.'
  }

  private async streamAssistant(
    userId: string,
    system: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string,
    onToken: (t: string) => void
  ): Promise<void> {
    // GLM is the default; Anthropic is the fallback. Both support the
    // transaction tool (GLM via OpenAI-compatible function calling).
    const glmKey = process.env['GLM_API_KEY']
    if (glmKey) {
      await this.streamWithGlm(glmKey, userId, system, history, message, onToken)
      return
    }
    const anthropicKey = process.env['ANTHROPIC_API_KEY']
    if (anthropicKey) {
      await this.streamWithAnthropic(anthropicKey, userId, system, history, message, onToken)
      return
    }
    onToken('The assistant is not available right now. Please try again later.')
  }

  private async streamWithAnthropic(
    apiKey: string,
    userId: string,
    system: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string,
    onToken: (t: string) => void
  ): Promise<void> {
    const client = new Anthropic({ apiKey })
    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ]

    // Bounded tool loop: the model may pull transaction evidence, then answer.
    for (let step = 0; step < 3; step++) {
      const stream = client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        tools: [TRANSACTION_TOOL],
        messages,
      })
      stream.on('text', (t) => onToken(t))
      const final = await stream.finalMessage()

      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      if (toolUses.length === 0) return

      messages.push({ role: 'assistant', content: final.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const out = await this.runChatTool(userId, tu.name, tu.input as Record<string, unknown>)
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) })
      }
      messages.push({ role: 'user', content: results })
    }
  }

  private async streamWithGlm(
    glmKey: string,
    userId: string,
    system: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string,
    onToken: (t: string) => void
  ): Promise<void> {
    const baseUrl = process.env['GLM_BASE_URL'] ?? 'https://api.z.ai/api/paas/v4'
    const model = process.env['GLM_MODEL'] ?? 'glm-5.2'
    const tools = [
      {
        type: 'function',
        function: {
          name: TRANSACTION_TOOL.name,
          description: TRANSACTION_TOOL.description,
          parameters: TRANSACTION_TOOL.input_schema,
        },
      },
    ]
    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: message },
    ]

    try {
      for (let step = 0; step < 3; step++) {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${glmKey}` },
          body: JSON.stringify({ model, max_tokens: 1024, stream: true, tools, messages }),
        })
        if (!res.ok || !res.body) {
          this.logger.warn(`GLM stream failed: ${res.status}`)
          onToken('The assistant is not available right now. Please try again later.')
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        // Accumulate any streamed tool call(s) by index.
        const toolCalls: Record<number, { id: string; name: string; args: string }> = {}
        let streamDone = false
        while (!streamDone) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const data = t.slice(5).trim()
            if (data === '[DONE]') {
              streamDone = true
              break
            }
            try {
              const j = JSON.parse(data) as {
                choices?: Array<{
                  delta?: {
                    content?: string
                    tool_calls?: Array<{
                      index?: number
                      id?: string
                      function?: { name?: string; arguments?: string }
                    }>
                  }
                }>
              }
              const delta = j.choices?.[0]?.delta
              if (delta?.content) onToken(delta.content)
              for (const tc of delta?.tool_calls ?? []) {
                const idx = tc.index ?? 0
                const e = toolCalls[idx] ?? { id: '', name: '', args: '' }
                if (tc.id) e.id = tc.id
                if (tc.function?.name) e.name = tc.function.name
                if (tc.function?.arguments) e.args += tc.function.arguments
                toolCalls[idx] = e
              }
            } catch {
              /* keepalive or partial frame — ignore */
            }
          }
        }

        const calls = Object.values(toolCalls).filter((c) => c.name)
        if (calls.length === 0) return // model answered directly (already streamed)

        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: calls.map((c) => ({
            id: c.id,
            type: 'function',
            function: { name: c.name, arguments: c.args || '{}' },
          })),
        })
        for (const c of calls) {
          let input: Record<string, unknown> = {}
          try {
            input = JSON.parse(c.args || '{}')
          } catch {
            /* leave empty */
          }
          const out = await this.runChatTool(userId, c.name, input)
          messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(out) })
        }
      }
    } catch (err) {
      this.logger.warn(`GLM stream error: ${err instanceof Error ? err.message : err}`)
      // If nothing was streamed yet, fall back to Anthropic (also tool-capable).
      const anthropicKey = process.env['ANTHROPIC_API_KEY']
      if (anthropicKey) {
        await this.streamWithAnthropic(anthropicKey, userId, system, history, message, onToken)
      } else {
        onToken('The assistant is not available right now. Please try again later.')
      }
    }
  }

  private async runChatTool(
    userId: string,
    name: string,
    input: Record<string, unknown>
  ): Promise<unknown> {
    if (name === 'get_transactions') return this.queryTransactions(userId, input)
    return { error: `Unknown tool: ${name}` }
  }

  /** Exact-evidence transaction lookup for the assistant's tool. */
  private async queryTransactions(userId: string, f: Record<string, unknown>) {
    const txns = await this.loadNormalizedTxns(userId)
    let rows = txns

    if (typeof f['month'] === 'string') rows = rows.filter((t) => monthKey(toDate(t.date)) === f['month'])
    if (f['direction'] === 'credit' || f['direction'] === 'debit')
      rows = rows.filter((t) => t.direction === f['direction'])
    if (typeof f['minAmount'] === 'number') rows = rows.filter((t) => t.amount >= (f['minAmount'] as number))
    if (typeof f['search'] === 'string') {
      const s = (f['search'] as string).toLowerCase()
      rows = rows.filter(
        (t) =>
          (t.description ?? '').toLowerCase().includes(s) || (t.merchantName ?? '').toLowerCase().includes(s)
      )
    }
    if (typeof f['category'] === 'string') {
      const cat = (f['category'] as string).toLowerCase()
      if (cat === 'gambling') rows = rows.filter((t) => GAMBLING.test(t.description ?? t.merchantName ?? ''))
      else if (cat === 'income') rows = rows.filter((t) => t.direction === 'credit')
      else rows = rows.filter((t) => t.direction === 'debit' && resolveCategory(t, classify(t)).key === cat)
    }

    if (f['sort'] === 'amount') rows = [...rows].sort((a, b) => b.amount - a.amount)
    else rows = [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

    const limit = Math.min(typeof f['limit'] === 'number' ? (f['limit'] as number) : 20, 50)
    return {
      count: rows.length,
      total: round2(rows.reduce((s, t) => s + t.amount, 0)),
      transactions: rows.slice(0, limit).map((t) => ({
        date: t.date,
        amount: round2(t.amount),
        direction: t.direction,
        description: (t.merchantName || t.description || '').trim(),
      })),
    }
  }

  /** Build a profile from whatever transactions the user already has stored. */
  async getProfileForUser(userId: string): Promise<InsightProfile> {
    const [user, accounts, transactions, rentalProfile, answers] = await Promise.all([
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
          bankAccountId: true,
        },
      }),
      db.rentalProfile.findFirst({ where: { userId, isCurrent: true } }),
      this.getQuestionAnswers(userId),
    ])

    if (!user) throw new NotFoundException('User not found')

    const txns: NormalizedTxn[] = transactions.map((t) => ({
      date: t.bookedAt.toISOString().slice(0, 10),
      amount: Math.abs(t.amount),
      direction: t.direction,
      description: t.description,
      merchantName: t.merchantName,
      accountId: t.bankAccountId,
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
      resolvedQuestionIds: Object.keys(answers),
      answers,
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
