/**
 * Shared infrastructure for the cloud OCR / Document AI extractors (OCI, Google).
 *
 * Both follow the same cascade from the roadmap:
 *   scan → cheap OCR → our bank-table parser → does it reconcile?
 *        → if no, better layout extraction → does it reconcile?
 *        → if no, hand back for LLM crop escalation
 *
 * The provider-specific adapters supply two calls — cheap OCR (raw text + page
 * images) and full layout extraction (structured rows) — and this base wires
 * them into the canonical ExtractionResult + the reconcile gate. Providers are
 * swappable; the benchmark harness exercises each via forceStrategy.
 *
 * Until a provider's env keys are configured, `isConfigured` returns false and
 * `canHandle` returns false — so the dispatcher skips it and a scan rejects
 * cleanly as `needs_better_source` rather than erroring.
 */
import type { CanonicalTransaction, ExtractionResult } from '../canonical'
import type { DocumentExtractor, ExtractionStrategy } from '../extractor'
import { ProviderNotConfigured } from '../extractor'

/** Raw OCR text + optional page images for one page, from a cheap-OCR pass. */
export interface OcrPage {
  pageNumber: number
  text: string
}

/** A structured row from a full layout extraction (provider gives cells + confidence). */
export interface LayoutRow {
  pageNumber: number
  rowIndex: number
  cells: Record<string, { text: string; confidence?: number }>
}

/** What each provider adapter must supply. */
export interface ProviderAdapter {
  strategy: ExtractionStrategy
  /** True only when the provider's env credentials are present. */
  isConfigured(): boolean
  /** Human-readable version/config string for provenance. */
  version(): string
  /** Cheap OCR pass: raw text per page. Low cost, used first. */
  cheapOcr(buffer: Buffer): Promise<OcrPage[]>
  /** Full layout extraction: structured rows. Higher cost, used on reconcile failure. */
  layoutExtract(buffer: Buffer): Promise<LayoutRow[]>
}

/**
 * Build the DocumentExtractor for a provider from its adapter. Implements the
 * cascade: try cheap OCR → parse → if the result has a balance column and looks
 * like it might reconcile, return it (the validator is the real arbiter); if
 * cheap OCR produced nothing usable, escalate to full layout extraction.
 *
 * NOTE: this v1 runs cheap OCR first and falls back to layout. The per-row
 * escalate-on-fail refinement (only re-extract the single breaking row) is the
 * exception resolver's job (Step 5), which calls back with a targeted page.
 */
export function makeProviderExtractor(adapter: ProviderAdapter): DocumentExtractor {
  return {
    strategy: adapter.strategy,
    canHandle: (input) =>
      adapter.isConfigured() && (input.kind === 'scanned_pdf' || input.kind === 'image'),
    extract: async (input) => {
      if (!adapter.isConfigured()) {
        throw new ProviderNotConfigured(
          `${adapter.strategy} is not configured (missing credentials). Upload a digital PDF or CSV instead.`,
          'needs_better_source'
        )
      }
      if (!input.buffer) throw new Error(`${adapter.strategy}: no buffer provided.`)

      const warnings: string[] = []
      let transactions: CanonicalTransaction[] = []

      // Pass 1: cheap OCR → parse the raw text per page like a flat transcript.
      try {
        const pages = await adapter.cheapOcr(input.buffer)
        transactions = parseOcrPages(pages, adapter.strategy, adapter.version())
        if (transactions.length === 0) {
          warnings.push('Cheap OCR yielded no transaction rows; escalating to full layout extraction.')
        }
      } catch (err) {
        warnings.push(
          `Cheap OCR failed: ${err instanceof Error ? err.message : 'unknown error'} — escalating to full layout extraction.`
        )
      }

      // Pass 2 (if cheap OCR was empty or threw): full layout extraction.
      if (transactions.length === 0) {
        try {
          const rows = await adapter.layoutExtract(input.buffer)
          transactions = parseLayoutRows(rows, adapter.strategy, adapter.version())
        } catch (err) {
          throw new ProviderNotConfigured(
            `${adapter.strategy} layout extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`,
            'provider_error'
          )
        }
      }

      // Period + balance candidates from the recovered set. Reconciliation is the
      // validator's call — here we just hand candidates forward.
      const dates = transactions.map((t) => t.date).sort()
      const result: ExtractionResult = {
        transactions,
        accountHolderName: null,
        openingBalance: transactions.length > 0 ? (transactions[0]!.balance ?? null) : null,
        closingBalance:
          transactions.length > 0 ? (transactions[transactions.length - 1]!.balance ?? null) : null,
        statementPeriodStart: dates[0] ?? null,
        statementPeriodEnd: dates[dates.length - 1] ?? null,
        pagesProcessed: null, // providers report this differently; completeness check is N/A until wired
        pagesExpected: null,
        warnings,
        extractor: adapter.strategy,
        extractorVersion: adapter.version(),
      }
      return result
    },
  }
}

// ── Parsers: turn provider output into CanonicalTransactions ────────────────
// These reuse the same line/column heuristics conceptually but on flat OCR text
// rather than positioned items. They are deliberately conservative — the
// validator catches mis-parses via balance reconciliation.

const DATE_RE = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/
const AMOUNT_RE = /^[-£$€]?\s*[\d,]+\.\d{2}$/

function parseAmountLocal(s: string): number | null {
  const cleaned = s.replace(/[£$€\s]/g, '').replace(/,/g, '')
  const neg = /^\(.*\)$/.test(cleaned)
  const v = parseFloat(neg ? cleaned.slice(1, -1) : cleaned)
  if (!Number.isFinite(v)) return null
  return neg ? -v : v
}

function normaliseDateLocal(s: string): string | null {
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s.trim())
  if (!m) return null
  const [, d, mo, y] = m
  const year = y!.length === 2 ? `20${y}` : y!
  return `${year}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`
}

/** Parse flat OCR text (one string per page) into canonical transactions. */
function parseOcrPages(
  pages: OcrPage[],
  extractor: string,
  version: string
): CanonicalTransaction[] {
  const out: CanonicalTransaction[] = []
  for (const page of pages) {
    const lines = page.text.split(/\r?\n/)
    let rowIdx = 0
    for (const line of lines) {
      const tokens = line.trim().split(/\s{2,}|\s+/).filter(Boolean)
      if (tokens.length === 0) continue
      const parsed = parseTokens(tokens)
      if (!parsed) continue
      out.push(buildCanonical(parsed, page.pageNumber, ++rowIdx, extractor, version))
    }
  }
  return out
}

/** Parse structured layout rows (cells keyed by column role) into canonical. */
function parseLayoutRows(
  rows: LayoutRow[],
  extractor: string,
  version: string
): CanonicalTransaction[] {
  const out: CanonicalTransaction[] = []
  for (const row of rows) {
    const dateRaw = row.cells['date']?.text ?? row.cells['Date']?.text ?? null
    const date = dateRaw ? normaliseDateLocal(dateRaw) : null
    const amountRaw =
      row.cells['amount']?.text ?? row.cells['Amount']?.text ?? null
    const debitRaw = row.cells['debit']?.text ?? row.cells['Debit']?.text ?? null
    const creditRaw = row.cells['credit']?.text ?? row.cells['Credit']?.text ?? null
    const balanceRaw = row.cells['balance']?.text ?? row.cells['Balance']?.text ?? null
    const description =
      row.cells['description']?.text ?? row.cells['Description']?.text ?? null

    let amount: number | null = null
    let direction: 'credit' | 'debit' = 'debit'
    if (amountRaw) {
      const v = parseAmountLocal(amountRaw)
      if (v !== null) {
        amount = Math.abs(v)
        direction = v < 0 ? 'debit' : 'credit'
      }
    } else if (creditRaw) {
      const v = parseAmountLocal(creditRaw)
      if (v !== null && v !== 0) {
        amount = Math.abs(v)
        direction = 'credit'
      }
    } else if (debitRaw) {
      const v = parseAmountLocal(debitRaw)
      if (v !== null && v !== 0) {
        amount = Math.abs(v)
        direction = 'debit'
      }
    }
    if (!date || amount === null) continue

    const balance = balanceRaw ? parseAmountLocal(balanceRaw) : null
    out.push({
      date,
      amount,
      direction,
      description: description ?? null,
      balance,
      dateRaw,
      descriptionRaw: description ?? null,
      amountRaw: amountRaw ?? debitRaw ?? creditRaw ?? null,
      balanceRaw: balanceRaw ?? null,
      sourcePage: row.pageNumber,
      sourceRow: row.rowIndex,
      extractor,
      extractorVersion: version,
      confidence: row.cells['amount']?.confidence ?? null,
    })
  }
  return out
}

/** Parse a flat token array (from OCR text) into a date + amounts + balance. */
function parseTokens(tokens: string[]): {
  date: string
  dateRaw: string
  amounts: { raw: string; value: number }[]
  balance: { raw: string; value: number } | null
  description: string | null
} | null {
  let date: string | null = null
  let dateRaw: string | null = null
  const numerics: { raw: string; value: number }[] = []
  const desc: string[] = []
  for (const tok of tokens) {
    if (!date && DATE_RE.test(tok)) {
      const iso = normaliseDateLocal(tok)
      if (iso) {
        date = iso
        dateRaw = tok
        continue
      }
    }
    if (AMOUNT_RE.test(tok)) {
      const v = parseAmountLocal(tok)
      if (v !== null) {
        numerics.push({ raw: tok, value: v })
        continue
      }
    }
    desc.push(tok)
  }
  if (!date || numerics.length === 0) return null
  let balance: { raw: string; value: number } | null = null
  let amounts = numerics
  if (numerics.length >= 2) {
    balance = numerics[numerics.length - 1]!
    amounts = numerics.slice(0, -1)
  }
  return {
    date,
    dateRaw: dateRaw!,
    amounts,
    balance,
    description: desc.join(' ').trim() || null,
  }
}

function buildCanonical(
  parsed: NonNullable<ReturnType<typeof parseTokens>>,
  page: number,
  row: number,
  extractor: string,
  version: string
): CanonicalTransaction {
  let amount: number
  let direction: 'credit' | 'debit'
  if (parsed.amounts.length === 1) {
    amount = Math.abs(parsed.amounts[0]!.value)
    direction = parsed.amounts[0]!.value < 0 ? 'debit' : 'credit'
  } else {
    const debit = parsed.amounts[0]!.value
    const credit = parsed.amounts[1]!.value
    if (credit !== 0) {
      amount = Math.abs(credit)
      direction = 'credit'
    } else {
      amount = Math.abs(debit)
      direction = 'debit'
    }
  }
  return {
    date: parsed.date,
    amount,
    direction,
    description: parsed.description,
    balance: parsed.balance?.value ?? null,
    dateRaw: parsed.dateRaw,
    descriptionRaw: parsed.description,
    amountRaw: parsed.amounts.map((a) => a.raw).join(' '),
    balanceRaw: parsed.balance?.raw ?? null,
    sourcePage: page,
    sourceRow: row,
    extractor,
    extractorVersion: version,
    confidence: null,
  }
}
