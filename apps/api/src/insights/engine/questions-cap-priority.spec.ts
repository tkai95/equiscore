import { describe, it, expect } from 'vitest'
import type { RecurringStream } from './recurrence'
import type { NormalizedTxn, IncomeProfile, ExpenseProfile } from './types'
import { generateQuestions } from './questions'

/**
 * Question cap removal + priority ordering + cross-question suppression (PRD §25-29).
 *
 * The old engine capped questions at 6 and didn't sort by materiality. The fix:
 *   - No cap — show every material unresolved question.
 *   - Sort by priority (materiality × recurrence) so the most important surface first.
 *   - A resolution on one counterparty suppresses ALL questions for that
 *     counterparty (both role: and transfer:), so the user is never asked
 *     about the same entity twice in different guises (PRD §28 — question bundling).
 */

function personStream(opts: { key: string; name: string; amount: number; occ: number }): RecurringStream {
  const txns: NormalizedTxn[] = []
  for (let i = 0; i < opts.occ; i++) {
    txns.push({
      date: new Date(2026, 0, 10 + i * 30).toISOString().slice(0, 10),
      amount: opts.amount, direction: 'debit',
      description: `Sent money to ${opts.name}`, merchantName: null, category: 'savings_transfer',
    })
  }
  return { key: opts.key, name: opts.name, direction: 'debit', amount: opts.amount, amountCoV: 0.02,
    cadence: 'monthly', typicalDayOfMonth: 10, dayVariance: 2, consistency: 'very_consistent',
    occurrences: opts.occ, monthsCovered: opts.occ, missedCount: 0, txns }
}

const minIncome = { averageMonthlyIncome: 5000, sources: [] } as unknown as IncomeProfile
const minExpenses = { averageMonthlySpend: 3000, essentialShare: 0.6, categories: [] } as unknown as ExpenseProfile

describe('question cap + priority + cross-question suppression', () => {
  it('returns ALL material questions, not capped at 6', () => {
    // 8 different material person transfers — all should produce questions.
    const names = ['john smith', 'mary jones', 'ali khan', 'sue wang', 'tom reed', 'ann dale', 'pat cole', 'ben fog']
    const streams = names.map((name, i) =>
      personStream({ key: name, name, amount: 300 + i * 100, occ: 4 }),
    )
    const questions = generateQuestions({
      income: minIncome, expenses: minExpenses, unusual: [],
      debitStreams: streams, externalAccounts: [],
      resolvedIds: new Set(), resolvedCounterpartyKeys: new Set(),
    })
    // No cap — all 8 person-transfer questions fire.
    expect(questions.length).toBeGreaterThanOrEqual(8)
  })

  it('sorts by priority — higher amount surfaces first', () => {
    const streams = [
      personStream({ key: 'sam small', name: 'Sam Small', amount: 250, occ: 4 }),
      personStream({ key: 'lucy large', name: 'Lucy Large', amount: 5000, occ: 6 }),
      personStream({ key: 'mia mid', name: 'Mia Mid', amount: 1000, occ: 5 }),
    ]
    const questions = generateQuestions({
      income: minIncome, expenses: minExpenses, unusual: [],
      debitStreams: streams, externalAccounts: [],
      resolvedIds: new Set(), resolvedCounterpartyKeys: new Set(),
    })
    // The £5,000 question should rank above the £250 question.
    const largeIdx = questions.findIndex((q) => q.id === 'role:lucy large')
    const smallIdx = questions.findIndex((q) => q.id === 'role:sam small')
    expect(largeIdx).toBeGreaterThanOrEqual(0)
    expect(smallIdx).toBeGreaterThanOrEqual(0)
    expect(largeIdx).toBeLessThan(smallIdx)
    // Priority field populated.
    expect(questions[0]!.priority).toBeDefined()
    expect(typeof questions[0]!.priority).toBe('number')
  })

  it('suppresses BOTH role: and transfer: questions for a resolved counterparty', () => {
    const stream = personStream({ key: 'kohinoor choudhury', name: 'Kohinoor Choudhury', amount: 1200, occ: 6 })
    const questions = generateQuestions({
      income: minIncome, expenses: minExpenses, unusual: [],
      debitStreams: [stream],
      // The same counterparty appears as an external account AND a person stream.
      externalAccounts: [{ key: 'kohinoor choudhury', provider: 'Kohinoor', type: 'unknown', confidence: 'low', monthlyFlow: 1200 } as never],
      resolvedIds: new Set(),
      // User already resolved this counterparty — no question should fire for it.
      resolvedCounterpartyKeys: new Set(['kohinoor choudhury']),
    })
    expect(questions.find((q) => q.id === 'role:kohinoor choudhury')).toBeUndefined()
    expect(questions.find((q) => q.id === 'transfer:kohinoor choudhury')).toBeUndefined()
  })
})
