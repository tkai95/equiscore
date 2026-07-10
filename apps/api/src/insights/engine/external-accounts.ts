import type { NormalizedTxn } from './types'
import type { RecurringStream } from './recurrence'
import { classify } from './classify'
import { nameMatchScore } from './normalize'
import { toDate, monthKey, round2 } from './util'

/**
 * Infer accounts the person holds that we can't see, from the money that moves
 * out of the account we can. The primary signal is BEHAVIOURAL, not keywords: a
 * regular, fixed, materially-sized outflow to a destination we don't recognise
 * as a merchant or bill is — by its shape alone — a transfer to another account.
 * An auto-transfer the customer never labelled still looks exactly like one.
 *
 * Keywords, the account holder's name/initials, and payday timing only sharpen
 * the read. Crucially, when the pattern is clear but the destination isn't, we
 * do NOT assume it's the customer's own account — we mark it 'unknown' so the
 * question engine can ask "who do you send this to?".
 */

export type ExternalAccountType = 'savings' | 'investment' | 'credit' | 'own_current' | 'unknown'
export type ExternalConfidence = 'high' | 'medium'

export interface InferredAccount {
  type: ExternalAccountType
  /** Normalised counterparty key — lets a follow-up question and its answer
   *  refer back to this exact transfer. */
  key: string
  label: string
  provider: string | null
  direction: 'outflow' | 'inflow' | 'both'
  monthlyFlow: number
  occurrences: number
  monthsPresent: number
  confidence: ExternalConfidence
  reason: string
}

// Categories that ARE real spending / bills — a recurring payment here is not a
// transfer to another account.
const RECOGNISED_SPEND = new Set([
  'utilities',
  'groceries',
  'transport',
  'entertainment',
  'healthcare',
  'education',
  'cash_withdrawal',
])

function initials(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
}

export function detectExternalAccounts(
  txns: NormalizedTxn[],
  debitStreams: RecurringStream[],
  ctx: {
    accountHolderName?: string | null
    months: number
    salaryDayOfMonth?: number | null
    /** Counterparty keys the customer has confirmed are their own account. */
    ownAccountKeys?: Set<string>
  }
): InferredAccount[] {
  const periodMonths = Math.max(1, ctx.months)
  const holder = ctx.accountHolderName ?? null
  const holderInits = holder ? initials(holder) : ''
  const ownKeys = ctx.ownAccountKeys ?? new Set<string>()
  const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

  const out: InferredAccount[] = []

  for (const s of debitStreams) {
    const monthly = s.cadence === 'monthly' || s.cadence === 'four_weekly'
    if (!monthly || s.occurrences < 3 || s.amount < 50) continue

    const rep = s.txns[Math.floor(s.txns.length / 2)]!
    const cat = classify(rep)
    // Real bills / rent are spending, not another account. (Rent is handled by
    // the rental engine; recognised merchant spend stays as spend.)
    if (RECOGNISED_SPEND.has(cat) || cat === 'rent_payment') continue

    const desc = (rep.description ?? '').toLowerCase()
    const fixed = s.amountCoV <= 0.08
    const round = s.amount % 10 === 0
    const rail = /\b(standing order|s\/?o|transfer|xfer|trf|faster payment|bank giro)\b/.test(desc)
    const nameHit = holder ? nameMatchScore(holder, s.name) >= 0.6 : false
    const initialsHit = holderInits.length >= 2 && new RegExp(`\\b${holderInits}\\b`, 'i').test(desc)
    const postPayday =
      ctx.salaryDayOfMonth != null &&
      s.typicalDayOfMonth != null &&
      ((s.typicalDayOfMonth - ctx.salaryDayOfMonth + 31) % 31) <= 3
    const confirmedOwn = ownKeys.has(s.key)
    const monthsPresent = new Set(s.txns.map((t) => monthKey(toDate(t.date)))).size

    let type: ExternalAccountType
    let label: string
    let confidence: ExternalConfidence = 'high'

    if (cat === 'savings_transfer') {
      type = 'savings'
      label = 'Savings account or pot'
    } else if (cat === 'investment') {
      type = 'investment'
      label = 'Investment account'
    } else if (cat === 'loan_repayment') {
      type = 'credit'
      label = 'Credit card or loan'
    } else if (confirmedOwn || nameHit || initialsHit) {
      type = 'own_current'
      label = 'Another account in your name'
      confidence = confirmedOwn || nameHit ? 'high' : 'medium'
    } else {
      // The pattern is clear but the destination isn't. Don't guess it's an own
      // account — surface it for a question.
      type = 'unknown'
      label = 'Unidentified regular transfer'
      confidence = fixed && round && (rail || postPayday) ? 'high' : 'medium'
    }

    const monthlyFlow = round2((s.amount * s.occurrences) / periodMonths)
    const reason =
      type === 'savings'
        ? `${gbp(s.amount)} moves to savings on a regular schedule.`
        : type === 'investment'
          ? `${gbp(s.amount)} moves to an investment account regularly.`
          : type === 'credit'
            ? `Regular repayments to ${s.name || 'a credit card or loan'} — a balance held on another account.`
            : type === 'own_current'
              ? `${gbp(s.amount)} goes to ${s.name} every month, which appears to be your own account.`
              : `${gbp(s.amount)} leaves to ${s.name || 'the same destination'} like clockwork${postPayday ? ' just after payday' : ''} — a regular transfer we couldn't identify.`

    out.push({
      type,
      key: s.key,
      label,
      provider: s.name || null,
      direction: 'outflow',
      monthlyFlow,
      occurrences: s.occurrences,
      monthsPresent,
      confidence,
      reason,
    })
  }

  const rank = { high: 0, medium: 1 } as const
  return out
    .sort((a, b) => rank[a.confidence] - rank[b.confidence] || b.monthlyFlow - a.monthlyFlow)
    .slice(0, 8)
}
