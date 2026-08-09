import Anthropic from '@anthropic-ai/sdk'
import type { NormalizedTxn } from '../engine/types'
import { splitPdfIntoChunks } from './pdf-splitter'
import { checkBalanceContinuity, findBreakContext, windowReconciles, type BreakContext } from '../engine/integrity'

/**
 * PDF bank-statement extraction via Claude vision.
 *
 * This is the ONE place AI enters the pipeline, and only at the extraction
 * boundary: Claude turns the pixels/text of a statement (typed e-statement OR
 * scanned photo) into structured transaction rows. Everything downstream —
 * classification, recurrence, scoring, and the balance-continuity check — stays
 * deterministic. The integrity check doubles as an accuracy guard: if Claude
 * misreads an amount, the running balance won't reconcile and the import is
 * rejected, so a hallucinated figure can't quietly inflate a score.
 */

export interface PdfExtractionResult {
  transactions: NormalizedTxn[]
  accountHolderName: string | null
  warnings: string[]
}

const EXTRACTION_PROMPT = `You are extracting transactions from a UK bank statement (it may be a typed PDF or a scan/photo).

Return ONLY a JSON object, no markdown, no commentary, in exactly this shape:
{
  "accountHolderName": string | null,   // the account holder's name from the statement header, or null
  "transactions": [
    {
      "date": "YYYY-MM-DD",              // the transaction date, ISO format
      "description": string,             // the full merchant/payee/reference text, joined if it wraps lines
      "amount": number,                  // POSITIVE magnitude, no currency symbol or commas
      "direction": "credit" | "debit",   // credit = money in, debit = money out
      "balance": number | null           // the running balance AFTER this transaction, or null if the statement shows no balance column
    }
  ]
}

Rules:
- Extract EVERY transaction line, in chronological order (oldest first).
- If debits and credits are in separate columns, infer direction from which column the value is in.
- If there is a single signed amount column, a negative value is a debit and a positive value is a credit; output amount as a positive number and set direction accordingly.
- Copy the running balance EXACTLY as printed (it is used to verify accuracy) — do not compute or "correct" it.
- Do NOT include opening/closing balance summary rows, headers, page footers, interest-rate notices, or marketing text as transactions.
- If a value is genuinely unreadable, omit that single row rather than guessing.
- Output only the JSON object.`

/** Best-effort JSON extraction: strip any prose/markdown fences the model may add. */
function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) throw new Error('No JSON object found in model output')
  return text.slice(start, end + 1)
}

export async function extractTransactionsFromPdf(
  apiKey: string,
  base64Pdf: string
): Promise<PdfExtractionResult> {
  const client = new Anthropic({ apiKey })

  // A hung model call must never leave the import "processing" forever — abort
  // after a generous ceiling and surface a clean, retryable error instead.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000)

  let message
  try {
    // Stream so a large statement's output can't hit an HTTP timeout.
    // Sonnet 5: native PDF (typed + scanned), cheaper than Opus. Thinking is
    // OFF: this is mechanical structured extraction, not reasoning, so thinking
    // only adds latency; the balance-continuity check downstream guards accuracy.
    const stream = client.messages.stream(
      {
        model: 'claude-sonnet-5',
        // A full statement can run to hundreds of transactions; 32k truncated the
        // JSON mid-array (a parse failure that reads as "couldn't read reliably").
        // 64k is Sonnet 5's output ceiling and covers ~1,000+ transactions.
        max_tokens: 64000,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
              },
              { type: 'text', text: EXTRACTION_PROMPT },
            ],
          },
        ],
      },
      { signal: controller.signal }
    )
    message = await stream.finalMessage()
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error('The statement took too long to read. Please try again, or use a CSV export.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  if (message.stop_reason === 'refusal') {
    throw new Error('The statement could not be processed.')
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  let parsed: { accountHolderName?: string | null; transactions?: unknown[] }
  try {
    parsed = JSON.parse(extractJson(text))
  } catch {
    // A parse failure usually means the output was truncated — surface it clearly.
    throw new Error('Could not read the statement reliably. Please try a clearer copy or a CSV export.')
  }

  const warnings: string[] = []
  const transactions: NormalizedTxn[] = []

  for (const raw of parsed.transactions ?? []) {
    const t = raw as Record<string, unknown>
    const date = typeof t.date === 'string' ? t.date : null
    const amount = typeof t.amount === 'number' ? Math.abs(t.amount) : null
    const direction = t.direction === 'credit' || t.direction === 'debit' ? t.direction : null
    if (!date || amount === null || !direction || Number.isNaN(new Date(date).getTime())) continue

    transactions.push({
      date,
      amount,
      direction,
      description: typeof t.description === 'string' ? t.description : null,
      merchantName: null,
      balance: typeof t.balance === 'number' ? t.balance : null,
    })
  }

  if (transactions.length === 0) {
    warnings.push('No transactions could be read from this statement.')
  }

  return {
    transactions,
    accountHolderName:
      typeof parsed.accountHolderName === 'string' ? parsed.accountHolderName : null,
    warnings,
  }
}

// ── Self-healing: targeted re-read of a misread region ──────────────────────
//
// When the balance-continuity check finds a break, the surrounding balances are
// still trusted (they reconciled). So instead of giving up on the whole
// statement, we hand Claude the break context — the known-good balances
// bracketing the break, plus what we currently read in that window — and ask it
// to re-read JUST that region, then VERIFY the result actually reconciles
// before keeping it. We never accept an unverified splice: if the re-read
// doesn't fix the break, we revert and the break persists. There is NO
// downstream tolerance — a break that survives healing means the data is
// genuinely wrong, and persistStatement rejects it. That keeps the integrity
// guarantee intact: only reconciling data ever gets scored.

/** Don't attempt more break fixes than this — a clearly-tampered statement can
 *  produce dozens and we'd burn Claude calls for nothing. Cap reached ⇒ reject.
 *  Set high: a chunked 600+ transaction statement can legitimately produce many
 *  chunk-boundary breaks, each individually fixable, and we'd rather try (and
 *  log what we find) than silently bail. */
const HEAL_MAX_ATTEMPTS = 20
/** Re-read tries per break: a second attempt, re-prompted with the new error,
 *  catches a re-read that was itself slightly off. */
const HEAL_MAX_RETRIES_PER_BREAK = 2
/** Wall-clock budget for the whole healing pass. Extraction of a large statement
 *  already takes several minutes; healing must finish well inside the job's
 *  staleness ceiling or the whole import times out. When the budget is up, we
 *  stop fixing remaining breaks (keeping whatever we fixed) and let the
 *  integrity gate decide — graceful, not an opaque timeout. */
const HEAL_TIME_BUDGET_MS = 6 * 60 * 1000

/**
 * A chunk's sub-PDF plus the transactions extracted from it, kept so self-healing
 * can re-read ONLY the relevant pages around a break (seconds) instead of
 * re-sending the whole document (a minute+ per call). Built during extraction.
 */
interface ChunkIndex {
  base64: string
  startPage: number
  endPage: number
  txns: NormalizedTxn[]
}

/** Builds the targeted re-read prompt from a break context. */
function buildRereadPrompt(ctx: BreakContext): string {
  const lines = ctx.windowTxns.map(
    (t) =>
      `  ${t.date} | ${t.direction === 'credit' ? '+' : '-'}${t.amount.toFixed(2)} | balance: ${t.balance ?? '?'} | ${t.description ?? ''}`
  )
  // Quantify the gap so Claude knows the exact magnitude it's hunting for —
  // this is a strong signal: a gap of exactly 2× a transaction's amount almost
  // always means a direction (credit/debit) was flipped; a gap equal to a
  // missing transaction's amount means a row was dropped or duplicated.
  const gap =
    ctx.beforeBalance !== null && ctx.afterBalance !== null
      ? `\nThe running balance is off by ${Math.abs(ctx.afterBalance - ctx.beforeBalance).toFixed(2)} across this window. A gap of exactly 2× some transaction's amount usually means that transaction's direction (credit vs debit) was read backwards. A gap equal to a transaction's amount usually means a row was dropped or duplicated.`
      : ''

  return `You previously extracted transactions from a UK bank statement, but the running balance does NOT reconcile around ${ctx.breakDate}.

A different process independently verified these anchor balances are CORRECT (they reconciled with the surrounding rows):
- Balance immediately BEFORE the break: ${ctx.beforeBalance ?? 'unknown'}
- Balance at/after the break: ${ctx.afterBalance ?? 'unknown'}

What we currently have in that window (date | amount | balance | description):
${lines.join('\n')}
${gap}

One of the rows in this window was misread. The most common causes, in order: (1) a transaction's DIRECTION was flipped (credit read as debit or vice-versa) — this doubles the error; (2) a row was dropped or duplicated; (3) an amount digit was misread; (4) the running balance was copied wrong. Look very carefully at the same pages of the statement and re-extract ONLY the transactions within roughly 7 days of ${ctx.breakDate}, correcting whichever of these errors occurred.

Return ONLY a JSON object, no markdown, no commentary, in exactly this shape:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": string,
      "amount": number,
      "direction": "credit" | "debit",
      "balance": number | null
    }
  ]
}

Rules:
- The amounts and balances MUST connect ${ctx.beforeBalance ?? 'the prior balance'} to ${ctx.afterBalance ?? 'the following balance'} exactly — verify this yourself before returning.
- Copy the running balance EXACTLY as printed on the statement — do not compute or "correct" it.
- Include EVERY transaction line in that window, in chronological order. Do not include transactions outside the window.
- If a row is genuinely unreadable, omit it rather than guessing.
- Output only the JSON object.`
}

/**
 * Targeted re-read of the region around a balance break. Same model + limits +
 * abort as the main extractor, but with a focused prompt that gives Claude the
 * trusted anchor balances and asks it to fix only the suspect window. Returns
 * the corrected transactions for that window (to splice back in).
 */
async function rereadTransactionsFromPdf(
  apiKey: string,
  base64Pdf: string,
  ctx: BreakContext
): Promise<NormalizedTxn[]> {
  const client = new Anthropic({ apiKey })
  const controller = new AbortController()
  // Per-call ceiling is shorter than the overall healing budget so a single
  // stuck re-read can't eat the whole budget. 90s is plenty for a page-scoped
  // re-read (the slow case was re-reading the WHOLE document).
  const timeout = setTimeout(() => controller.abort(), 90 * 1000)
  const startedAt = Date.now()

  let message
  try {
    const stream = client.messages.stream(
      {
        model: 'claude-sonnet-5',
        max_tokens: 16000,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
              },
              { type: 'text', text: buildRereadPrompt(ctx) },
            ],
          },
        ],
      },
      { signal: controller.signal }
    )
    message = await stream.finalMessage()
  } catch (err) {
    if (controller.signal.aborted) {
      console.log(`Self-healing: re-read aborted after ${((Date.now() - startedAt) / 1000).toFixed(0)}s (page-scoped ceiling)`)
      return [] // a heal timeout isn't fatal — the break stays and the statement rejects
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  let parsed: { transactions?: unknown[] }
  try {
    parsed = JSON.parse(extractJson(text))
  } catch {
    return [] // unparseable heal response — give up on this break, not fatal
  }

  const out: NormalizedTxn[] = []
  for (const raw of parsed.transactions ?? []) {
    const t = raw as Record<string, unknown>
    const date = typeof t.date === 'string' ? t.date : null
    const amount = typeof t.amount === 'number' ? Math.abs(t.amount) : null
    const direction = t.direction === 'credit' || t.direction === 'debit' ? t.direction : null
    if (!date || amount === null || !direction || Number.isNaN(new Date(date).getTime())) continue
    out.push({
      date,
      amount,
      direction,
      description: typeof t.description === 'string' ? t.description : null,
      merchantName: null,
      balance: typeof t.balance === 'number' ? t.balance : null,
    })
  }
  console.log(`Self-healing: re-read returned ${out.length} txn(s) in ${((Date.now() - startedAt) / 1000).toFixed(0)}s`)
  return out
}

/**
 * Splice a re-read into the full transaction set, replacing the ±window around
 * the break date. Pure — returns the new array, doesn't mutate input.
 */
function spliceWindow(all: NormalizedTxn[], breakDate: string, replacement: NormalizedTxn[]): NormalizedTxn[] {
  const breakTime = new Date(breakDate).getTime()
  const windowMs = 7 * 24 * 60 * 60 * 1000
  const outside = all.filter((t) => {
    const dt = new Date(t.date).getTime()
    return dt < breakTime - windowMs || dt > breakTime + windowMs
  })
  return [...outside, ...replacement].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Targeted self-healing of balance breaks. For each break: ask Claude to re-read
 * the region, splice the result in, and VERIFY it actually reconciles before
 * keeping it. If the splice doesn't fix the break (or introduces new ones), it's
 * reverted and the original break stands — we never ship an unverified fix.
 * Each break is retried once with an updated prompt if the first re-read fails.
 *
 * Because there is no downstream tolerance, this MUST be honest: a break that
 * survives healing means the data is genuinely wrong and persistStatement will
 * reject it. That's the correct outcome — wrong data should not be scored.
 */
/**
 * Find the chunk whose extracted transactions bracket a break date. Each chunk
 * covers a contiguous page range, so its transactions cover a contiguous date
 * range — the chunk containing the break date (or nearest before it) holds the
 * page we need to re-read. Falls back to the whole-document base64 if no chunk
 * matches (defensive; shouldn't happen).
 */
function chunkForBreak(chunks: ChunkIndex[], breakDate: string): { base64: string; label: string } {
  const breakTime = new Date(breakDate).getTime()
  // Pick the chunk whose transaction date range contains the break, else the
  // chunk whose max date is closest to (and before) the break.
  let best = chunks[0]
  let bestDist = Infinity
  for (const c of chunks) {
    if (c.txns.length === 0) continue
    const times = c.txns.map((t) => new Date(t.date).getTime())
    const min = Math.min(...times)
    const max = Math.max(...times)
    if (breakTime >= min && breakTime <= max) {
      return { base64: c.base64, label: `pages ${c.startPage + 1}–${c.endPage}` }
    }
    const dist = Math.min(Math.abs(breakTime - min), Math.abs(breakTime - max))
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best ? { base64: best.base64, label: `pages ${best.startPage + 1}–${best.endPage}` } : { base64: '', label: 'no chunk' }
}

async function healBreaks(
  apiKey: string,
  chunks: ChunkIndex[],
  fallbackBase64: string,
  txns: NormalizedTxn[]
): Promise<{ transactions: NormalizedTxn[]; warnings: string[] }> {
  const warnings: string[] = []
  let current = txns
  const healStartedAt = Date.now()

  let integrity = checkBalanceContinuity(current)
  if (integrity.continuous || !integrity.hasBalances) return { transactions: current, warnings }

  // Always log the situation we found, even if we cap out — a silent bail made
  // this undiagnosable in production. We attempt up to HEAL_MAX_ATTEMPTS breaks;
  // any beyond that are left to reject downstream (and logged here so it's clear
  // why healing stopped).
  const totalBreaks = integrity.breaks.length
  const breaksToFix = integrity.breaks.slice(0, HEAL_MAX_ATTEMPTS)
  if (totalBreaks > HEAL_MAX_ATTEMPTS) {
    console.log(
      `Self-healing: ${totalBreaks} breaks found — capping at ${HEAL_MAX_ATTEMPTS} attempts (remainder will reject if unresolved)`
    )
    warnings.push(
      `Statement had ${totalBreaks} balance breaks; attempted the first ${HEAL_MAX_ATTEMPTS}.`
    )
  }

  console.log(
    `Self-healing: attempting ${breaksToFix.length} break(s), largest drift ${Math.max(
      ...breaksToFix.map((b) => Math.abs(b.expected - b.actual))
    ).toFixed(2)} — targeted page-scoped re-read (budget ${HEAL_TIME_BUDGET_MS / 1000}s)`
  )

  let fixed = 0
  for (const brk of breaksToFix) {
    // Wall-clock budget: stop before we blow the job staleness ceiling. Keep
    // whatever we've fixed so far and let the integrity gate judge the rest.
    const elapsed = Date.now() - healStartedAt
    if (elapsed > HEAL_TIME_BUDGET_MS) {
      const remaining = breaksToFix.length - fixed - 0
      console.log(
        `Self-healing: stopping after ${(elapsed / 1000).toFixed(0)}s — budget reached with ${remaining} break(s) unattempted (keeping ${fixed} fix(es))`
      )
      warnings.push(`Self-healing stopped early: time budget reached with breaks still outstanding.`)
      break
    }

    // Re-locate the break each iteration: a prior splice may have shifted it.
    integrity = checkBalanceContinuity(current)
    const liveBreak = integrity.breaks.find((b) => b.date === brk.date && b.expected === brk.expected)
    if (!liveBreak) continue // already resolved by an earlier splice

    // Pick the page-scoped sub-PDF for THIS break (seconds to re-read) instead
    // of re-sending the whole document (a minute+). This is what makes healing
    // viable on a large statement without timing out.
    const target = chunkForBreak(chunks, liveBreak.date)
    const reReadBase64 = target.base64 || fallbackBase64

    for (let attempt = 1; attempt <= HEAL_MAX_RETRIES_PER_BREAK; attempt++) {
      try {
        const ctx = findBreakContext(current, liveBreak)
        const corrected = await rereadTransactionsFromPdf(apiKey, reReadBase64, ctx)
        console.log(
          `Self-healing ${liveBreak.date} (attempt ${attempt}, ${target.label}): got ${corrected.length} txn(s)` +
            ` (was ${ctx.windowTxns.length}); anchors before=${ctx.beforeBalance} after=${ctx.afterBalance}`
        )
        if (corrected.length === 0) break // nothing to splice — give up on this break

        // VERIFY LOCALLY: do the corrected rows connect the trusted before/after
        // anchors? This is the real correctness question — it's immune to the
        // splice shifting break dates/signatures elsewhere, which the old global
        // break-count check was not. A window that reconciles is a correct fix.
        const reconciled = windowReconciles(corrected, ctx.beforeBalance, ctx.afterBalance)
        if (reconciled) {
          current = spliceWindow(current, liveBreak.date, corrected)
          console.log(`Self-healing: break around ${liveBreak.date} resolved on attempt ${attempt}`)
          fixed++
          break // success — move to next break
        }
        // Didn't reconcile — if we have a retry left, loop; else abandon.
        if (attempt === HEAL_MAX_RETRIES_PER_BREAK) {
          warnings.push(`Could not reconcile balances around ${liveBreak.date} after ${attempt} re-read attempt(s).`)
          console.log(
            `Self-healing: ${liveBreak.date} NOT resolved after ${attempt} attempt(s) — window did not connect anchors`
          )
        }
      } catch (err) {
        warnings.push(
          `Self-heal error around ${liveBreak.date}: ${err instanceof Error ? err.message : 'unknown error'}`
        )
        break
      }
    }
  }

  const after = checkBalanceContinuity(current)
  if (after.continuous) {
    console.log(`Self-healing: all balances now reconcile (fixed ${fixed} break(s) in ${((Date.now() - healStartedAt) / 1000).toFixed(0)}s)`)
  } else {
    console.log(
      `Self-healing: ${after.breaks.length} break(s) remain unreconciled after ${((Date.now() - healStartedAt) / 1000).toFixed(0)}s — statement will be rejected`
    )
  }

  return { transactions: current, warnings }
}

/**
 * Extract transactions from a PDF that may be too large for a single Claude
 * call (1,000+ transactions would truncate the 64k output token ceiling).
 *
 * Splits the PDF into ~15-page chunks, extracts each via Claude sequentially,
 * then merges + deduplicates the results into one transaction array. The
 * integrity check downstream runs once on the full merged set, so balances
 * still reconcile across the whole document.
 *
 * Small statements (≤15 pages) produce a single chunk and take the exact same
 * code path as extractTransactionsFromPdf — no behaviour change.
 *
 * @param isCancelled  optional async check called between chunks; if it
 *   resolves true, remaining chunks are skipped and whatever has been
 *   extracted so far is returned with a cancellation warning.
 */
export async function extractTransactionsFromLargePdf(
  apiKey: string,
  base64Pdf: string,
  isCancelled?: () => Promise<boolean>,
): Promise<PdfExtractionResult> {
  const pdfBuffer = Buffer.from(base64Pdf, 'base64')
  const { pageCount, chunks } = await splitPdfIntoChunks(pdfBuffer)

  // Single chunk = no merging overhead, but still run the self-healing pass so
  // a small statement with one OCR misread isn't hard-rejected downstream.
  if (chunks.length === 1) {
    const result = await extractTransactionsFromPdf(apiKey, base64Pdf)
    if (result.transactions.length === 0) return result
    // One chunk → the whole document is the only page scope available.
    const chunkIndex: ChunkIndex[] = [
      { base64: base64Pdf, startPage: chunks[0]!.startPage, endPage: chunks[0]!.endPage, txns: result.transactions },
    ]
    const healed = await healBreaks(apiKey, chunkIndex, base64Pdf, result.transactions)
    return { ...result, transactions: healed.transactions, warnings: [...result.warnings, ...healed.warnings] }
  }

  console.log(`PDF chunking: ${pageCount} pages → ${chunks.length} chunks`)

  const allTransactions: NormalizedTxn[] = []
  const warnings: string[] = []
  let accountHolderName: string | null = null
  // Per-chunk index kept for self-healing: lets a targeted re-read send only the
  // page range around a break (seconds) instead of the whole document (a minute+).
  const chunkIndex: ChunkIndex[] = []

  for (let i = 0; i < chunks.length; i++) {
    // Cooperative cancellation between chunks.
    if (isCancelled && (await isCancelled())) {
      warnings.push('Import was cancelled — only partial transactions were extracted.')
      break
    }

    const chunk = chunks[i]!
    console.log(`  Extracting chunk ${i + 1}/${chunks.length} (pages ${chunk.startPage + 1}–${chunk.endPage})`)

    const result = await extractTransactionsFromPdf(apiKey, chunk.base64)
    allTransactions.push(...result.transactions)
    warnings.push(...result.warnings)
    if (result.accountHolderName && !accountHolderName) {
      accountHolderName = result.accountHolderName
    }
    chunkIndex.push({ base64: chunk.base64, startPage: chunk.startPage, endPage: chunk.endPage, txns: result.transactions })
  }

  // Deduplicate at chunk boundaries: overlapping pages or repeated rows produce
  // identical (date, amount, direction, description) tuples that would break the
  // balance-continuity integrity check downstream.
  const seen = new Set<string>()
  const deduped = allTransactions.filter((txn) => {
    const key = `${txn.date}|${txn.amount}|${txn.direction}|${txn.description ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort oldest-first so the integrity check and engine see chronological order.
  deduped.sort((a, b) => a.date.localeCompare(b.date))

  if (allTransactions.length !== deduped.length) {
    console.log(`  Deduped ${allTransactions.length - deduped.length} overlapping transactions`)
  }

  if (deduped.length === 0) {
    warnings.push('No transactions could be read from this statement.')
  }

  // Self-healing pass: if the merged set has a few small balance breaks (the
  // signature of an OCR misread, not tampering), re-read just those regions and
  // splice the corrections back in. Best-effort — failures fall through and the
  // break either tolerates or rejects in persistStatement. Uses the per-chunk
  // index so each re-read is page-scoped (fast) instead of whole-document.
  let transactions = deduped
  if (deduped.length > 0) {
    const healed = await healBreaks(apiKey, chunkIndex, base64Pdf, deduped)
    transactions = healed.transactions
    warnings.push(...healed.warnings)
  }

  return {
    transactions,
    accountHolderName,
    warnings,
  }
}

