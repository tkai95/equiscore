import type { TransactionCategory } from '@prisma/client'
import type { NormalizedTxn, ExpenseProfile, ExpenseCategory } from './types'
import { classify } from './classify'
import { normalizeCounterparty, looksLikePerson } from './normalize'
import { round2 } from './util'

const COUNCIL_TAX = /\bcouncil tax\b/i
const MOBILE_INTERNET =
  /\b(mobile|broadband|phone bill|internet|vodafone|o2|three|ee|bt |sky|virgin media|talktalk|giffgaff|plusnet|now broadband|hyperoptic|lebara|smarty)\b/i
const REMITTANCE = /\b(wise|transferwise|remitly|western union|moneygram|worldremit|xoom|sendwave|azimo)\b/i

interface CatDef {
  key: string
  label: string
  essential: boolean
}

/** Map a base TransactionCategory (+ description refinement) to a customer-facing bucket. */
export function resolveCategory(t: NormalizedTxn, base: TransactionCategory): CatDef {
  const desc = t.description ?? ''
  switch (base) {
    case 'rent_payment':
      return { key: 'rent', label: 'Rent / housing', essential: true }
    case 'loan_repayment':
      return { key: 'loan_credit', label: 'Loan / credit repayments', essential: true }
    case 'utilities':
      if (COUNCIL_TAX.test(desc)) return { key: 'council_tax', label: 'Council tax', essential: true }
      if (MOBILE_INTERNET.test(desc)) return { key: 'mobile_internet', label: 'Mobile / internet', essential: true }
      return { key: 'utilities', label: 'Utilities', essential: true }
    case 'groceries':
      return { key: 'groceries', label: 'Groceries', essential: true }
    case 'transport':
      return { key: 'transport', label: 'Transport', essential: true }
    case 'healthcare':
      return { key: 'healthcare', label: 'Healthcare', essential: true }
    case 'education':
      return { key: 'education', label: 'Education', essential: true }
    case 'entertainment':
      return { key: 'subscriptions', label: 'Subscriptions & entertainment', essential: false }
    case 'cash_withdrawal':
      return { key: 'cash', label: 'Cash withdrawals', essential: false }
    default: {
      // Recurring/large transfers to a named individual, or remittance services,
      // are tentatively family support — flagged unconfirmed until the user says.
      if (REMITTANCE.test(desc) || looksLikePerson(normalizeCounterparty(t))) {
        return { key: 'family_support', label: 'Family support / remittances', essential: true }
      }
      return { key: 'discretionary', label: 'Discretionary spending', essential: false }
    }
  }
}

const UNCONFIRMED_KEYS = new Set(['family_support'])

export function analyzeExpenses(
  txns: NormalizedTxn[],
  resolvedIds: Set<string>,
  months: number
): ExpenseProfile {
  const debits = txns.filter((t) => t.direction === 'debit')

  const buckets = new Map<string, { def: CatDef; total: number }>()
  let totalSpend = 0

  for (const t of debits) {
    const base = classify(t)
    // Savings/investment outflows are not spending — exclude, like the analytics summary does.
    if (base === 'savings_transfer' || base === 'investment') continue
    const def = resolveCategory(t, base)
    const b = buckets.get(def.key) ?? { def, total: 0 }
    b.total += t.amount
    buckets.set(def.key, b)
    totalSpend += t.amount
  }

  const monthsSafe = Math.max(1, months)
  const categories: ExpenseCategory[] = [...buckets.values()]
    .map(({ def, total }) => ({
      key: def.key,
      label: def.label,
      total: round2(total),
      monthlyAverage: round2(total / monthsSafe),
      share: totalSpend > 0 ? round2(total / totalSpend) : 0,
      essential: def.essential,
      unconfirmed: UNCONFIRMED_KEYS.has(def.key) && !resolvedIds.has(`expense:${def.key}`),
    }))
    .sort((a, b) => b.total - a.total)

  const essentialTotal = categories.filter((c) => c.essential).reduce((s, c) => s + c.total, 0)
  const essentialShare = totalSpend > 0 ? round2(essentialTotal / totalSpend) : 0
  const hasCreditOrLoanRepayments = (buckets.get('loan_credit')?.total ?? 0) > 0

  return {
    averageMonthlySpend: round2(totalSpend / monthsSafe),
    essentialShare,
    hasCreditOrLoanRepayments,
    categories,
    narrative: buildNarrative(round2(totalSpend / monthsSafe), essentialShare, categories),
  }
}

function buildNarrative(monthlySpend: number, essentialShare: number, categories: ExpenseCategory[]): string {
  if (monthlySpend === 0) return 'No spending was detected in the statements provided.'
  const rent = categories.find((c) => c.key === 'rent')
  const parts = [
    `Spending averages £${monthlySpend.toLocaleString('en-GB')} per month, of which around ${Math.round(essentialShare * 100)}% is essential.`,
  ]
  if (rent) {
    parts.push(`Rent of about £${rent.monthlyAverage.toLocaleString('en-GB')} appears to be paid regularly.`)
  }
  return parts.join(' ')
}
