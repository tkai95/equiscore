import type { FollowUpQuestion, IncomeProfile, ExpenseProfile, UnusualTransaction } from './types'
import type { RecurringStream } from './recurrence'
import type { InferredAccount } from './external-accounts'
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
  /** Counterparty keys the user has already resolved via a CounterpartyResolution.
   *  Questions for these are suppressed (the relationship inherits across uploads). */
  resolvedCounterpartyKeys?: Set<string>
}): FollowUpQuestion[] {
  const { income, expenses, unusual, debitStreams, externalAccounts, resolvedIds } = input
  const resolvedCounterpartyKeys = input.resolvedCounterpartyKeys ?? new Set<string>()
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

  // 2. Recurring material transfers to a person — rent, family support, joint
  //    account, or other? This is the meaning-based trigger (PRD §24): the
  //    question fires whenever a MATERIAL recurring transfer to a person has an
  //    UNRESOLVED financial meaning — NOT when a classifier happens to return a
  //    particular category. The previous trigger required `classify() === 'other'`,
  //    which silently broke when the hybrid classifier labelled person transfers
  //    `savings_transfer`. Category now informs the options, not whether to ask.
  //    One question per counterparty (id `role:<key>`); the answer persists as a
  //    CounterpartyResolution so it inherits across uploads and is never re-asked.
  const MATERIAL_PERSON_AMOUNT = 200 // below this, not worth a question (PRD §25)
  for (const s of debitStreams) {
    if (!looksLikePerson(s.key)) continue
    if (s.amount < MATERIAL_PERSON_AMOUNT) continue
    if (s.occurrences < 3) continue
    // Already resolved (persisted CounterpartyResolution) — don't re-ask.
    if (resolvedCounterpartyKeys.has(s.key)) continue
    // Already covered by the "who do you send this to?" external-account question.
    if (externalKeys.has(s.key)) continue
    const id = `role:${s.key}`
    if (resolvedIds.has(id)) continue
    const cadenceWord = s.cadence === 'fortnightly' ? 'fortnight' : s.cadence === 'weekly' ? 'week' : 'month'
    out.push({
      id,
      question: `You send about £${s.amount.toLocaleString('en-GB')} to ${s.name} every ${cadenceWord}. What is this for?`,
      detail:
        'This changes how we treat it — rent counts toward rental reliability, a joint-account transfer is household funding, family support is a commitment.',
      options: ['My own/joint account', 'Rent', 'Family support', 'Repaying a loan', 'Something else'],
      relatedTxnIds: [],
      clarifies: 'Rental reliability, commitments & clarity',
    })
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
