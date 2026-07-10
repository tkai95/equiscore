import type { NormalizedTxn } from './types'
import { classify } from './classify'
import { normalizeCounterparty, displayName, looksLikePerson, nameMatchScore } from './normalize'
import { toDate, monthKey, round2 } from './util'

/**
 * Infer accounts the person holds that we can't directly see, from the money
 * that moves in and out of the statement we *can* see. You never see another
 * account's contents, but a single account leaks strong evidence that others
 * exist: transfers to a savings pot, credit-card repayments (a liability held
 * elsewhere), and money moving to/from an account in the same person's name.
 *
 * The point is completeness: a profile drawn from one account is a partial
 * picture. Surfacing what's missing lets us ask the user to connect the rest
 * (usually strengthening their profile) and lets the score note when material
 * money flows somewhere we can't see.
 */

export type ExternalAccountType = 'savings' | 'investment' | 'credit' | 'own_current'
export type ExternalConfidence = 'high' | 'medium'

export interface InferredAccount {
  type: ExternalAccountType
  /** What to call it in the UI. */
  label: string
  /** Best-guess counterparty/provider name. */
  provider: string | null
  direction: 'outflow' | 'inflow' | 'both'
  /** Average money per month moving to/from this account (dominant side). */
  monthlyFlow: number
  occurrences: number
  monthsPresent: number
  confidence: ExternalConfidence
  /** Plain-English explanation of why we think this account exists. */
  reason: string
}

interface Group {
  key: string
  name: string
  debitTotal: number
  creditTotal: number
  debitCount: number
  creditCount: number
  months: Set<string>
  savings: number
  investment: number
  credit: number
}

export function detectExternalAccounts(
  txns: NormalizedTxn[],
  ctx: { accountHolderName?: string | null; months: number }
): InferredAccount[] {
  const periodMonths = Math.max(1, ctx.months)
  const holder = ctx.accountHolderName ?? null

  const groups = new Map<string, Group>()
  for (const t of txns) {
    const key = normalizeCounterparty(t)
    const g =
      groups.get(key) ??
      {
        key,
        name: displayName(key),
        debitTotal: 0,
        creditTotal: 0,
        debitCount: 0,
        creditCount: 0,
        months: new Set<string>(),
        savings: 0,
        investment: 0,
        credit: 0,
      }
    g.months.add(monthKey(toDate(t.date)))
    if (t.direction === 'debit') {
      g.debitTotal += t.amount
      g.debitCount += 1
    } else {
      g.creditTotal += t.amount
      g.creditCount += 1
    }
    const cat = classify(t)
    if (cat === 'savings_transfer') g.savings += 1
    else if (cat === 'investment') g.investment += 1
    else if (cat === 'loan_repayment') g.credit += 1
    groups.set(key, g)
  }

  const accounts: InferredAccount[] = []
  const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

  for (const g of groups.values()) {
    const occ = g.debitCount + g.creditCount
    const recurring = g.months.size >= 2 || occ >= 2
    const flowTotal = Math.max(g.debitTotal, g.creditTotal)
    const monthlyFlow = round2(flowTotal / periodMonths)
    const nameScore = holder ? nameMatchScore(holder, g.name) : 0
    const isOwnName = nameScore >= 0.6 && looksLikePerson(g.key)
    // A mirror flow — money both leaving to and returning from the same
    // person-like counterparty — is a classic own-account shuffle.
    const isMirror =
      g.debitCount > 0 &&
      g.creditCount > 0 &&
      Math.min(g.debitTotal, g.creditTotal) / Math.max(g.debitTotal, g.creditTotal) >= 0.3 &&
      looksLikePerson(g.key)

    let type: ExternalAccountType | null = null
    let confidence: ExternalConfidence = 'high'
    let label = ''
    if (g.savings > 0) {
      type = 'savings'
      label = 'Savings account or pot'
    } else if (g.investment > 0) {
      type = 'investment'
      label = 'Investment account'
    } else if (g.credit > 0) {
      type = 'credit'
      label = 'Credit card or loan'
    } else if (isOwnName) {
      type = 'own_current'
      confidence = nameScore >= 0.9 ? 'high' : 'medium'
      label = 'Another account in your name'
    } else if (isMirror) {
      type = 'own_current'
      confidence = 'medium'
      label = 'Another account in your name'
    }
    if (!type) continue

    // Guard against noise: own-account inferences need repetition (a one-off
    // payment to a namesake isn't evidence of an own account); keyword-classified
    // savings/credit need either repetition or a material amount.
    if (type === 'own_current' && !recurring) continue
    if (!recurring && flowTotal < 100) continue

    const direction: InferredAccount['direction'] =
      g.debitTotal > g.creditTotal * 2 ? 'outflow' : g.creditTotal > g.debitTotal * 2 ? 'inflow' : 'both'

    const reason =
      type === 'savings'
        ? `${gbp(monthlyFlow)}/mo moves to a savings pot or ISA${g.name ? ` (${g.name})` : ''}.`
        : type === 'investment'
          ? `${gbp(monthlyFlow)}/mo moves to an investment account${g.name ? ` (${g.name})` : ''}.`
          : type === 'credit'
            ? `Regular repayments to ${g.name || 'a credit card or loan'} — a balance held on another account.`
            : direction === 'inflow'
              ? `Money regularly arrives from ${g.name}, which appears to be your own account.`
              : `${gbp(monthlyFlow)}/mo moves to ${g.name}, which appears to be your own account.`

    accounts.push({
      type,
      label,
      provider: g.name || null,
      direction,
      monthlyFlow,
      occurrences: occ,
      monthsPresent: g.months.size,
      confidence,
      reason,
    })
  }

  const rank = { high: 0, medium: 1 } as const
  return accounts
    .sort((a, b) => rank[a.confidence] - rank[b.confidence] || b.monthlyFlow - a.monthlyFlow)
    .slice(0, 6)
}
