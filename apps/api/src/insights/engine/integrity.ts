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
