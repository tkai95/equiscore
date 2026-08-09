import Anthropic from '@anthropic-ai/sdk'
import type { NormalizedTxn } from '../engine/types'
import { splitPdfIntoChunks } from './pdf-splitter'

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

  // Single chunk = no merging overhead, identical to the old path.
  if (chunks.length === 1) {
    return extractTransactionsFromPdf(apiKey, base64Pdf)
  }

  console.log(`PDF chunking: ${pageCount} pages → ${chunks.length} chunks`)

  const allTransactions: NormalizedTxn[] = []
  const warnings: string[] = []
  let accountHolderName: string | null = null

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

  return {
    transactions: deduped,
    accountHolderName,
    warnings,
  }
}

