import type { FollowUpQuestion, IncomeProfile, ExpenseProfile, UnusualTransaction } from './types'
import type { RecurringStream } from './recurrence'
import type { InferredAccount } from './external-accounts'
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
  externalAccounts: InferredAccount[]
  resolvedIds: Set<string>
}): FollowUpQuestion[] {
  const { income, expenses, unusual, debitStreams, externalAccounts, resolvedIds } = input
  const out: FollowUpQuestion[] = []

  // 0. Regular outgoing transfers detected by pattern. Ask whenever we're not
  // certain — an 'unknown' destination, or an own-account guess from initials
  // alone. We never assume it's the customer's own account without confirming.
  const externalKeys = new Set(externalAccounts.map((a) => a.key))
  for (const a of externalAccounts) {
    const uncertain = a.type === 'unknown' || (a.type === 'own_current' && a.confidence !== 'high')
    if (!uncertain) continue
    const id = `transfer:${a.key}`
    if (resolvedIds.has(id)) continue
    out.push({
      id,
      question: `You send about £${a.monthlyFlow.toLocaleString('en-GB')} to ${a.provider ?? 'the same place'} on a regular schedule — who is this?`,
      detail:
        "If it's your own account, we won't count it as spending. If it's rent, it counts toward rental reliability.",
      options: ['My own account', 'My rent', 'Someone I support', 'A regular bill', 'Someone else'],
      relatedTxnIds: [],
      clarifies: 'Spending & account coverage',
    })
  }

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
      (s) =>
        looksLikePerson(s.key) &&
        classify(s.txns[0]!) === 'other' &&
        (s.cadence === 'monthly' || s.cadence === 'four_weekly') &&
        // Not already covered by the "who do you send this to?" transfer question.
        !externalKeys.has(s.key)
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
