import type { NormalizedTxn } from './types'
import { toDate } from './util'

/**
 * Match transfers between two of the user's own connected accounts, so both
 * legs can be netted out. When someone connects their salary account AND their
 * savings/expenses account, a £400 standing order shows up twice in the merged
 * data — as a debit leaving one account and a credit arriving in the other.
 * Counting the credit as income (and the debit as spend) would double-count
 * money that never left the household.
 *
 * The signal is precise and hard to hit by accident: the same amount leaving
 * one account and arriving in a *different* account within a few days. We match
 * greedily, one debit to one credit, so a genuine same-amount payment to a third
 * party isn't swept up unless it truly mirrors an internal movement.
 */

const DAY = 24 * 60 * 60 * 1000
const WINDOW = 4 * DAY // transfers usually settle same-day or next-day
const MIN_AMOUNT = 10 // ignore trivial amounts where coincidences are likely

export function detectInternalTransfers(txns: NormalizedTxn[]): Set<NormalizedTxn> {
  const internal = new Set<NormalizedTxn>()

  const accountIds = new Set(txns.map((t) => t.accountId).filter(Boolean))
  if (accountIds.size < 2) return internal // nothing to net out with one account

  const debits = txns.filter((t) => t.direction === 'debit' && t.accountId && t.amount >= MIN_AMOUNT)
  const credits = txns.filter((t) => t.direction === 'credit' && t.accountId && t.amount >= MIN_AMOUNT)
  const usedCredit = new Set<NormalizedTxn>()

  for (const d of debits) {
    const dTime = toDate(d.date).getTime()
    let best: NormalizedTxn | null = null
    let bestGap = Infinity
    for (const c of credits) {
      if (usedCredit.has(c)) continue
      if (c.accountId === d.accountId) continue // must be a DIFFERENT account
      if (Math.abs(c.amount - d.amount) > 0.01) continue // same amount
      const gap = Math.abs(toDate(c.date).getTime() - dTime)
      if (gap <= WINDOW && gap < bestGap) {
        best = c
        bestGap = gap
      }
    }
    if (best) {
      internal.add(d)
      internal.add(best)
      usedCredit.add(best)
    }
  }

  return internal
}
