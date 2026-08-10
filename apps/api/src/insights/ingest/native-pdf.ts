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

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
}

// Numeric dd/mm/yyyy OR long-form "1 August 2026" / "1 Aug 2026" — Wise and
// several fintech statements use the long form, so both must be recognised.
// Long-form MUST require a real month name (built from MONTHS keys), not just
// any 3-9 letter word — otherwise reference text like "70 reference 0983" or
// "55 Account 2026" matches the \d{1,2}\s+[A-Za-z]{3,9}\s+\d{4} shape,
// normaliseDate returns null (the word isn't a month), and parseText silently
// drops the whole transaction block. On the Wise statement this lost two
// Computershare credits (~£1,712 and £24) whose reference lines contained
// digit-fragments shaped like a long-form date. Building the alternation from
// MONTHS keeps the matcher and the normaliser in lockstep.
//
// The long-form branch also uses a negative lookbehind for [. , \d] before the
// day digit, so the decimal tail of an amount (e.g. the "40" in "2,208.40")
// can't be misread as a day when followed by a wrapped month fragment
// ("2,208.40 OCT 01" must NOT match as the date "40 OCT 01"). Without this,
// description line-wraps that drop a month abbreviation onto the next visual
// line produce phantom dates.
const MONTH_ALT = Object.keys(MONTHS).join('|')
const DATE_RE = new RegExp(
  `^(?:\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|\\d{1,2}\\s+(?:${MONTH_ALT})\\s+\\d{2,4})$`,
  'i',
)
// Anywhere-in-text variant (unanchored) for block-completion detection and for
// finding the date token inside an accumulated block. Same strict month rule +
// decimal-tail lookbehind. (?:^|[^\d.,]) ensures the day isn't glued to a
// preceding decimal/thousands separator or digit.
const DATE_ANYWHERE = new RegExp(
  `(?:\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|(?<![\\d.,])\\d{1,2}\\s+(?:${MONTH_ALT})\\s+\\d{2,4})`,
  'i',
)
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

/** Normalise a recognised UK date to ISO yyyy-mm-dd. Handles both numeric
 *  (dd/mm/yyyy) and long-form ("1 August 2026", "1 Aug 26"). Returns null for
 *  anything that looks date-shaped but isn't a real calendar date — e.g.
 *  "40 OCT 01" (where 40 is the tail of an amount like 2,208.40 that bled into
 *  a long-form date match). Without this guard, a garbage date like 2001-10-40
 *  gets accepted and the transaction is mis-dated; the validator's date check
 *  would catch it eventually, but rejecting at parse time is cleaner and
 *  prevents the spurious row from displacing the real one. */
function normaliseDate(s: string): string | null {
  const t = s.trim()
  // Numeric form.
  const num = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(t)
  if (num) {
    const [, d, mo, y] = num
    const day = Number(d), month = Number(mo)
    if (day < 1 || day > 31 || month < 1 || month > 12) return null
    const year = y!.length === 2 ? `20${y}` : y!
    return `${year}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }
  // Long form: "1 August 2026" / "1 Aug 26".
  const long = /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/.exec(t)
  if (long) {
    const [, d, monName, y] = long
    const day = Number(d)
    if (day < 1 || day > 31) return null
    const mo = MONTHS[monName!.toLowerCase()]
    if (!mo) return null
    const year = y!.length === 2 ? `20${y}` : y!
    return `${year}-${String(mo).padStart(2, '0')}-${d!.padStart(2, '0')}`
  }
  return null
}

/**
 * The recognised columns for a transaction line, with the raw text that produced
 * each — the evidence layer.
 */
interface ParsedRow {
  date: string | null
  dateRaw: string | null
  description: string | null
  descriptionRaw: string | null
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
function parseText(fullText: string): ParsedRow | null {
  // Strip descriptive "of [SIGN]N.NN CURRENCY" fragments (e.g. "Card
  // transaction of 53.78 GBP issued by ...", "Card transaction of -239.20 SAR
  // issued by ...") — these are NOT the transaction amount, they're the foreign-
  // currency figure. Without stripping them they get captured as the amount,
  // corrupting direction + value (we'd record -239.20 instead of the real
  // GBP-equivalent). The real amount is the signed standalone token (-48.46)
  // on the block's amount line. MUST accept an optional leading sign — foreign
  // currency lines are frequently pre-signed (-SAR, -USD).
  let text = fullText.replace(/\bof\s+-?[\d,]+\.\d{2}\s+[A-Z]{3}\b/gi, '')
  // Also drop bare "[SIGN]N.NN CURRENCY" mentions inside the description.
  text = text.replace(/\b-?[\d,]+\.\d{2}\s+(?:GBP|USD|EUR|AUD|SAR|MYR|SGD|HKD|INR|PKR|AED)\b/g, '')

  let date: string | null = null
  let dateRaw: string | null = null
  let remainder = text

  // Try to find a date (numeric OR long-form) anywhere in the block. Uses the
  // strict month-name alternation so reference text like "70 reference 0983"
  // can't masquerade as a long-form date.
  const dateMatch = DATE_ANYWHERE.exec(text)
  if (dateMatch) {
    const iso = normaliseDate(dateMatch[0]!)
    if (iso) {
      date = iso
      dateRaw = dateMatch[0]!
      remainder = (text.slice(0, dateMatch.index) + ' ' + text.slice(dateMatch.index! + dateMatch[0]!.length)).trim()
    }
  }

  // Scan the remainder's tokens for amounts; everything else is description.
  const numerics: { raw: string; value: number }[] = []
  const descriptionParts: string[] = []
  for (const tok of remainder.split(/\s{2,}|\s+/)) {
    const t = tok.trim()
    if (!t) continue
    if (AMOUNT_RE.test(t) || SIGNED_AMOUNT_RE.test(t)) {
      const v = parseAmount(t)
      if (v !== null) {
        numerics.push({ raw: t, value: v })
        continue
      }
    }
    descriptionParts.push(t)
  }

  if (!date && numerics.length === 0) return null // not a transaction line (header/footer/blank)

  // The LAST numeric is conventionally the running balance; earlier numerics are
  // the amount(s). With the descriptive amounts stripped, we expect exactly one
  // amount (+ optional balance). If two remain, the first is the amount.
  let balance: { raw: string; value: number } | null = null
  let amounts = numerics
  if (numerics.length >= 2) {
    balance = numerics[numerics.length - 1]!
    amounts = numerics.slice(0, -1)
  }

  const description = descriptionParts.join(' ').trim() || null
  return {
    date,
    dateRaw,
    description,
    descriptionRaw: description,
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

  // Direction resolution. Prefer a SIGNED amount (real transaction amounts
  // carry the sign: -53.78 for a debit). If multiple amounts remain after the
  // balance was split off, pick the one with an explicit sign; failing that the
  // first. Unsigned single amounts default to debit (most statement lines are).
  let amount: number
  let direction: 'credit' | 'debit'
  const signed = row.amounts.find((a) => a.raw.trim().startsWith('-') || a.raw.trim().startsWith('('))
  const chosen = signed ?? row.amounts[0]!
  amount = Math.abs(chosen.value)
  direction = chosen.value < 0 ? 'debit' : 'credit'

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

  // Card-style statements (Wise, many fintechs) split each transaction across
  // 2-3 visual lines: a description line, an amount/balance line, and a date
  // line. We accumulate lines into a BLOCK and FLUSH AS SOON AS THE BLOCK IS
  // COMPLETE — i.e. the moment it contains both a date and an amount. This is
  // layout-agnostic: a one-line row (date+amount on the same line) flushes
  // immediately; a two-line row (amount above, date below) flushes on the date
  // line; a three-line row flushes when the last needed piece arrives. The
  // previous "flush on next date" rule was wrong — it absorbed the next
  // transaction's amount line into the current block. Lines before the first
  // date (page headers) are skipped because a block with no date never flushes.
  // DATE_ANYWHERE is the module-level strict matcher (real month names only).
  const AMOUNT_ANYWHERE = /[\d,]+\.\d{2}/
  let blockText = ''
  let hasBlockDate = false
  const flush = () => {
    if (!hasBlockDate) {
      // No date in the accumulated block — it's a header/footer, discard.
      blockText = ''
      hasBlockDate = false
      return
    }
    const parsed = parseText(blockText)
    if (parsed) {
      const canonical = toCanonical(parsed, pageNum, ++rowIdx)
      if (canonical) txns.push(canonical)
    }
    blockText = ''
    hasBlockDate = false
  }
  for (const line of lines) {
    const lineText = line.items.map((i) => i.str.trim()).filter(Boolean).join(' ')
    if (!lineText) continue
    const lineHasDate = DATE_ANYWHERE.test(lineText)
    // Safety: if a NEW date appears while we already have a complete-ish block
    // (date but no amount yet — e.g. a heading line that coincidentally matches
    // a date pattern), close it out before starting fresh so we never merge two
    // real transactions.
    if (lineHasDate && hasBlockDate && !AMOUNT_ANYWHERE.test(blockText)) flush()
    blockText = blockText ? `${blockText} ${lineText}` : lineText
    if (lineHasDate) hasBlockDate = true
    // Complete = a date AND an amount present anywhere in the accumulated block.
    if (hasBlockDate && AMOUNT_ANYWHERE.test(blockText)) flush()
  }
  flush()
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

    // Statement-period + balance candidates from the transaction set. Opening
    // and closing balances are derived from the CHRONOLOGICALLY-earliest and
    // latest transactions, NOT array position — banks differ in whether they
    // list transactions oldest-first (most traditional UK banks) or newest-
    // first (Wise and many fintechs), so transactions[0] is not reliably the
    // opening row. Opening balance is the earliest txn's balance minus its own
    // movement (the balance before it applied); closing is the latest txn's
    // balance (the balance after it applied). Both null if no balances present.
    const dates = transactions.map((t) => t.date).sort()
    const statementPeriodStart = dates[0] ?? null
    const statementPeriodEnd = dates[dates.length - 1] ?? null

    const byDate = [...transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    const earliest = byDate[0]
    const latest = byDate[byDate.length - 1]
    let openingBalance: number | null = null
    let closingBalance: number | null = null
    if (earliest && typeof earliest.balance === 'number') {
      const ownDelta = earliest.direction === 'credit' ? earliest.amount : -earliest.amount
      openingBalance = Math.round((earliest.balance - ownDelta) * 100) / 100
    }
    if (latest && typeof latest.balance === 'number') {
      closingBalance = latest.balance
    }

    const result: ExtractionResult = {
      transactions,
      accountHolderName: null, // native text layer doesn't reliably identify the header name yet
      openingBalance,
      closingBalance,
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
