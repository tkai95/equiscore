import type { TransactionCategory } from '@prisma/client'
import type { NormalizedTxn, Commitment, PaymentBehaviour } from './types'
import type { RecurringStream } from './recurrence'
import { classify } from './classify'
import { normalizeCounterparty, looksLikePerson } from './normalize'
import { toDate, monthKey, round2, clamp } from './util'

/** Base categories that represent a genuine fixed commitment (vs. variable spend). */
const COMMITMENT_CATEGORIES = new Set<TransactionCategory>([
  'rent_payment',
  'loan_repayment',
  'utilities',
  'entertainment', // subscriptions
  'healthcare',
  'education',
])

const RETURN_PATTERN =
  /\b(returned|unpaid|bounced|recalled|reversal|reversed|refer to payer|represented|dd rejected)\b/i

export function analyzeCommitments(
  debitStreams: RecurringStream[],
  txns: NormalizedTxn[],
  answers?: Record<string, string>
): { commitments: Commitment[]; paymentBehaviour: PaymentBehaviour } {
  const returns = txns.filter((t) => RETURN_PATTERN.test(t.description ?? ''))

  // When the user has told us their person-to-person payments are actually rent
  // (or a loan), honour it — a private-landlord rent then counts toward rental
  // reliability and affordability, not just "family support".
  const personTransferOverride: TransactionCategory | null =
    answers?.['expense:family_support'] === 'Rent'
      ? 'rent_payment'
      : answers?.['expense:family_support'] === 'Repaying a loan'
        ? 'loan_repayment'
        : null

  const commitments: Commitment[] = []
  for (const s of debitStreams) {
    let cat = classify(s.txns[Math.floor(s.txns.length / 2)]!)
    if (cat === 'other' && looksLikePerson(s.key) && personTransferOverride) {
      cat = personTransferOverride
    }

    // Behavioural fallback: an unclassified stream that leaves on a regular
    // rhythm for a stable amount *is* a commitment — a gym membership, a
    // private landlord, money sent to family. Category rules miss these.
    const behaviouralCommitment =
      cat === 'other' && s.amountCoV <= 0.15 && s.cadence !== 'irregular'
    const isFamilySupport = cat === 'other' && looksLikePerson(s.key)
    if (!COMMITMENT_CATEGORIES.has(cat) && !behaviouralCommitment && !isFamilySupport) continue

    // A return names its original payee, so match on containment rather than
    // exact key equality ("PUREGYM DD RETURNED UNPAID" vs "puregym").
    const returnedCount = returns.filter((r) => {
      const rKey = normalizeCounterparty(r)
      const desc = (r.description ?? '').toLowerCase()
      return rKey === s.key || rKey.includes(s.key) || desc.includes(s.key)
    }).length

    commitments.push({
      name: s.name,
      key: s.key,
      category: cat,
      amount: round2(s.amount),
      cadence: s.cadence,
      typicalDayOfMonth: s.typicalDayOfMonth,
      dayVariance: s.dayVariance,
      consistency: s.consistency,
      occurrences: s.occurrences,
      monthsCovered: s.monthsCovered,
      missedCount: s.missedCount,
      returnedCount,
    })
  }

  commitments.sort((a, b) => b.amount - a.amount)

  // ── Payment behaviour ──────────────────────────────────────────────────────
  const expected = commitments.reduce((sum, c) => sum + c.occurrences + c.missedCount, 0)
  const missedPayments = commitments.reduce((sum, c) => sum + c.missedCount, 0)
  const returnedPayments = returns.length
  const onTimeRatio =
    expected > 0 ? round2(clamp((expected - missedPayments - returnedPayments) / expected, 0, 1)) : 1

  const rent = commitments.find((c) => c.category === 'rent_payment')
  const rentPaidConsistently = Boolean(
    rent && rent.missedCount === 0 && (rent.consistency === 'very_consistent' || rent.consistency === 'consistent')
  )

  const overdraftMonths = computeOverdraftMonths(txns)

  return {
    commitments,
    paymentBehaviour: {
      onTimeRatio,
      returnedPayments,
      missedPayments,
      overdraftMonths,
      rentPaidConsistently,
      narrative: buildNarrative(onTimeRatio, returnedPayments, missedPayments, rentPaidConsistently),
    },
  }
}

/** Count completed months whose end-of-month balance is negative. Null if no balance data. */
function computeOverdraftMonths(txns: NormalizedTxn[]): number | null {
  const withBalance = txns.filter((t) => typeof t.balance === 'number')
  if (withBalance.length === 0) return null

  const lastByMonth = new Map<string, { time: number; balance: number }>()
  for (const t of withBalance) {
    const d = toDate(t.date)
    const k = monthKey(d)
    const prev = lastByMonth.get(k)
    if (!prev || d.getTime() >= prev.time) lastByMonth.set(k, { time: d.getTime(), balance: t.balance as number })
  }
  return [...lastByMonth.values()].filter((m) => m.balance < 0).length
}

function buildNarrative(
  onTimeRatio: number,
  returned: number,
  missed: number,
  rentConsistent: boolean
): string {
  const parts: string[] = []
  if (onTimeRatio >= 0.98) parts.push('Bills are paid on time.')
  else if (onTimeRatio >= 0.9) parts.push('Bills are paid on time, with occasional exceptions.')
  else parts.push('Bill payments are inconsistent.')

  if (rentConsistent) parts.push('Rent has never been missed.')
  if (returned === 0 && missed === 0) parts.push('No returned direct debits or missed payments were found.')
  else parts.push(`${returned} returned payment(s) and ${missed} missed payment(s) across the period.`)

  return parts.join(' ')
}
