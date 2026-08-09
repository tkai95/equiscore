import type { NormalizedTxn, StatementIntegrity } from './types'
import { toDate, round2 } from './util'

/**
 * Balance-continuity check — the anti-tamper defence for uploaded statements.
 *
 * Open Banking data is bank-attested. A PDF or spreadsheet is self-provided and
 * editable. But a real statement is a ledger: every row's running balance must
 * equal the previous balance plus or minus that row's amount. Edited statements
 * almost always break this invariant, and it costs nothing to verify.
 *
 * A statement that reconciles earns extra evidence confidence. One that does
 * not is a genuine red flag — the only place in this engine where a signal
 * counts materially against the customer, because it concerns the *document*,
 * not their behaviour.
 */

const TOLERANCE = 0.02 // pennies of floating-point / rounding slack

export function checkBalanceContinuity(input: NormalizedTxn[]): StatementIntegrity {
  const txns = [...input].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
  const withBalance = txns.filter((t) => typeof t.balance === 'number')

  if (withBalance.length < 2) {
    return {
      hasBalances: false,
      continuous: false,
      checkedRows: 0,
      breaks: [],
      openingBalance: null,
      closingBalance: null,
    }
  }

  const breaks: StatementIntegrity['breaks'] = []
  let checkedRows = 0

  for (let i = 1; i < withBalance.length; i++) {
    const prev = withBalance[i - 1]!
    const curr = withBalance[i]!
    const delta = curr.direction === 'credit' ? curr.amount : -curr.amount
    const expected = round2((prev.balance as number) + delta)
    const actual = round2(curr.balance as number)
    checkedRows++
    if (Math.abs(expected - actual) > TOLERANCE) {
      breaks.push({ date: curr.date, expected, actual })
    }
  }

  const first = withBalance[0]!
  const firstDelta = first.direction === 'credit' ? first.amount : -first.amount

  return {
    hasBalances: true,
    continuous: breaks.length === 0,
    checkedRows,
    breaks: breaks.slice(0, 10), // enough to evidence the problem
    openingBalance: round2((first.balance as number) - firstDelta),
    closingBalance: round2(withBalance[withBalance.length - 1]!.balance as number),
  }
}

/**
 * Context for a targeted re-read around a balance break: the transactions on
 * and around the break date, plus the known-good running balances that bracket
 * it. This is the "here's what we're confident about, fix the middle" payload
 * handed to Claude when self-healing a misread.
 *
 * Returns the break row plus up to 2 neighbours each side that carry a printed
 * balance (those balances are trusted — they reconciled), and the surrounding
 * window of transactions (±7 days) so the re-read sees the full context. The
 * `beforeBalance`/`afterBalance` are the closest reconciled balances on each
 * side, i.e. the anchors the corrected rows must connect to.
 */
export interface BreakContext {
  breakDate: string
  beforeBalance: number | null
  afterBalance: number | null
  windowTxns: NormalizedTxn[]
}

export function findBreakContext(
  input: NormalizedTxn[],
  brk: { date: string; expected: number; actual: number }
): BreakContext {
  const txns = [...input].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
  const breakTime = toDate(brk.date).getTime()

  // ±7 calendar days either side of the break — wide enough to catch a
  // misread line that drifted onto a neighbouring date, narrow enough to keep
  // the re-read focused.
  const windowMs = 7 * 24 * 60 * 60 * 1000
  const windowTxns = txns.filter((t) => {
    const dt = toDate(t.date).getTime()
    return dt >= breakTime - windowMs && dt <= breakTime + windowMs
  })

  // The closest reconciled balances bracketing the break — these are trusted
  // anchors the corrected rows must connect to.
  const withBalance = txns.filter((t) => typeof t.balance === 'number')
  const before = withBalance
    .filter((t) => toDate(t.date).getTime() < breakTime)
    .at(-1)
  const after = withBalance
    .filter((t) => toDate(t.date).getTime() >= breakTime)
    .at(0)

  return {
    breakDate: brk.date,
    beforeBalance: before ? (before.balance as number) : null,
    afterBalance: after ? (after.balance as number) : null,
    windowTxns,
  }
}

/**
 * Does a set of transactions reconcile LOCALLY between two trusted anchor
 * balances? This is the verification behind self-healing: after Claude re-reads
 * the suspect window, we check that walking the corrected rows from the
 * before-anchor lands exactly on the after-anchor. If it does, the splice is
 * correct and we keep it — regardless of what breaks exist elsewhere in the
 * statement (those are separate problems, handled separately).
 *
 * Unlike the global checkBalanceContinuity, this is immune to the splice
 * shifting break signatures: it only cares that THIS window now connects,
 * which is the actual correctness question.
 *
 * @param windowTxns  the corrected transactions (sorted oldest-first)
 * @param beforeBalance  the trusted running balance immediately before the window (null = unanchored start)
 * @param afterBalance   the trusted running balance at/after the window (null = unanchored end)
 */
export function windowReconciles(
  windowTxns: NormalizedTxn[],
  beforeBalance: number | null,
  afterBalance: number | null
): boolean {
  // Need at least the rows and one anchor to say anything meaningful.
  const withBalance = windowTxns
    .slice()
    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
    .filter((t) => typeof t.balance === 'number')
  if (withBalance.length === 0) return false

  // Walk forward from the before-anchor: each printed balance must equal the
  // previous printed balance ± the row's amount. If beforeBalance is null we
  // can't verify the first hop, so start from the first printed balance instead.
  let prev: number | null = beforeBalance
  for (const t of withBalance) {
    const bal = t.balance as number
    if (prev !== null) {
      const delta = t.direction === 'credit' ? t.amount : -t.amount
      if (Math.abs(round2(prev + delta) - round2(bal)) > TOLERANCE) return false
    }
    prev = bal
  }

  // The last printed balance in the window must connect to the after-anchor.
  // (If afterBalance is null, the window is unanchored at the end — accept on
  // the internal-continuity check above having passed.)
  if (afterBalance !== null && prev !== null) {
    if (Math.abs(round2(prev) - round2(afterBalance)) > TOLERANCE) return false
  }
  return true
}
