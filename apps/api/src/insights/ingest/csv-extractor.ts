/**
 * CSV extraction strategy — wraps the existing deterministic `parseStatementCsv`
 * into the canonical `ExtractionResult`.
 *
 * This is the ~£0, highest-confidence route for structured rows. No OCR, no
 * model. The parser already handles comma/quote/UK-date/signed-amount/split-
 * column variations; we just lift its output into canonical transactions with
 * provenance (row index = sourceRow, since CSV has no pages) and surface the
 * statement-period candidates for the validator.
 *
 * Source assurance is `user_document` (a CSV is editable, unattested) — that is
 * set by the caller, not here, since the same extractor output flows from
 * Open Banking too in principle.
 */
import type { CanonicalTransaction, ExtractionResult } from './canonical'
import { type DocumentExtractor } from './extractor'
import { parseStatementCsv } from './csv-statement'

const EXTRACTOR = 'csv'
const VERSION = 'deterministic-1'

/** Lift a parsed NormalizedTxn into a CanonicalTransaction with row provenance. */
function toCanonical(
  txns: ReturnType<typeof parseStatementCsv>['transactions'],
  /** The original rows, so we can capture raw text evidence per transaction. */
  warnings: string[]
): CanonicalTransaction[] {
  // parseStatementCsv drops row index info, but its output is in source order;
  // we record the (1-based) source row from the position. Description/balance
  // raw text is the normalised value (CSV cells ARE the raw text).
  return txns.map((t, i) => ({
    date: t.date,
    amount: t.amount,
    direction: t.direction,
    description: t.description,
    balance: t.balance ?? null,
    dateRaw: t.date,
    descriptionRaw: t.description,
    amountRaw: String(t.amount),
    balanceRaw: t.balance != null ? String(t.balance) : null,
    sourcePage: null, // CSV has no pages
    sourceRow: i + 2, // 1-based, accounting for the header row at index 0
    extractor: EXTRACTOR,
    extractorVersion: VERSION,
    confidence: null, // deterministic parse — no OCR confidence concept
  }))
}

export const csvExtractor: DocumentExtractor = {
  strategy: 'csv',
  canHandle: (input) => input.kind === 'csv',
  extract: async (input) => {
    if (!input.csvText) {
      throw new Error('CSV extractor selected but no CSV text was provided.')
    }
    const parsed = parseStatementCsv(input.csvText)
    const transactions = toCanonical(parsed.transactions, parsed.warnings)

    // Statement-period candidates: derived from the transaction date range.
    // These are candidates — the validator checks them, doesn't assume them.
    const dates = transactions.map((t) => t.date).sort()
    const statementPeriodStart = dates[0] ?? null
    const statementPeriodEnd = dates[dates.length - 1] ?? null

    const result: ExtractionResult = {
      transactions,
      accountHolderName: null, // CSV rarely carries a reliable header name
      // Opening/closing balance candidates from the first/last printed balance.
      openingBalance: transactions.length > 0 ? (transactions[0]!.balance ?? null) : null,
      closingBalance: transactions.length > 0 ? (transactions[transactions.length - 1]!.balance ?? null) : null,
      statementPeriodStart,
      statementPeriodEnd,
      pagesProcessed: 1,
      pagesExpected: 1,
      warnings: parsed.warnings,
      extractor: EXTRACTOR,
      extractorVersion: VERSION,
    }
    return result
  },
}
