import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@equiscore/database'
import { buildInsightProfile, detectInternalTransfers } from './engine'
import type { InsightProfile, NormalizedTxn, ProfileContext } from './engine'
import { parseStatementCsv } from './ingest/csv-statement'
import { classify } from './engine/classify'
import { resolveCategory } from './engine/expenses'
import { normalizeCounterparty } from './engine/normalize'
import { monthKey, toDate, round2 } from './engine/util'
import { classifyTransaction } from '../banking/transaction-classifier'
import { ScoringService } from '../scoring/scoring.service'
import { AuditService } from '../audit/audit.service'
import { InvitationEmailService } from '../common/invitation-email.service'
import type { PreviewProfileDto } from './insights.dto'
// ── Statement-ingestion rewrite (deterministic-first pipeline) ──────────────
import type { CanonicalTransaction, ExtractionResult, ValidationResult } from './ingest/canonical'
import {
  extractDocument,
  ProviderNotConfigured,
  registerExtractor,
  type ExtractorInput,
} from './ingest/extractor'
import { csvExtractor } from './ingest/csv-extractor'
import { nativePdfExtractor, classifyPdf } from './ingest/native-pdf'
import { ociExtractor } from './ingest/document-ai/oci'
import { googleExtractor } from './ingest/document-ai/google'
import { validateExtraction } from './engine/validation'
import { resolveBreaks } from './ingest/exception-resolver'

// Register extractors in preference order: cheapest-correct-path first.
// CSV + native-PDF are ~£0; cloud OCR only for scans; LLM crop is the resolver.
registerExtractor(csvExtractor)
registerExtractor(nativePdfExtractor)
registerExtractor(ociExtractor)
registerExtractor(googleExtractor)

/**
 * Apply exception-resolver corrections to the canonical transaction set. Each
 * correction splices its corrected window in place of the ±7-day region around
 * the break date. Corrections are already evidence-gated + reconciled by the
 * resolver, so this is a pure splice — no re-verification here (the caller
 * re-runs validateExtraction after applying them).
 */
function applyCorrections(
  txns: CanonicalTransaction[],
  corrections: Array<{ breakDate: string; corrected: CanonicalTransaction[] }>
): CanonicalTransaction[] {
  let working = [...txns]
  for (const c of corrections) {
    const breakTime = new Date(c.breakDate).getTime()
    const windowMs = 7 * 24 * 60 * 60 * 1000
    const outside = working.filter((t) => {
      const dt = new Date(t.date).getTime()
      return dt < breakTime - windowMs || dt > breakTime + windowMs
    })
    working = [...outside, ...c.corrected].sort((a, b) => a.date.localeCompare(b.date))
  }
  return working
}

const GAMBLING =
  /\b(bet365|paddy ?power|william ?hill|ladbrokes|betfair|sky ?bet|coral|betfred|betway|888|pokerstars|draftkings|casino|poker|gambl|lottery|lotto)\b/i

// The one tool the assistant can call to pull exact transaction evidence.
const TRANSACTION_TOOL: Anthropic.Tool = {
  name: 'get_transactions',
  description:
    "Retrieve the user's ACTUAL transactions for exact evidence. Use this whenever the question needs specific underlying data — a particular month, a category (e.g. gambling), a merchant, the biggest/smallest payments, or explaining one transaction. For general questions answerable from the snapshot (score, totals, affordability, why a tier), do NOT call this. The result tags each transaction with internal:true when it is a transfer between the user's OWN accounts; those are never income or spending. Use the returned genuineIncomeTotal and genuineSpendTotal for income/spend sums, and internalTransferTotal for own-account movement.",
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
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly email: InvitationEmailService
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
      const cutoff = new Date(Date.now() - 10 * 60 * 1000)
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

  // (The synchronous importCsv path was removed — both CSV and PDF now go
  //  through the async startCsvImportJob/startPdfImportJob → runIngestionJob
  //  pipeline, which validates before persisting. See persistVerifiedLedger.)

  // (CSV + PDF job starters and the unified runIngestionJob are defined below,
  //  alongside startPdfImportJob — both input types share the same pipeline.)

  // (The old classifyImportError helper was removed — runIngestionJob now maps
  //  failures directly via ProviderNotConfigured.failureStage + the validation
  //  result, surfacing the real failure class instead of a sanitised message.)

  /**
   * Origin to use for email CTA links. Resolved in priority order:
   *   1. PUBLIC_APP_URL — the dedicated production consumer origin for email
   *      links (set this to https://equiscore.app in prod).
   *   2. The first NON-dev entry in WEB_URL — WEB_URL doubles as a CORS
   *      allowlist and may be comma-separated, and its first entry can be a
   *      staging/dev origin (e.g. https://dev.equiscore.app). Skipping dev.*
   *      origins avoids sending users to staging AND avoids the spam-filter
   *      penalty for linking to dev subdomains from a transactional email.
   *   3. The first WEB_URL entry as a last resort.
   *   4. localhost (dev only).
   */
  private webUrl(): string {
    const explicit = this.config.get<string>('PUBLIC_APP_URL')
    if (explicit) return explicit.replace(/\/$/, '')
    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'
    const entries = webUrl.split(',').map((s) => s.trim()).filter(Boolean)
    const nonDev = entries.find((u) => !/\/\/dev\./i.test(u))
    return (nonDev ?? entries[0] ?? 'http://localhost:3000').replace(/\/$/, '')
  }

  /** Email the user that their statement analysis completed, with a score link. */
  private async notifyImportComplete(
    userId: string,
    jobId: string,
    result: {
      imported: number
      coverageStart: string
      coverageEnd: string
      overallScore: number
      overallTier: string
    }
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, profile: { select: { fullName: true } } },
    })
    if (!user?.email) {
      this.logger.warn(`Import ${jobId}: skipping completion email (no address on file)`)
      return
    }
    const first = user.profile?.fullName?.trim().split(/\s+/)[0]
    const greeting = first ? `Hi ${first},` : 'Hi,'
    const delivery = await this.email.sendBrandedEmail({
      to: user.email,
      subject: 'Your statement analysis is complete',
      eyebrow: 'Analysis complete',
      heading: 'Your statement analysis is complete',
      preview: `We analysed ${result.imported} transactions — your Trust Score is ${result.overallTier}.`,
      intro: `${greeting} we've finished reading your statement and analysed ${result.imported} transactions. Your Trust Score is now ${result.overallTier} / ${result.overallScore}.`,
      body: 'You can review the breakdown of your income, spending and commitments on your financial profile.',
      ctaLabel: 'View your score',
      ctaUrl: `${this.webUrl()}/dashboard/trust-profile/financial-profile`,
      surfaceLabel: 'Trust Profile',
    })
    this.logger.log(
      `Import ${jobId}: completion email ${delivery.sent ? 'sent' : `skipped (${delivery.reason ?? 'no reason'})`}`
    )
  }

  /** Email the user that their statement analysis failed, with a retry link. */
  private async notifyImportFailed(userId: string, jobId: string, reason: string): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, profile: { select: { fullName: true } } },
    })
    if (!user?.email) {
      this.logger.warn(`Import ${jobId}: skipping failure email (no address on file)`)
      return
    }
    const first = user.profile?.fullName?.trim().split(/\s+/)[0]
    const greeting = first ? `Hi ${first},` : 'Hi,'
    const delivery = await this.email.sendBrandedEmail({
      to: user.email,
      subject: "Action needed: we couldn't verify your statement",
      eyebrow: 'Action needed',
      heading: "We couldn't verify your statement",
      preview: 'The figures in your statement don’t reconcile — details inside.',
      intro: `${greeting} we couldn't complete the analysis because the figures in your statement don't add up. The specific problem is below — please re-upload a clearer copy or a fresh CSV export from your bank.`,
      body: reason,
      ctaLabel: 'Re-upload your statement',
      ctaUrl: `${this.webUrl()}/dashboard/connections`,
      surfaceLabel: 'Bank statements',
    })
    this.logger.log(
      `Import ${jobId}: failure email ${delivery.sent ? 'sent' : `skipped (${delivery.reason ?? 'no reason'})`}`
    )
  }

  /**
   * Start an async PDF import. Creates a job row, kicks the deterministic-first
   * pipeline in the background, returns immediately. The pipeline: classify
   * (digital vs scanned) → native text-layer extraction (digital) or cloud OCR
   * (scanned, needs provider keys) → validate → resolve exceptions (LLM crop,
   * last resort) → persist only if verified. The user can navigate away; the
   * chip polls for completion.
   */
  async startPdfImportJob(userId: string, pdfBuffer: Buffer, fileName?: string) {
    const job = await db.statementImportJob.create({
      data: { userId, sourceType: 'pdf', fileName: fileName ?? null, status: 'processing', stage: 'uploaded' },
    })
    void this.runIngestionJob(job.id, userId, { kind: 'pdf', buffer: pdfBuffer, fileName: fileName ?? null })
    return { jobId: job.id, status: job.status }
  }

  /**
   * Start an async CSV import — the deterministic ~£0 route. Same pipeline
   * shape as PDF (classify → extract → validate → resolve → persist-verified),
   * but extraction is a deterministic parse and there's no LLM crop for breaks
   * (a CSV that doesn't reconcile is a genuine source error → reject honestly).
   */
  async startCsvImportJob(userId: string, csv: string) {
    const job = await db.statementImportJob.create({
      data: { userId, sourceType: 'csv', fileName: null, status: 'processing', stage: 'uploaded' },
    })
    void this.runIngestionJob(job.id, userId, { kind: 'csv', csvText: csv, fileName: null })
    return { jobId: job.id, status: job.status }
  }

  /**
   * The unified ingestion pipeline — one implementation for every input type.
   * Classify → extract (strategy chosen by input kind) → validate → resolve
   * exceptions → persist ONLY if validation reaches `verified`. Every stage
   * transition is written to the job row + audit log so the state is observable
   * and a failure surfaces its real class (not a generic "couldn't read").
   */
  private async runIngestionJob(
    jobId: string,
    userId: string,
    input: { kind: 'pdf' | 'csv'; buffer?: Buffer; csvText?: string; fileName: string | null }
  ): Promise<void> {
    const startedAt = Date.now()
    const log = (stage: string, msg: string) =>
      this.logger.log(`Import ${jobId} [${stage}]: ${msg} (${((Date.now() - startedAt) / 1000).toFixed(0)}s)`)
    const setStage = (stage: string) =>
      db.statementImportJob.update({ where: { id: jobId }, data: { stage: stage as never } }).catch(() => undefined)

    try {
      await setStage('preflight')
      log('preflight', input.kind === 'pdf' ? `PDF ${(input.buffer?.length ?? 0 / 1024).toFixed(0)} KB` : `CSV ${(input.csvText?.length ?? 0 / 1024).toFixed(0)} KB`)

      // ── Classify ──────────────────────────────────────────────────────────
      await setStage('classified')
      let inputKind: ExtractorInput['kind']
      let pdfForCrops: Buffer | null = null
      if (input.kind === 'csv') {
        inputKind = 'csv'
      } else {
        pdfForCrops = input.buffer!
        const { classification } = await classifyPdf(input.buffer!)
        if (classification === 'scanned_pdf') {
          inputKind = 'scanned_pdf'
        } else if (classification === 'digital_pdf' || classification === 'mixed') {
          // Treat mixed as digital — native extraction handles the text pages;
          // scanned pages within a mixed doc will surface as completeness gaps
          // and can be revisited once OCR is live.
          inputKind = 'digital_pdf'
        } else {
          inputKind = 'unknown'
        }
        log('classified', `PDF classified as ${classification}`)
      }

      // ── Extract (strategy auto-selected by input kind) ────────────────────
      await setStage('extracting')
      const extractorInput: ExtractorInput = {
        kind: inputKind,
        buffer: input.buffer ?? null,
        csvText: input.csvText ?? null,
        fileName: input.fileName,
      }
      const { result: extraction, strategy } = await extractDocument(extractorInput)
      log('extracting', `${strategy} → ${extraction.transactions.length} txns`)
      this.audit.log(userId, 'statement.extracted', { jobId, strategy, count: extraction.transactions.length })

      // Cancellation checkpoint.
      const current = await db.statementImportJob.findUnique({ where: { id: jobId } })
      if (!current || current.status === 'cancelled') {
        log('extracting', 'cancelled, discarding result')
        return
      }
      if (extraction.transactions.length === 0) {
        throw new ProviderNotConfigured(
          extraction.warnings.join(' ') || 'No transactions could be read from this statement.',
          'unresolved_extraction'
        )
      }

      // ── Validate ──────────────────────────────────────────────────────────
      await setStage('validating')
      let validation: ValidationResult = validateExtraction(extraction)
      let working: CanonicalTransaction[] = extraction.transactions
      log('validating', `status=${validation.status}, breaks=${validation.breaks.length}`)

      // ── Resolve exceptions (only if there are breaks to fix) ──────────────
      if (validation.breaks.length > 0) {
        await setStage('resolving')
        const resolution = await resolveBreaks(working, validation.breaks, pdfForCrops)
        if (resolution.corrections.length > 0) {
          // Rebuild the working set from the resolver's splices and re-validate.
          // resolveBreaks returns corrections; recompute working by applying them.
          working = applyCorrections(working, resolution.corrections)
          validation = validateExtraction({ ...extraction, transactions: working })
          log('resolving', `${resolution.corrections.length} correction(s) applied → status=${validation.status}`)
          this.audit.log(userId, 'statement.corrections_applied', {
            jobId,
            corrections: resolution.corrections.length,
            unresolved: resolution.unresolved.length,
          })
        }
        if (resolution.warnings.length) {
          this.logger.warn(`Import ${jobId}: ${resolution.warnings.join('; ')}`)
        }
      }

      // ── Verified gate: only a verified ledger enters scoring ──────────────
      if (validation.status !== 'verified') {
        this.audit.log(userId, 'statement.integrity_failed', {
          jobId,
          checks: validation.checks,
          breaks: validation.breaks.length,
        })
        const firstBreak = validation.breaks[0]
        const where = firstBreak
          ? ` around ${firstBreak.date} (expected ${firstBreak.expected}, read ${firstBreak.actual})`
          : ''
        await db.statementImportJob
          .update({
            where: { id: jobId },
            data: {
              status: 'failed',
              stage: 'unresolved_extraction',
              error:
                inputKind === 'csv'
                  ? `This statement's running balance doesn't reconcile${where}. This usually means the file is incomplete or has been edited. Please upload the original, unmodified export from your bank.`
                  : `We couldn't verify this statement's figures${where}. Please upload a clearer digital PDF or a CSV export from your bank.`,
              validation: validation as never,
              completedAt: new Date(),
            },
          })
          .catch(() => undefined)
        await this.notifyImportFailed(userId, jobId, where ? `Balances don't reconcile${where}.` : 'We could not verify the statement.').catch(() => undefined)
        return
      }

      // ── Persist the verified ledger (with balance + provenance) ───────────
      await setStage('verified')
      const result = await this.persistVerifiedLedger(userId, working, {
        extractor: strategy,
        extractorVersion: extraction.extractorVersion,
        warnings: [...extraction.warnings],
        accountHolderName: extraction.accountHolderName,
        sourceAssurance: 'user_document',
        validation,
      })

      await db.statementImportJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          stage: 'complete',
          result: result as never,
          validation: validation as never,
          extractor: strategy,
          extractorVersion: extraction.extractorVersion,
          sourceAssurance: 'user_document',
          completedAt: new Date(),
        },
      })
      log('complete', `imported ${result.imported} txns`)
      this.audit.log(userId, 'statement.verified', { jobId, count: result.imported, extractor: strategy })
      await this.notifyImportComplete(userId, jobId, result).catch((e) =>
        this.logger.error(`Import ${jobId}: completion notify failed: ${e instanceof Error ? e.message : e}`)
      )
    } catch (err) {
      // Map the failure to its real class + a plain-English message.
      const stage = err instanceof ProviderNotConfigured ? err.failureStage : 'provider_error'
      const message =
        err instanceof ProviderNotConfigured
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong reading your statement.'
      this.logger.error(`Import ${jobId}: failed [${stage}] after ${((Date.now() - startedAt) / 1000).toFixed(0)}s — ${err instanceof Error ? err.message : err}`)
      await db.statementImportJob
        .update({
          where: { id: jobId },
          data: { status: 'failed', stage: stage as never, error: message, completedAt: new Date() },
        })
        .catch(() => undefined)
      await this.notifyImportFailed(userId, jobId, message).catch((e) =>
        this.logger.error(`Import ${jobId}: failure notify failed: ${e instanceof Error ? e.message : e}`)
      )
    }
  }

  // Extraction of a large statement (~5-6 min for 600+ txns) plus a bounded
  // self-healing pass can legitimately take ~12-15 min. 20 min gives headroom
  // for that real work; reaching it means the job is genuinely orphaned (a
  // crashed/deploved process), not just slow. The healing pass has its own
  // tighter wall-clock budget so it stops gracefully well before this.
  private static readonly JOB_STALE_MS = 20 * 60 * 1000

  /** A job stuck "processing" past the timeout (e.g. a container restart) reads as failed. */
  private withStaleness<T extends { status: string; createdAt: Date }>(job: T): T {
    if (job.status === 'processing' && Date.now() - job.createdAt.getTime() > InsightsService.JOB_STALE_MS) {
      this.logger.warn(
        `Import ${'id' in job ? (job as { id?: string }).id : '?'}: marked stale after ${((Date.now() - job.createdAt.getTime()) / 1000).toFixed(0)}s — likely an orphaned process (deploy/crash)`
      )
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
   * Persist a VERIFIED ledger — the only persistence path in the new pipeline.
   * Called exclusively by runIngestionJob after validation.status === 'verified',
   * so the integrity gate is upstream (validation engine) and not re-checked here.
   *
   * Unlike the old persistStatement, this persists the per-transaction running
   * BALANCE and source PROVENANCE (page/row/extractor/version) — fixing the gap
   * where the ledger was verified at ingest then became unverifiable from the DB.
   * Source assurance (user_document vs bank_api) is recorded on the job, not the
   * transactions, to keep the trust distinction explicit.
   */
  private async persistVerifiedLedger(
    userId: string,
    txns: CanonicalTransaction[],
    opts: {
      extractor: string
      extractorVersion: string
      warnings: string[]
      accountHolderName?: string | null
      sourceAssurance: 'user_document' | 'bank_api'
      validation: ValidationResult
    }
  ) {
    const dates = txns.map((t) => t.date).sort()
    const coverageStart = dates[0]!
    const coverageEnd = dates[dates.length - 1]!
    const closingBalance =
      [...txns]
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .reverse()
        .find((t) => typeof t.balance === 'number')?.balance ?? null

    // Re-upload guard: same coverage window + row count = same document re-uploaded.
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
        merchantName: null, // semantic enrichment is a separate, post-validation layer
        category: classifyTransaction({
          description: t.description ?? null,
          merchantName: null,
          amount: t.amount,
          direction: t.direction,
          tlCategory: '',
        }),
        direction: t.direction,
        // New provenance + ledger evidence columns:
        balance: t.balance,
        sourcePage: t.sourcePage,
        sourceRow: t.sourceRow,
        extractor: t.extractor,
        extractorVersion: t.extractorVersion,
      })),
      skipDuplicates: true,
    })

    this.audit.log(userId, 'statement.imported', {
      connectionId: connection.id,
      extractor: opts.extractor,
      transactions: txns.length,
      coverageStart,
      coverageEnd,
      sourceAssurance: opts.sourceAssurance,
    })

    const score = await this.scoringService.recompute(userId)

    return {
      connectionId: connection.id,
      imported: txns.length,
      skipped: 0,
      coverageStart,
      coverageEnd,
      closingBalance,
      ledgerVerified: opts.validation.status === 'verified',
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
    onToken: (t: string) => void,
    onTool: (name: string) => void = () => {}
  ): Promise<void> {
    const system = this.chatSystem(await this.buildChatContext(userId))
    await this.streamAssistant(userId, system, history.slice(-8), message, onToken, onTool)
    this.audit.log(userId, 'insight.chat', { chars: message.length, stream: true })
  }

  private chatSystem(context: string): string {
    return `You are the EquiScore assistant. EquiScore turns someone's bank data into a shareable Trust Profile — a score out of 100 and a tier from A (best) to E — that proves their financial reliability to landlords and lenders, alongside deep insight into their income, spending, affordability, and payment reliability.

RULES:
- Answer general questions (score, tier, why a tier, totals, affordability, how-to) from the SNAPSHOT below. Be specific with figures and always use £. Never invent numbers.
- CRITICAL — internal transfers: money the user moves between their OWN accounts (e.g. salary account → expenses account → savings account) is NOT income and NOT spending. The Income figure in the snapshot already nets these out. NEVER add transfer credits to income, never call an internal transfer "income", "inflow", or "earnings", and never report a "gross inflow" that sums money moving between the user's own accounts. When asked how money moves, describe transfers between their own accounts as internal movement, explicitly separate from their genuine income. The genuine income is the snapshot Income figure — treat it as canonical.
- For questions that need exact underlying evidence — a specific month, a category like gambling, a merchant, the biggest/smallest payments, or explaining one transaction — call the get_transactions tool to fetch the real transactions, then answer from what it returns. Do not guess at specifics the snapshot doesn't contain. If you sum raw transactions yourself, exclude transfers between the user's own accounts from any income total.
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
        `Income (genuine external income — transfers between the user's own accounts are already excluded): about £${p.income.averageMonthlyIncome}/month, ${p.income.primaryCharacter}, ${p.income.consistency}${p.income.recurringSalaryDetected ? ', recurring salary detected' : ''}. Sources: ${p.income.sources.map((s) => `${s.name} £${s.monthlyAverage}/mo`).join(', ')}. This is the canonical income figure — do NOT add internal transfers to it.`
      )
      if (p.internalTransfersMonthly > 0) {
        lines.push(
          `Internal transfers between the user's OWN connected accounts: about £${p.internalTransfersMonthly}/month. This is money moving between their own accounts (e.g. salary account to expenses/savings) — it is NOT income and NOT spending, and is already excluded from both figures above.`
        )
      }
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
    onToken: (t: string) => void,
    onTool: (name: string) => void
  ): Promise<void> {
    // GLM is the default; Anthropic is the fallback. Both support the
    // transaction tool (GLM via OpenAI-compatible function calling).
    const glmKey = process.env['GLM_API_KEY']
    if (glmKey) {
      await this.streamWithGlm(glmKey, userId, system, history, message, onToken, onTool)
      return
    }
    const anthropicKey = process.env['ANTHROPIC_API_KEY']
    if (anthropicKey) {
      await this.streamWithAnthropic(anthropicKey, userId, system, history, message, onToken, onTool)
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
    onToken: (t: string) => void,
    onTool: (name: string) => void
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
        max_tokens: 4096,
        system,
        tools: [TRANSACTION_TOOL],
        messages,
      })
      stream.on('text', (t) => onToken(t))
      const final = await stream.finalMessage()

      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      this.logger.log(`Anthropic chat step=${step} tools=${toolUses.length} stop=${final.stop_reason}`)
      if (toolUses.length === 0) return

      messages.push({ role: 'assistant', content: final.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        onTool(tu.name)
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
    onToken: (t: string) => void,
    onTool: (name: string) => void
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
          body: JSON.stringify({ model, max_tokens: 4096, stream: true, tools, messages }),
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
        let finishReason: string | null = null
        let contentChars = 0
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
                  finish_reason?: string | null
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
              const choice = j.choices?.[0]
              if (choice?.finish_reason) finishReason = choice.finish_reason
              const delta = choice?.delta
              if (delta?.content) {
                contentChars += delta.content.length
                onToken(delta.content)
              }
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
        // Diagnostics: how each streaming step ended. A stream that stops with no
        // [DONE] (streamDone=false) is a dropped connection; finish_reason
        // 'length' is a max_tokens truncation; 'stop' is a clean finish.
        this.logger.log(
          `GLM chat step=${step} calls=${calls.length} chars=${contentChars} finish=${finishReason ?? 'none'} clean=${streamDone}`
        )
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
          onTool(c.name)
          const out = await this.runChatTool(userId, c.name, input)
          messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(out) })
        }
      }
    } catch (err) {
      this.logger.warn(`GLM stream error: ${err instanceof Error ? err.message : err}`)
      // If nothing was streamed yet, fall back to Anthropic (also tool-capable).
      const anthropicKey = process.env['ANTHROPIC_API_KEY']
      if (anthropicKey) {
        await this.streamWithAnthropic(anthropicKey, userId, system, history, message, onToken, onTool)
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
    // Deterministically identify transfers between the user's own accounts so the
    // assistant can never mistake them for income or spending — each row is
    // tagged, and the totals separate genuine flows from internal movement.
    const internal = detectInternalTransfers(txns)
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

    // Totals split three ways so any income/spend sum excludes internal movement.
    const externalCredits = rows.filter((t) => t.direction === 'credit' && !internal.has(t))
    const externalDebits = rows.filter((t) => t.direction === 'debit' && !internal.has(t))
    const internalRows = rows.filter((t) => internal.has(t))

    return {
      count: rows.length,
      total: round2(rows.reduce((s, t) => s + t.amount, 0)),
      genuineIncomeTotal: round2(externalCredits.reduce((s, t) => s + t.amount, 0)),
      genuineSpendTotal: round2(externalDebits.reduce((s, t) => s + t.amount, 0)),
      internalTransferTotal: round2(internalRows.reduce((s, t) => s + t.amount, 0)),
      note: "Rows with internal:true are transfers between the user's OWN accounts. They are NOT income and NOT spending — never include them in an income or spending total. Use genuineIncomeTotal / genuineSpendTotal for those.",
      transactions: rows.slice(0, limit).map((t) => ({
        date: t.date,
        amount: round2(t.amount),
        direction: t.direction,
        description: (t.merchantName || t.description || '').trim(),
        internal: internal.has(t),
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
      select: {
        bookedAt: true,
        amount: true,
        direction: true,
        description: true,
        merchantName: true,
        bankAccountId: true,
      },
    })
    return rows.map((t) => ({
      date: t.bookedAt.toISOString().slice(0, 10),
      amount: Math.abs(t.amount),
      direction: t.direction,
      description: t.description,
      merchantName: t.merchantName,
      accountId: t.bankAccountId,
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
