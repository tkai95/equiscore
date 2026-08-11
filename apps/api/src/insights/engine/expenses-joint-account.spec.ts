import { describe, it, expect } from 'vitest'
import type { NormalizedTxn } from './types'
import { analyzeExpenses } from './expenses'
import { normalizeCounterparty } from './normalize'

/**
 * Joint-account financial semantics (PRD §22, §23).
 *
 * Confirming a counterparty as a joint household account establishes a
 * RELATIONSHIP, not a netting decision. The money really left the account;
 * we just know WHERE it went (the joint account), not WHAT it funded
 * downstream. So joint-account transfers must:
 *   - REMAIN in spend (NOT netted out, unlike own-account transfers)
 *   - route to a `household_funding` bucket flagged essential
 *   - NOT land in discretionary spending
 *
 * This is the critical distinction from ownAccountKeys, which fully zeroes
 * matched debits. Reusing ownAccountKeys semantics for joint accounts would
 * hide real co-spending — the exact double-counting failure PRD §40 warns of.
 */

function personTransfer(opts: { name: string; amount: number; count: number }): NormalizedTxn[] {
  const out: NormalizedTxn[] = []
  const start = new Date('2026-01-10').getTime()
  for (let i = 0; i < opts.count; i++) {
    out.push({
      date: new Date(start + i * 30 * 86400000).toISOString().slice(0, 10),
      amount: opts.amount,
      direction: 'debit',
      description: `Sent money to ${opts.name}`,
      merchantName: null,
      category: 'savings_transfer',
    })
  }
  return out
}

describe('joint-account household_funding bucket', () => {
  it('routes a confirmed joint-account transfer to household_funding, not discretionary', () => {
    const txns = personTransfer({ name: 'Kohinoor Choudhury', amount: 1200, count: 6 })
    // Use the ACTUAL normalized key the engine produces — normalizeCounterparty
    // keeps leading tokens like "sent money", so the key isn't just the name.
    const key = normalizeCounterparty(txns[0]!)
    const profileJoint = analyzeExpenses(
      txns,
      new Set(),
      6,
      undefined,
      new Set([key]), // recurring debit stream
      undefined, // ownAccountKeys — NOT set
      new Set([key]), // jointAccountKeys
    )
    const householdBucket = profileJoint.categories.find((c) => c.key === 'household_funding')
    expect(householdBucket).toBeDefined()
    expect(householdBucket!.essential).toBe(true)
    expect(householdBucket!.total).toBe(7200) // 1200 × 6 — full amount, NOT netted
  })

  it('does NOT reduce total spend (joint-account transfers are real outflows)', () => {
    const txns = personTransfer({ name: 'Kohinoor Choudhury', amount: 1200, count: 6 })
    const key = normalizeCounterparty(txns[0]!)
    // Without jointAccountKeys: the transfer is savings_transfer → skipped from spend.
    const beforeJoint = analyzeExpenses(txns, new Set(), 6, undefined, new Set([key]), undefined)
    // With jointAccountKeys: routed to household_funding, INCLUDED in spend.
    const withJoint = analyzeExpenses(
      txns, new Set(), 6, undefined, new Set([key]), undefined, new Set([key]),
    )
    // Spend must be HIGHER with the joint routing (the money now counts) —
    // never lower (which would indicate accidental netting).
    expect(withJoint.averageMonthlySpend).toBeGreaterThan(beforeJoint.averageMonthlySpend)
    expect(withJoint.averageMonthlySpend).toBeCloseTo(1200, 0) // ~£1200/mo
  })

  it('own-account transfers STILL net out to zero spend (regression guard)', () => {
    const txns = personTransfer({ name: 'My Savings', amount: 500, count: 6 })
    const key = normalizeCounterparty(txns[0]!)
    const profile = analyzeExpenses(
      txns, new Set(), 6, undefined, new Set([key]), new Set([key]), // ownAccountKeys
    )
    // Own-account transfers are internal — netted fully.
    expect(profile.averageMonthlySpend).toBe(0)
    expect(profile.categories.find((c) => c.key === 'household_funding')).toBeUndefined()
  })
})
