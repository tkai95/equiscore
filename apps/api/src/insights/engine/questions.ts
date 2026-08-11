import type { FollowUpQuestion, IncomeProfile, ExpenseProfile, UnusualTransaction } from './types'
import type { RecurringStream } from './recurrence'
import type { InferredAccount } from './external-accounts'
import { classify } from './classify'
import { looksLikePerson } from './normalize'
import { looksLikeCreditCardProvider } from './merchant-patterns'

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
    // Suppress if the user already resolved this counterparty via any question
    // path (role: or transfer:) — the relationship inherits, never re-ask (PRD §29).
    if (resolvedCounterpartyKeys.has(a.key)) continue
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
      priority: a.monthlyFlow * 3, // recurring monthly flow — materiality × recurrence
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
        priority: u.amount, // one-off — materiality is the amount itself
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
        priority: u.amount,
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
      priority: s.amount * s.occurrences, // total volume — materiality × recurrence
    })
  }

  // 3. Recurring credit-card / loan provider payments — whose debt is this?
  //    A recurring stream to a known credit-card/loan provider (Barclaycard,
  //    Amex, etc.) or classified loan_repayment is financially ambiguous: it
  //    may be the user's OWN card repayment, a joint card, someone else's debt,
  //    or a regular bill. Only the user can say (PRD §21, §77). The answer
  //    establishes a financial ROLE (debt service, not new consumption) — it
  //    does NOT net out the cashflow (the £4,000 really left the account).
  //    Suppressed by persisted CounterpartyResolution (PRD §29).
  for (const s of debitStreams) {
    // Only merchant streams that look like credit-card/loan providers OR are
    // classified loan_repayment. Person streams are handled by block 2 above.
    if (looksLikePerson(s.key)) continue
    const isCreditCardLike =
      classify(s.txns[Math.floor(s.txns.length / 2)]!) === 'loan_repayment' ||
      looksLikeCreditCardProvider(s.key)
    if (!isCreditCardLike) continue
    if (s.occurrences < 2) continue
    if (resolvedCounterpartyKeys.has(s.key)) continue
    if (externalKeys.has(s.key)) continue
    const id = `role:${s.key}`
    if (resolvedIds.has(id)) continue
    out.push({
      id,
      question: `You pay about £${s.amount.toLocaleString('en-GB')} to ${s.name} regularly. Is this your own credit card or loan?`,
      detail:
        'This tells us the payment is debt servicing rather than new spending. The amount still counts as real cash leaving your account.',
      options: ['My credit card', 'My loan', "Someone else's debt", 'A regular bill', 'Something else'],
      relatedTxnIds: [],
      clarifies: 'Debt servicing & affordability',
      priority: s.amount * s.occurrences,
    })
  }

  // 4. Confirm gig income as regular income.
  for (const src of income.sources) {
    if (src.category !== 'gig_income' || !src.pendingConfirmation) continue
    out.push({
      id: `income:${src.name}`,
      question: `Are the payments from ${src.name} part of your regular income?`,
      detail: "If yes, we'll fold them into your verified monthly income.",
      options: ['Yes, regular income', 'Occasional', 'One-off', 'No longer active'],
      relatedTxnIds: [],
      clarifies: 'Income stability',
      priority: src.monthlyAverage * 3,
    })
  }

  // No hard cap (PRD §25: "do not ask about every coffee" — but DO ask about
  // every MATERIALLY ambiguous item). Sort by priority descending so the
  // highest-impact questions surface first. The frontend can paginate/progressively
  // disclose if the list is long, but the engine surfaces everything that matters.
  return out.sort((a, b) => b.priority - a.priority)
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
