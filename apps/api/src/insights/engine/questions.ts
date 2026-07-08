import type { FollowUpQuestion, IncomeProfile, ExpenseProfile, UnusualTransaction } from './types'
import type { RecurringStream } from './recurrence'
import { classify } from './classify'
import { looksLikePerson } from './normalize'

/**
 * Turn ambiguity into questions. This is the fairness engine: instead of
 * assuming what an unexplained payment is, we ask — and the answer both
 * resolves the item and improves the customer's Transaction Clarity.
 */

const INTERNATIONAL = /\b(wise|transferwise|remitly|western union|moneygram|worldremit|xoom)\b/i

export function generateQuestions(input: {
  income: IncomeProfile
  expenses: ExpenseProfile
  unusual: UnusualTransaction[]
  debitStreams: RecurringStream[]
  resolvedIds: Set<string>
}): FollowUpQuestion[] {
  const { income, expenses, unusual, debitStreams, resolvedIds } = input
  const out: FollowUpQuestion[] = []

  // 1. Unusual one-off / international transactions.
  for (const u of unusual) {
    if (u.status === 'resolved') continue
    const intl = INTERNATIONAL.test(u.counterparty)
    if (intl) {
      out.push({
        id: u.id,
        question: `Was the £${u.amount.toLocaleString('en-GB')} to ${u.counterparty} on ${fmt(u.date)} a transfer to your own account abroad?`,
        detail: "Own-account transfers aren't spending — we'll net them out rather than treat them as an outgoing.",
        options: ['My own account', 'Family support', 'Paying someone', 'Other'],
        relatedTxnIds: [u.id],
        clarifies: 'Transaction clarity',
      })
    } else {
      const verb = u.direction === 'debit' ? 'you sent to' : 'you received from'
      out.push({
        id: u.id,
        question: `What was the £${u.amount.toLocaleString('en-GB')} ${verb} ${u.counterparty} on ${fmt(u.date)}?`,
        detail: 'A one-off that stands out from your normal activity. Once explained it can count in your favour.',
        options: ['Savings', 'Family support', 'Gift', 'Rent deposit', 'Sold something', 'Other'],
        relatedTxnIds: [u.id],
        clarifies: 'Transaction clarity',
      })
    }
  }

  // 2. Recurring payments to an individual — rent, family support, or other?
  const familyUnconfirmed = expenses.categories.some((c) => c.key === 'family_support' && c.unconfirmed)
  if (familyUnconfirmed && !resolvedIds.has('expense:family_support')) {
    const personStream = debitStreams.find(
      (s) => looksLikePerson(s.key) && classify(s.txns[0]!) === 'other' && (s.cadence === 'monthly' || s.cadence === 'four_weekly')
    )
    if (personStream) {
      out.push({
        id: 'expense:family_support',
        question: `Is the £${personStream.amount.toLocaleString('en-GB')} you pay ${personStream.name} every month rent, family support, or something else?`,
        detail: 'This changes how we classify it — rent counts toward rental reliability, family support toward your commitments.',
        options: ['Rent', 'Family support', 'Repaying a loan', 'Something else'],
        relatedTxnIds: [],
        clarifies: 'Rental reliability & clarity',
      })
    }
  }

  // 3. Confirm gig income as regular income.
  for (const src of income.sources) {
    if (src.category !== 'gig_income' || !src.pendingConfirmation) continue
    out.push({
      id: `income:${src.name}`,
      question: `Are the payments from ${src.name} part of your regular income?`,
      detail: "If yes, we'll fold them into your verified monthly income.",
      options: ['Yes, regular income', 'Occasional', 'One-off', 'No longer active'],
      relatedTxnIds: [],
      clarifies: 'Income stability',
    })
  }

  // Keep it to a manageable set; most-valuable first (unusual → recurring → income).
  return out.slice(0, 6)
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
