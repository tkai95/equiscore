import { describe, it, expect } from 'vitest'
import type { NormalizedTxn } from './types'
import { detectRecurringStreams } from './recurrence'
import { analyzeIncome, incomeEligibleKeys } from './income'

/**
 * Salary detection with variable-amount income (PRD §16: "Do NOT assume that
 * recurring = same amount").
 *
 * Real salary packages mix amounts under one counterparty: a base salary, a
 * bonus component, an allowance, dividends — all from "Wise Payments". The
 * aggregate CoV is high (~0.80) so the strict CoV ≤ 0.15 gate rejects the
 * stream and recurringSalaryDetected stays false, even though there IS a
 * stable dominant salary amount buried in the mix.
 *
 * The fix: when a stream has the right cadence but high CoV, look for a
 * dominant amount sub-cluster (an amount band that covers ≥40% of
 * transactions with low internal variance). If found, treat the dominant
 * band as the salary.
 */

// Build a fortnightly credit stream from one employer with MIXED amounts —
// mirrors the production Wise Payments data distribution.
function mixedSalaryStream(opts: {
  employer: string
  base: number // dominant amount
  baseCount: number
  variants: Array<{ amount: number; count: number }>
}): NormalizedTxn[] {
  const out: NormalizedTxn[] = []
  const start = new Date('2025-08-15').getTime()
  const fortnightMs = 14 * 86400000
  let idx = 0
  // Interleave base + variants on a fortnightly cadence.
  for (let i = 0; i < opts.baseCount; i++) {
    out.push({
      date: new Date(start + idx * fortnightMs).toISOString().slice(0, 10),
      amount: opts.base,
      direction: 'credit',
      description: `Received money from ${opts.employer} with reference Salary`,
      merchantName: null,
      category: 'salary',
    })
    idx++
  }
  for (const v of opts.variants) {
    for (let i = 0; i < v.count; i++) {
      out.push({
        date: new Date(start + idx * fortnightMs).toISOString().slice(0, 10),
        amount: v.amount,
        direction: 'credit',
        description: `Received money from ${opts.employer} with reference Dividend`,
        merchantName: null,
        category: 'salary',
      })
      idx++
    }
  }
  // Sort by date so recurrence detection sees them in order.
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

describe('salary detection with variable-amount income (dominant amount)', () => {
  it('detects salary when a dominant amount is buried in a high-CoV stream', () => {
    // Mirrors production: £3,205 base × 12, £2,650 bonus × 5, £400 allowance × 5,
    // £5,534 dividend × 3. Aggregate CoV ~0.8 — way above 0.15.
    const credits = mixedSalaryStream({
      employer: 'Wise Payments',
      base: 3205,
      baseCount: 12,
      variants: [
        { amount: 2650, count: 5 },
        { amount: 400, count: 5 },
        { amount: 5534, count: 3 },
      ],
    })
    const creditStreams = detectRecurringStreams(credits, 'credit')
    const incomeKeys = incomeEligibleKeys(credits, creditStreams)
    const profile = analyzeIncome(credits, creditStreams, new Set(), incomeKeys)

    // THE fix: even though the stream's aggregate CoV > 0.15, the dominant
    // £3,205 amount (12 of 25 = 48%) is stable and clearly salary.
    expect(profile.recurringSalaryDetected).toBe(true)
  })

  it('does NOT false-positive on a stream with no dominant amount (uniformly variable)', () => {
    // 10 credits, all different amounts, no dominant band — not salary.
    const credits: NormalizedTxn[] = []
    const start = new Date('2025-08-15').getTime()
    for (let i = 0; i < 10; i++) {
      credits.push({
        date: new Date(start + i * 14 * 86400000).toISOString().slice(0, 10),
        amount: 500 + i * 373, // 500, 873, 1246, ... all different
        direction: 'credit',
        description: 'Received money from Various Clients',
        merchantName: null,
        category: 'gig_income',
      })
    }
    const creditStreams = detectRecurringStreams(credits, 'credit')
    const incomeKeys = incomeEligibleKeys(credits, creditStreams)
    const profile = analyzeIncome(credits, creditStreams, new Set(), incomeKeys)

    // No dominant amount → genuinely variable gig income, not salary.
    expect(profile.recurringSalaryDetected).toBe(false)
  })
})
