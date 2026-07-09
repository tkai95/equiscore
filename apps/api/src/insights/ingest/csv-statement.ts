import type { NormalizedTxn } from '../engine/types'

/**
 * Deterministic bank-statement CSV parser.
 *
 * Every UK bank exports a different CSV shape, so the work here is *column
 * detection*: map an arbitrary header row onto date / description / amount /
 * balance, coping with the two amount conventions (one signed column, or split
 * paid-in / paid-out columns) and UK day-first dates. No AI — the same normalized
 * transactions the Open Banking path produces come out the other side.
 */

export interface CsvParseResult {
  transactions: NormalizedTxn[]
  warnings: string[]
  detected: {
    date: string | null
    description: string | null
    amount: string | null
    paidIn: string | null
    paidOut: string | null
    balance: string | null
    rowsParsed: number
    rowsSkipped: number
  }
}

// ─── Header matching ──────────────────────────────────────────────────────────

const DATE_HEADERS = /^(date|transaction date|posted|posting date|value date|date posted)$/i
// Deliberately does NOT match a bare "transaction" — that would wrongly grab
// "Transaction ID / Date / Type". "Transaction Description" still matches via
// the "description" alternative. \bname\b avoids matching "Number".
const DESC_HEADERS = /(description|details|narrative|memo|payee|counter ?party|\bname\b)/i
// Weaker fallback, only used when no strong description column is present.
const DESC_FALLBACK = /reference/i
const AMOUNT_HEADERS = /^(amount|value|amount \(gbp\)|transaction amount)$/i
const PAID_OUT_HEADERS = /(debit|paid out|money out|withdrawn|out \(|withdrawal|payments? out)/i
const PAID_IN_HEADERS = /(credit|paid in|money in|deposit|in \(|receipts?|payments? in)/i
const BALANCE_HEADERS = /balance/i

function pickHeader(headers: string[], test: (h: string) => boolean): string | null {
  const idx = headers.findIndex((h) => test(h))
  return idx === -1 ? null : headers[idx]!
}

// ─── CSV tokenizer (RFC 4180-ish: quotes, escaped quotes, commas in quotes) ────

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const s = text.replace(/^﻿/, '') // strip BOM

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ } // escaped quote
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((f) => f.trim() !== '')) rows.push(row)
  }
  return rows
}

// ─── Value parsing ────────────────────────────────────────────────────────────

/** Parse a money cell: strips £/$/€ and thousands commas, handles (123.45) negatives. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  s = s.replace(/[£$€\s]/g, '').replace(/,/g, '')
  if (s.startsWith('-')) { negative = true; s = s.slice(1) }
  if (s.startsWith('+')) s = s.slice(1)
  if (s === '' || !/^\d*\.?\d+$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/** UK-first date parsing → ISO YYYY-MM-DD. Handles DD/MM/YYYY, YYYY-MM-DD, "01 Jan 2026". */
export function parseUkDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // ISO first (unambiguous)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  // DD MonthName YYYY  (e.g. "01 Jan 2026", "1 January 2026")
  const named = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,})[ -](\d{4})$/)
  if (named) {
    const m = MONTHS[named[2]!.slice(0, 3).toLowerCase()]
    if (m === undefined) return null
    return isoFrom(Number(named[1]), m, Number(named[3]))
  }

  // DD/MM/YYYY or DD-MM-YYYY (UK day-first); also 2-digit years
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/)
  if (dmy) {
    let day = Number(dmy[1]); let month = Number(dmy[2]) - 1
    const year = dmy[3]!.length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3])
    // If the first field can't be a day but the second can, it's US MM/DD — swap.
    if (day > 12 && month + 1 <= 12) { /* clearly day-first, keep */ }
    else if (day <= 12 && Number(dmy[2]) > 12) { const t = day; day = Number(dmy[2]); month = t - 1 }
    return isoFrom(day, month, year)
  }
  return null
}

function isoFrom(day: number, month: number, year: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const d = new Date(Date.UTC(year, month, day))
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null // rejects 31 Feb etc.
  return d.toISOString().slice(0, 10)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function parseStatementCsv(text: string): CsvParseResult {
  const warnings: string[] = []
  const rows = parseCsvRows(text)
  if (rows.length < 2) {
    return { transactions: [], warnings: ['File has no data rows.'], detected: emptyDetected() }
  }

  const headers = rows[0]!.map((h) => h.trim())
  const map = {
    date: pickHeader(headers, (h) => DATE_HEADERS.test(h)),
    description:
      pickHeader(headers, (h) => DESC_HEADERS.test(h)) ??
      pickHeader(headers, (h) => DESC_FALLBACK.test(h)),
    amount: pickHeader(headers, (h) => AMOUNT_HEADERS.test(h)),
    // Split columns are only meaningful when there is no single signed amount col.
    paidOut: pickHeader(headers, (h) => PAID_OUT_HEADERS.test(h) && !AMOUNT_HEADERS.test(h)),
    paidIn: pickHeader(headers, (h) => PAID_IN_HEADERS.test(h) && !AMOUNT_HEADERS.test(h)),
    balance: pickHeader(headers, (h) => BALANCE_HEADERS.test(h)),
  }

  if (!map.date) warnings.push('Could not find a date column.')
  if (!map.amount && !(map.paidIn || map.paidOut))
    warnings.push('Could not find an amount column (or paid in / paid out columns).')
  if (!map.description) warnings.push('Could not find a description column — using a placeholder.')

  const col = (name: string | null) => (name ? headers.indexOf(name) : -1)
  const iDate = col(map.date)
  const iDesc = col(map.description)
  const iAmount = col(map.amount)
  const iOut = col(map.paidOut)
  const iIn = col(map.paidIn)
  const iBal = col(map.balance)

  const transactions: NormalizedTxn[] = []
  let skipped = 0

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!
    const date = iDate >= 0 ? parseUkDate(cells[iDate] ?? '') : null
    if (!date) { skipped++; continue }

    let amount: number | null = null
    let direction: 'credit' | 'debit' = 'debit'

    if (iAmount >= 0) {
      const v = parseAmount(cells[iAmount] ?? '')
      if (v === null) { skipped++; continue }
      direction = v >= 0 ? 'credit' : 'debit'
      amount = Math.abs(v)
    } else {
      const out = iOut >= 0 ? parseAmount(cells[iOut] ?? '') : null
      const inc = iIn >= 0 ? parseAmount(cells[iIn] ?? '') : null
      if (inc && inc !== 0) { direction = 'credit'; amount = Math.abs(inc) }
      else if (out && out !== 0) { direction = 'debit'; amount = Math.abs(out) }
      else { skipped++; continue }
    }

    const balance = iBal >= 0 ? parseAmount(cells[iBal] ?? '') : null

    transactions.push({
      date,
      amount,
      direction,
      description: iDesc >= 0 ? (cells[iDesc] ?? '').trim() || null : null,
      merchantName: null,
      balance,
    })
  }

  if (transactions.length === 0 && skipped > 0) {
    warnings.push(`No rows could be parsed (${skipped} skipped). The column layout may be unsupported.`)
  }

  return {
    transactions,
    warnings,
    detected: {
      date: map.date, description: map.description, amount: map.amount,
      paidIn: map.paidIn, paidOut: map.paidOut, balance: map.balance,
      rowsParsed: transactions.length, rowsSkipped: skipped,
    },
  }
}

function emptyDetected(): CsvParseResult['detected'] {
  return { date: null, description: null, amount: null, paidIn: null, paidOut: null, balance: null, rowsParsed: 0, rowsSkipped: 0 }
}
