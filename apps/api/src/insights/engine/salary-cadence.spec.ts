import { describe, it, expect } from 'vitest'
import type { NormalizedTxn } from './types'
import { detectRecurringStreams } from './recurrence'
import { analyzeIncome, incomeEligibleKeys } from './income'

/**
 * Salary cadence regression coverage.
 *
 * The bug (commit history): a stable FORTNIGHTLY salary was counted as income
 * but `recurringSalaryDetected` stayed false because `detectSalaryStream` only
 * admitted `monthly` or `four_weekly` cadences. For a user paid fortnightly
 * (common in the UK — Wise payroll in the tested statement is fortnightly),
 * this silently suppressed the +30 SALARY_RECURRING score contribution and
 * mis-reported income stability.
 *
 * These tests build a synthetic fortnightly salary stream end-to-end
 * (transactions → recurrence detection → income analysis) and assert the flag
 * flips. They also guard the gross-up trap: when the flag DOES flip, the
 * annualised figures must use ×26 (fortnightly), not ×12 — otherwise the fix
 * introduces a worse bug (≈46% undercount of annual salary).
 */

// Build N fortnightly salary credits from a single employer, stable amount.
function fortnightlySalary(opts: {
  employer: string
  amount: number
  count: number
  startDateISO: string
}): NormalizedTxn[] {
  const out: NormalizedTxn[] = []
  const start = new Date(opts.startDateISO).getTime()
  const fortnightMs = 14 * 24 * 60 * 60 * 1000
  for (let i = 0; i < opts.count; i++) {
    out.push({
      date: new Date(start + i * fortnightMs).toISOString().slice(0, 10),
      amount: opts.amount,
      direction: 'credit',
      description: `Received money from ${opts.employer} with reference Salary${opts.employer}`,
      merchantName: null,
      category: 'salary',
    })
  }
  return out
}

describe('salary cadence detection', () => {
  it('detects a FORTNIGHTLY salary stream as recurring salary (the regression)', () => {
    // 8 fortnightly payments ≈ 16 weeks of history, stable £2,000 each.
    const credits = fortnightlySalary({
      employer: 'Wise Payments',
      amount: 2000,
      count: 8,
      startDateISO: '2026-01-09',
    })
    // Sprinkle a few small debits so the txns array looks realistic (not required
    // by analyseIncome, but mirrors real input shape).
    const txns: NormalizedTxn[] = [
      ...credits,
      { date: '2026-01-15', amount: 50, direction: 'debit', description: 'Coffee', merchantName: null },
    ]

    const creditStreams = detectRecurringStreams(txns, 'credit')
    const incomeKeys = incomeEligibleKeys(txns, creditStreams)
    const profile = analyzeIncome(txns, creditStreams, new Set(), incomeKeys)

    // THE regression assertion — currently fails: fortnightly is excluded by the
    // cadence allow-list in detectSalaryStream, so the flag stays false even
    // though the income is clearly a stable recurring salary.
    expect(profile.recurringSalaryDetected).toBe(true)
  })

  it('annualises a fortnightly salary at ×26, NOT ×12 (the gross-up trap)', () => {
    const credits = fortnightlySalary({
      employer: 'Wise Payments',
      amount: 2000,
      count: 8,
      startDateISO: '2026-01-09',
    })
    const creditStreams = detectRecurringStreams(credits, 'credit')
    const incomeKeys = incomeEligibleKeys(credits, creditStreams)
    const profile = analyzeIncome(credits, creditStreams, new Set(), incomeKeys)

    // £2,000 × 26 / 12 ≈ £4,333.33 monthly net equivalent. If the engine used
    // ×12 (treating each payment as monthly) it would report £2,000 — wrong by
    // ~46%. We assert the annualised figure is in the right ballpark.
    expect(profile.estimatedGrossAnnualSalary).not.toBeNull()
    // salaryMonthlyNet = 2000 × 26 / 12 = 4333.33
    expect(profile.salaryMonthlyNet).toBeCloseTo(4333.33, 1)
  })

  it('still detects a monthly salary correctly (regression guard)', () => {
    const monthly: NormalizedTxn[] = []
    const start = new Date('2026-01-28').getTime()
    for (let i = 0; i < 6; i++) {
      monthly.push({
        date: new Date(start + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        amount: 3500,
        direction: 'credit',
        description: 'Salary from Acme Corp',
        merchantName: null,
        category: 'salary',
      })
    }
    const creditStreams = detectRecurringStreams(monthly, 'credit')
    const incomeKeys = incomeEligibleKeys(monthly, creditStreams)
    const profile = analyzeIncome(monthly, creditStreams, new Set(), incomeKeys)

    expect(profile.recurringSalaryDetected).toBe(true)
    // Monthly × 12 — no annualisation surprise.
    expect(profile.salaryMonthlyNet).toBeCloseTo(3500, 1)
  })
})
