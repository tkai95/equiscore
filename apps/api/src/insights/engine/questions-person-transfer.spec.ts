import { describe, it, expect } from 'vitest'
import type { RecurringStream } from './recurrence'
import type { NormalizedTxn, IncomeProfile, ExpenseProfile } from './types'
import { generateQuestions } from './questions'

/**
 * Person-transfer clarification regression + meaning-based trigger (PRD §24, §72-B).
 *
 * The bug: the "is this £X to {person} rent/family-support/etc?" question only
 * fired when `classify(s.txns[0]) === 'other'`. After the category-threading
 * fix honoured stored categories, person-to-person transfers classified as
 * `savings_transfer` — so the BETTER classifier silently prevented the question
 * from being asked. The user never got to resolve the ambiguity.
 *
 * The fix (PRD §24): clarification is driven by UNRESOLVED FINANCIAL MEANING,
 * not by a category value. A material recurring transfer to a person whose
 * role/relationship is unresolved must produce a question — regardless of
 * whether the classifier happened to label it `other`, `savings_transfer`, or
 * anything else. Category informs the OPTIONS, not WHETHER to ask.
 *
 * The question is now per-counterparty (id `role:<key>`) so different people
 * get different questions, and the answer persists as a CounterpartyResolution.
 */

// Minimal synth shapes — only the fields generateQuestions reads.
function synthPersonStream(opts: {
  key: string
  name: string
  amount: number
  occurrences: number
  cadence?: RecurringStream['cadence']
  category?: NormalizedTxn['category']
}): RecurringStream {
  const txns: NormalizedTxn[] = []
  const start = new Date('2026-01-15').getTime()
  for (let i = 0; i < opts.occurrences; i++) {
    txns.push({
      date: new Date(start + i * 30 * 86400000).toISOString().slice(0, 10),
      amount: opts.amount,
      direction: 'debit',
      description: `Sent money to ${opts.name}`,
      merchantName: null,
      category: opts.category ?? 'savings_transfer',
    })
  }
  return {
    key: opts.key,
    name: opts.name,
    direction: 'debit',
    amount: opts.amount,
    amountCoV: 0.02,
    cadence: opts.cadence ?? 'monthly',
    typicalDayOfMonth: 15,
    dayVariance: 2,
    consistency: 'very_consistent',
    occurrences: opts.occurrences,
    monthsCovered: opts.occurrences,
    missedCount: 0,
    txns,
  }
}

const minimalIncome = {
  averageMonthlyIncome: 5000,
  netAnnualIncome: 60000,
  volatility: 0.1,
  sources: [],
  recurringSalaryDetected: true,
  character: 'employment',
} as unknown as IncomeProfile
const minimalExpenses = {
  averageMonthlySpend: 3000,
  essentialShare: 0.6,
  categories: [],
} as unknown as ExpenseProfile

describe('person-transfer clarification (meaning-based trigger)', () => {
  it('fires for a material recurring person transfer classified savings_transfer (the regression)', () => {
    // The stream's stored category is savings_transfer — exactly the case the
    // old category-based trigger missed.
    const stream = synthPersonStream({
      key: 'kohinoor choudhury',
      name: 'Kohinoor Choudhury',
      amount: 1200,
      occurrences: 6,
      category: 'savings_transfer',
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
    const q = questions.find((x) => x.id === 'role:kohinoor choudhury')
    // THE regression — currently no question fires because classify() returns
    // 'savings_transfer', not 'other'.
    expect(q).toBeDefined()
    expect(q!.question).toContain('Kohinoor Choudhury')
    expect(q!.options).toEqual(
      expect.arrayContaining(['My own/joint account', 'Rent', 'Family support']),
    )
  })

  it('does NOT fire for an already-resolved counterparty (suppression)', () => {
    const stream = synthPersonStream({
      key: 'kohinoor choudhury',
      name: 'Kohinoor Choudhury',
      amount: 1200,
      occurrences: 6,
    })
    const questions = generateQuestions({
      income: minimalIncome,
      expenses: minimalExpenses,
      unusual: [],
      debitStreams: [stream],
      externalAccounts: [],
      resolvedIds: new Set(),
      // Already resolved — the user told us who this is. Don't re-ask.
      resolvedCounterpartyKeys: new Set(['kohinoor choudhury']),
    })
    expect(questions.find((x) => x.id === 'role:kohinoor choudhury')).toBeUndefined()
  })

  it('does NOT fire for a sub-material amount (materiality gate)', () => {
    const stream = synthPersonStream({
      key: 'john smith',
      name: 'John Smith',
      amount: 25, // small — not worth a question
      occurrences: 6,
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
    expect(questions.find((x) => x.id === 'role:john smith')).toBeUndefined()
  })

  it('does NOT fire for a stream already covered by the transfer: question', () => {
    const stream = synthPersonStream({
      key: 'acme savings',
      name: 'Acme Savings',
      amount: 1200,
      occurrences: 6,
    })
    const questions = generateQuestions({
      income: minimalIncome,
      expenses: minimalExpenses,
      unusual: [],
      debitStreams: [stream],
      externalAccounts: [{ key: 'acme savings', provider: 'Acme', type: 'unknown', confidence: 'low', monthlyFlow: 1200 } as never],
      resolvedIds: new Set(),
      resolvedCounterpartyKeys: new Set(),
    })
    // The external-account "who do you send this to?" question covers it instead.
    expect(questions.find((x) => x.id === 'role:acme savings')).toBeUndefined()
  })
})
