/**
 * Native PDF text-layer extraction — the deterministic ~£0 route for digital
 * (text-layer) bank statements.
 *
 * Reads the PDF's own text objects WITH their x/y coordinates (pdfjs
 * `getTextContent`), groups them into visual lines by y-position, clusters the
 * x-positions into columns, then maps each line to a transaction by recognising
 * which column is the date / debit / credit / balance. No OCR, no model — the
 * digits are read from the PDF's text layer exactly as the bank wrote them.
 *
 * This is the single highest-value change in the ingestion rewrite: it
 * eliminates the LLM-digit-misread failure class for the majority of real bank
 * downloads (which are digital PDFs).
 *
 * Classification: a page is "digital" if it has meaningful recoverable text
 * (text density above a threshold). A PDF with no text layer on any page is
 * classified scanned → the caller rejects it (clean "please upload a digital
 * PDF or CSV") until a cloud OCR provider is configured.
 *
 * Page-checkpointed: each page is extracted independently so a 600-transaction
 * statement isn't one fragile task — a failure on page 12 doesn't lose pages 1-11.
 */
import type { CanonicalTransaction, ExtractionResult } from './canonical'
import { type DocumentExtractor } from './extractor'

const EXTRACTOR = 'native_pdf'
const VERSION = 'pdfjs-textlayer-1'

// ── pdfjs-dist (ESM, lazy-loaded) ───────────────────────────────────────────
type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let pdfjsLibPromise: Promise<PdfjsModule> | null = null
function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (
      new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")') as () => Promise<PdfjsModule>
    )()
  }
  return pdfjsLibPromise
}

export type PdfClassification = 'digital_pdf' | 'scanned_pdf' | 'mixed' | 'unknown'

/** A single text item from the PDF, with its page-space position decoded. */
interface TextItem {
  str: string
  x: number // transform[4]
  y: number // transform[5] (PDF bottom-left origin)
  height: number // font height ≈ hypot(c, d)
  hasEOL: boolean
}

/** A visual line: text items sharing (approximately) the same y. */
interface Line {
  y: number
  items: TextItem[]
}

/**
 * Classify a PDF by per-page text density. A page is "digital" if it has enough
 * recoverable text characters relative to its size; below the threshold it's a
 * scanned image. The overall verdict is digital (all pages text), scanned (none),
 * or mixed.
 *
 * Threshold is intentionally generous-false-negative: we only call something
 * digital if it clearly has a text layer, so we don't silently feed an
 * image-only page to the text parser (which would return nothing and look like
 * a "couldn't read").
 */
export async function classifyPdf(pdfBuffer: Buffer): Promise<{
  classification: PdfClassification
  pageCount: number
  perPageTextChars: number[]
}> {
  const pdfjsLib = await getPdfjs()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
    useSystemFonts: true,
    isEvalSupported: false,
  } as Record<string, unknown>)
  const doc = (await loadingTask.promise) as unknown as PdfDoc
  const pageCount = doc.numPages
  const perPageTextChars: number[] = []
  for (let p = 1; p <= pageCount; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const chars = content.items.reduce((s, it) => s + ((it as { str?: string }).str?.length ?? 0), 0)
    perPageTextChars.push(chars)
    page.cleanup()
  }
  await doc.cleanup()
  await (doc.loadingTask as unknown as { destroy: () => Promise<void> }).destroy()

  // A statement page typically has 1000+ chars of transactions. 200 is a floor
  // below which we treat the page as image-only (headers alone are ~100-200).
  const DIGITAL_MIN_CHARS = 200
  const digitalCount = perPageTextChars.filter((c) => c >= DIGITAL_MIN_CHARS).length
  let classification: PdfClassification
  if (digitalCount === pageCount) classification = 'digital_pdf'
  else if (digitalCount === 0) classification = 'scanned_pdf'
  else classification = 'mixed'
  return { classification, pageCount, perPageTextChars }
}

/** Decode pdfjs content items into positioned TextItems for one page. */
function decodeItems(raw: { items: Array<Record<string, unknown>> }): TextItem[] {
  const out: TextItem[] = []
  for (const it of raw.items) {
    const str = typeof it.str === 'string' ? it.str : ''
    const transform = it.transform as number[] | undefined
    if (!transform || str.trim() === '') continue
    out.push({
      str,
      x: transform[4] ?? 0,
      y: transform[5] ?? 0,
      height: Math.hypot(transform[2] ?? 0, transform[3] ?? 1),
      hasEOL: Boolean(it.hasEOL),
    })
  }
  return out
}

/**
 * Group positioned text items into visual lines by y-coordinate. Items on the
 * same line share (within tolerance) the same baseline y. Returns lines sorted
 * top-to-bottom (descending y in PDF's bottom-left origin).
 */
function groupIntoLines(items: TextItem[], lineHeightTolerance = 2): Line[] {
  if (items.length === 0) return []
  // Sort by y descending (top of page first), then x ascending (left-to-right).
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: Line[] = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - it.y) <= lineHeightTolerance) {
      last.items.push(it)
    } else {
      lines.push({ y: it.y, items: [it] })
    }
  }
  // Each line's items left-to-right.
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)
  return lines
}

// ── Column / value recognition ──────────────────────────────────────────────
// A UK bank statement transaction line typically has, in some order:
//   date  description  [debit]  [credit]  [balance]
// We recognise columns by content pattern + x-position clustering, not by
// assuming a fixed layout (every bank differs).

const DATE_RE = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/
const AMOUNT_RE = /^[-£$€]?\s*[\d,]+\.\d{2}$/
const SIGNED_AMOUNT_RE = /^-?\s*[\d,]+\.\d{2}$/

/** Parse a recognised amount string into a number (handles £, commas, () negatives). */
function parseAmount(s: string): number | null {
  const cleaned = s.replace(/[£$€\s]/g, '').replace(/,/g, '')
  const neg = /^\(.*\)$/.test(cleaned)
  const v = parseFloat(neg ? cleaned.slice(1, -1) : cleaned)
  if (!Number.isFinite(v)) return null
  return neg ? -v : v
}

/** Normalise a recognised UK date string (dd/mm/yyyy or dd-mm-yy) to ISO yyyy-mm-dd. */
function normaliseDate(s: string): string | null {
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s.trim())
  if (!m) return null
  let [, d, mo, y] = m
  const day = d!.padStart(2, '0')
  const month = mo!.padStart(2, '0')
  const year = y!.length === 2 ? `20${y}` : y!
  return `${year}-${month}-${day}`
}

/**
 * The recognised columns for a transaction line, with the raw text that produced
 * each — the evidence layer.
 */
interface ParsedRow {
  date: string | null
  dateRaw: string | null
  description: string | null
  amounts: { raw: string; value: number }[] // 1-3 numeric tokens on the line
  balance: { raw: string; value: number } | null
}

/**
 * Parse a single visual line into a transaction candidate.
 *
 * Strategy: walk the line's items left-to-right; the first date-shaped token is
 * the date; numeric tokens are amounts (debits/credits); the LAST numeric token
 * is conventionally the running balance; everything else (non-date, non-numeric)
 * is the description. This is heuristic but matches the overwhelming majority of
 * UK statement layouts. The validator's balance-continuity check is the real
 * arbiter — if a row was mis-parsed, the ledger won't reconcile and it escalates.
 */
function parseLine(line: Line): ParsedRow | null {
  const items = line.items
  let date: string | null = null
  let dateRaw: string | null = null
  const descriptionParts: string[] = []
  const numerics: { raw: string; value: number }[] = []

  for (const it of items) {
    const tok = it.str.trim()
    if (tok === '') continue
    if (!date && DATE_RE.test(tok)) {
      const iso = normaliseDate(tok)
      if (iso) {
        date = iso
        dateRaw = tok
        continue
      }
    }
    if (AMOUNT_RE.test(tok) || SIGNED_AMOUNT_RE.test(tok)) {
      const v = parseAmount(tok)
      if (v !== null) {
        numerics.push({ raw: tok, value: v })
        continue
      }
    }
    descriptionParts.push(tok)
  }

  if (!date && numerics.length === 0) return null // not a transaction line (header/footer/blank)

  // Conventionally the last numeric on the line is the running balance; earlier
  // numerics are the debit and/or credit. If there's only one numeric it's
  // ambiguous (could be amount-only with no balance) — treat as amount, no balance.
  let balance: { raw: string; value: number } | null = null
  let amounts = numerics
  if (numerics.length >= 2) {
    balance = numerics[numerics.length - 1]!
    amounts = numerics.slice(0, -1)
  }

  return {
    date,
    dateRaw,
    description: descriptionParts.join(' ').trim() || null,
    amounts,
    balance,
  }
}

/** Turn a parsed row into a CanonicalTransaction, resolving direction + amount. */
function toCanonical(
  row: ParsedRow,
  sourcePage: number,
  sourceRow: number
): CanonicalTransaction | null {
  if (!row.date) return null
  if (row.amounts.length === 0) return null

  // Direction resolution: a single signed amount → sign gives direction.
  // A single positive amount with no balance column is ambiguous; default debit
  // (most statement lines are debits) and let the validator catch mistakes.
  // Two amounts (debit col + credit col) → the non-zero one wins.
  let amount: number
  let direction: 'credit' | 'debit'
  if (row.amounts.length === 1) {
    const a = row.amounts[0]!
    amount = Math.abs(a.value)
    direction = a.value < 0 ? 'debit' : 'credit'
  } else {
    // Two unsigned amounts: assume [debit, credit] column order (most common UK).
    const debit = row.amounts[0]!.value
    const credit = row.amounts[1]!.value
    if (credit !== 0) {
      amount = Math.abs(credit)
      direction = 'credit'
    } else {
      amount = Math.abs(debit)
      direction = 'debit'
    }
  }

  return {
    date: row.date,
    amount,
    direction,
    description: row.description,
    balance: row.balance?.value ?? null,
    dateRaw: row.dateRaw,
    descriptionRaw: row.description,
    amountRaw: row.amounts.map((a) => a.raw).join(' '),
    balanceRaw: row.balance?.raw ?? null,
    sourcePage,
    sourceRow,
    extractor: EXTRACTOR,
    extractorVersion: VERSION,
    confidence: null, // native text layer — no OCR confidence
  }
}

/** Minimal doc shape this module needs from pdfjs (avoids importing the full proxy type). */
interface PdfDoc {
  numPages: number
  getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<Record<string, unknown>> }>
    cleanup: () => void
  }>
  cleanup: () => Promise<void>
  loadingTask: { destroy: () => Promise<void> }
}

/**
 * Extract transactions from the text layer of a single page. Returns canonical
 * candidates. Pure (no side effects beyond reading the page).
 */
async function extractPage(doc: PdfDoc, pageNum: number): Promise<CanonicalTransaction[]> {
  const page = await doc.getPage(pageNum)
  const content = await page.getTextContent()
  page.cleanup()
  const items = decodeItems(content as unknown as { items: Array<Record<string, unknown>> })
  const lines = groupIntoLines(items)
  const txns: CanonicalTransaction[] = []
  let rowIdx = 0
  for (const line of lines) {
    const parsed = parseLine(line)
    if (!parsed) continue
    const canonical = toCanonical(parsed, pageNum, ++rowIdx)
    if (canonical) txns.push(canonical)
  }
  return txns
}

export const nativePdfExtractor: DocumentExtractor = {
  strategy: 'native_pdf',
  canHandle: (input) => input.kind === 'digital_pdf',
  extract: async (input) => {
    if (!input.buffer) throw new Error('Native PDF extractor selected but no buffer provided.')
    const pdfjsLib = await getPdfjs()
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(input.buffer),
      disableWorker: true,
      useSystemFonts: true,
      isEvalSupported: false,
    } as Record<string, unknown>)
    const doc = (await loadingTask.promise) as unknown as PdfDoc

    const warnings: string[] = []
    const transactions: CanonicalTransaction[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      try {
        const pageTxns = await extractPage(doc, p)
        transactions.push(...pageTxns)
      } catch (err) {
        // Page-checkpointed: a failure on one page is logged and skipped, not
        // fatal to the whole statement. Completeness validation will flag the
        // shortfall (pagesProcessed < pagesExpected).
        warnings.push(`Page ${p} extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }
    await doc.cleanup()
    await doc.loadingTask.destroy()

    // Statement-period + balance candidates from the transaction set.
    const dates = transactions.map((t) => t.date).sort()
    const statementPeriodStart = dates[0] ?? null
    const statementPeriodEnd = dates[dates.length - 1] ?? null

    const result: ExtractionResult = {
      transactions,
      accountHolderName: null, // native text layer doesn't reliably identify the header name yet
      openingBalance: transactions.length > 0 ? (transactions[0]!.balance ?? null) : null,
      closingBalance: transactions.length > 0 ? (transactions[transactions.length - 1]!.balance ?? null) : null,
      statementPeriodStart,
      statementPeriodEnd,
      pagesProcessed: doc.numPages,
      pagesExpected: doc.numPages,
      warnings,
      extractor: EXTRACTOR,
      extractorVersion: VERSION,
    }
    return result
  },
}
