import { describe, it, expect } from 'vitest'
import type { RecurringStream } from './recurrence'
import type { NormalizedTxn, IncomeProfile, ExpenseProfile } from './types'
import { generateQuestions } from './questions'

/**
 * Credit-card ownership clarification (PRD §21, §77).
 *
 * A recurring debit stream to a credit-card/loan provider (Barclaycard, Amex,
 * etc.) is financially ambiguous: it may be the user's OWN card repayment, a
 * joint card, someone else's debt, or a regular bill. Only the user can say.
 * The engine must ask — and the answer establishes a relationship, NOT a
 * netting decision (the £4,000 really left the account; what we learn is the
 * financial ROLE: debt service, not new consumption).
 *
 * The question fires when a recurring stream is classified loan_repayment OR
 * matches a known credit-card provider, AND has no persisted resolution.
 */

function synthMerchantStream(opts: {
  key: string
  name: string
  amount: number
  occurrences: number
  category?: NormalizedTxn['category']
}): RecurringStream {
  const txns: NormalizedTxn[] = []
  const start = new Date('2026-01-05').getTime()
  for (let i = 0; i < opts.occurrences; i++) {
    txns.push({
      date: new Date(start + i * 30 * 86400000).toISOString().slice(0, 10),
      amount: opts.amount,
      direction: 'debit',
      description: `Paid to ${opts.name}`,
      merchantName: null,
      category: opts.category ?? 'loan_repayment',
    })
  }
  return {
    key: opts.key,
    name: opts.name,
    direction: 'debit',
    amount: opts.amount,
    amountCoV: 0.3, // card repayments vary month to month — allowed
    cadence: 'monthly',
    typicalDayOfMonth: 5,
    dayVariance: 3,
    consistency: 'consistent',
    occurrences: opts.occurrences,
    monthsCovered: opts.occurrences,
    missedCount: 0,
    txns,
  }
}

const minimalIncome = { averageMonthlyIncome: 5500, sources: [] } as unknown as IncomeProfile
const minimalExpenses = {
  averageMonthlySpend: 4000,
  essentialShare: 0.7,
  categories: [],
} as unknown as ExpenseProfile

describe('credit-card ownership clarification', () => {
  it('fires for a recurring Barclaycard stream with no resolution', () => {
    const stream = synthMerchantStream({
      key: 'barclaycard',
      name: 'Barclaycard',
      amount: 4000,
      occurrences: 5,
      category: 'loan_repayment',
    })
    const questions = generateQuestions({
      income: minimalIncome,
      expenses: minimalExpenses,
      unusual: [],
      debitStreams: [stream],
      externalAccounts: [],
      resolvedIds: new Set(),
      resolvedCounterpartyKeys: new Set(),
    })
    const q = questions.find((x) => x.id === 'role:barclaycard')
    expect(q).toBeDefined()
    expect(q!.question).toContain('Barclaycard')
    expect(q!.options).toEqual(
      expect.arrayContaining(['My credit card', 'My loan', 'A regular bill']),
    )
  })

  it('does NOT fire for an already-resolved credit card', () => {
    const stream = synthMerchantStream({
      key: 'barclaycard',
      name: 'Barclaycard',
      amount: 4000,
      occurrences: 5,
    })
    const questions = generateQuestions({
      income: minimalIncome,
      expenses: minimalExpenses,
      unusual: [],
      debitStreams: [stream],
      externalAccounts: [],
      resolvedIds: new Set(),
      resolvedCounterpartyKeys: new Set(['barclaycard']),
    })
    expect(questions.find((x) => x.id === 'role:barclaycard')).toBeUndefined()
  })

  it('does NOT double-up with the person-transfer question for the same stream', () => {
    // A stream is EITHER a person transfer OR a merchant — not both. A
    // Barclaycard stream should produce the credit-card question, not the
    // person-transfer question.
    const stream = synthMerchantStream({
      key: 'barclaycard',
      name: 'Barclaycard',
      amount: 4000,
      occurrences: 5,
    })
    const questions = generateQuestions({
      income: minimalIncome,
      expenses: minimalExpenses,
      unusual: [],
      debitStreams: [stream],
      externalAccounts: [],
      resolvedIds: new Set(),
      resolvedCounterpartyKeys: new Set(),
    })
    // Exactly one role:barclaycard question (the credit-card one), not zero.
    expect(questions.filter((x) => x.id === 'role:barclaycard')).toHaveLength(1)
  })
})
