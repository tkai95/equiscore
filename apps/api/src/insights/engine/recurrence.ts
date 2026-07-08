import type { NormalizedTxn, Cadence, Consistency } from './types'
import { normalizeCounterparty, displayName } from './normalize'
import {
  toDate,
  monthKey,
  dayOfMonth,
  median,
  coefficientOfVariation,
  dayOfMonthVariance,
} from './util'

/**
 * Behavioural recurrence detection — the primary signal in the engine.
 *
 * Rather than trusting keywords in the description ("salary", "rent"), we
 * detect *streams*: the same counterparty, a stable amount, on a regular
 * cadence. This catches "BACS CREDIT ACME LTD" as salary and a Faster
 * Payment to a private landlord as rent, which keyword matching misses.
 */

export interface RecurringStream {
  key: string
  name: string
  direction: 'credit' | 'debit'
  amount: number // median
  amountCoV: number
  cadence: Cadence
  typicalDayOfMonth: number | null
  dayVariance: number
  consistency: Consistency
  occurrences: number
  monthsCovered: number
  missedCount: number
  txns: NormalizedTxn[]
}

const RETURN_PATTERN =
  /\b(returned|unpaid|bounced|recalled|reversal|reversed|refer to payer|represented|dd rejected)\b/i

interface Group {
  key: string
  txns: NormalizedTxn[]
}

export function detectRecurringStreams(
  txns: NormalizedTxn[],
  direction: 'credit' | 'debit',
  opts: { minOccurrences?: number; amountTolerance?: number } = {}
): RecurringStream[] {
  const minOccurrences = opts.minOccurrences ?? 3
  const amountTolerance = opts.amountTolerance ?? 0.35 // CoV ceiling for "stable amount"

  const groups = new Map<string, Group>()
  for (const t of txns) {
    if (t.direction !== direction) continue
    if (RETURN_PATTERN.test(t.description ?? '')) continue // returns handled separately
    const key = normalizeCounterparty(t)
    if (!key || key === 'unknown') continue
    const g = groups.get(key) ?? { key, txns: [] }
    g.txns.push(t)
    groups.set(key, g)
  }

  const streams: RecurringStream[] = []
  for (const g of groups.values()) {
    if (g.txns.length < minOccurrences) continue

    const sorted = [...g.txns].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
    const amounts = sorted.map((t) => t.amount)
    const amountCoV = coefficientOfVariation(amounts)

    const gaps = intervalDays(sorted)
    const days = sorted.map((t) => dayOfMonth(toDate(t.date)))
    const dayVar = dayOfMonthVariance(days)

    // Calendar-monthly and four-weekly both sit near a ~28–31 day gap. They are
    // told apart by drift: a four-weekly payment walks around the month, a
    // monthly one lands on the same date.
    const cadence = refineCadence(classifyCadence(gaps), median(gaps), dayVar)
    if (cadence === 'irregular' && amountCoV > amountTolerance) continue // neither stable amount nor rhythm

    const months = new Set(sorted.map((t) => monthKey(toDate(t.date))))

    const monthsCovered = spanMonths(sorted)
    const expected = expectedOccurrences(cadence, monthsCovered)
    const missedCount = Math.max(0, expected - sorted.length)

    streams.push({
      key: g.key,
      name: displayName(g.key),
      direction,
      amount: median(amounts),
      amountCoV,
      cadence,
      typicalDayOfMonth: isMonthly(cadence) ? Math.round(median(days)) : null,
      dayVariance: dayVar,
      consistency: rateConsistency(cadence, amountCoV, dayVar, months.size),
      occurrences: sorted.length,
      monthsCovered,
      missedCount,
      txns: sorted,
    })
  }

  return streams.sort((a, b) => b.amount * b.occurrences - a.amount * a.occurrences)
}

/** Count returned/failed payment events across all transactions. */
export function countReturnedPayments(txns: NormalizedTxn[]): number {
  return txns.filter((t) => RETURN_PATTERN.test(t.description ?? '')).length
}

function intervalDays(sorted: NormalizedTxn[]): number[] {
  const out: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const days =
      (toDate(sorted[i]!.date).getTime() - toDate(sorted[i - 1]!.date).getTime()) /
      (1000 * 60 * 60 * 24)
    out.push(days)
  }
  return out
}

function classifyCadence(gaps: number[]): Cadence {
  if (gaps.length === 0) return 'irregular'
  const m = median(gaps)
  if (m >= 5 && m <= 9) return 'weekly'
  if (m >= 12 && m <= 16) return 'fortnightly'
  if (m >= 24 && m <= 34) return 'monthly' // may be refined to four_weekly below
  if (m >= 85 && m <= 95) return 'quarterly'
  return 'irregular'
}

/** A four-weekly payment drifts across the calendar; a monthly one does not. */
function refineCadence(cadence: Cadence, medianGap: number, dayVariance: number): Cadence {
  if (cadence !== 'monthly') return cadence
  if (medianGap <= 29 && dayVariance > 4) return 'four_weekly'
  return 'monthly'
}

function isMonthly(c: Cadence): boolean {
  return c === 'monthly' || c === 'four_weekly'
}

/** Inclusive calendar-month span — exact, unlike dividing elapsed days by 30.4. */
function spanMonths(sorted: NormalizedTxn[]): number {
  const first = toDate(sorted[0]!.date)
  const last = toDate(sorted[sorted.length - 1]!.date)
  const months =
    (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + (last.getUTCMonth() - first.getUTCMonth())
  return Math.max(1, months + 1)
}

function expectedOccurrences(cadence: Cadence, monthsCovered: number): number {
  switch (cadence) {
    case 'weekly':
      return Math.round(monthsCovered * 4.33)
    case 'fortnightly':
      return Math.round(monthsCovered * 2.17)
    case 'four_weekly':
      return Math.round((monthsCovered * 30.4) / 28)
    case 'monthly':
      return monthsCovered
    case 'quarterly':
      return Math.max(1, Math.round(monthsCovered / 3))
    default:
      return 0
  }
}

function rateConsistency(
  cadence: Cadence,
  amountCoV: number,
  dayVar: number,
  monthsPresent: number
): Consistency {
  if (monthsPresent < 2) return 'one_off'
  const stableAmount = amountCoV <= 0.08
  const stableTiming = dayVar <= 2
  if (cadence !== 'irregular' && stableAmount && stableTiming) return 'very_consistent'
  if (cadence !== 'irregular' && amountCoV <= 0.2 && dayVar <= 4) return 'consistent'
  return 'variable'
}
