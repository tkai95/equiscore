import type { NormalizedTxn, RiskAssessment, UnusualTransaction, RiskLevel, StatementIntegrity } from './types'
import type { RecurringStream } from './recurrence'
import { classify } from './classify'
import { normalizeCounterparty, displayName, looksLikePerson } from './normalize'
import { toDate, median, clamp } from './util'

/**
 * Deterministic typology screen. This is exculpatory by design: known
 * money-mule / laundering patterns are checked so their ABSENCE can be
 * evidenced, and genuinely unusual items are surfaced for the customer to
 * explain — never silently scored against them.
 */

const GAMBLING = /\b(bet365|paddy power|william hill|ladbrokes|betfair|sky ?bet|coral|betfred|888|pokerstars|casino|betway|unibet|gambling)\b/i
const CRYPTO = /\b(coinbase|binance|kraken|bitstamp|gemini|luno|crypto|bitcoin|blockchain)\b/i
const INTERNATIONAL = /\b(wise|transferwise|remitly|western union|moneygram|worldremit|xoom|swift|international)\b/i
const CASH_DEPOSIT = /\b(cash deposit|counter credit|paying in|cash in)\b/i

interface Detected {
  typologies: string[]
  cleared: string[]
  unusual: UnusualTransaction[]
  score: number
}

export function detectRisk(
  txns: NormalizedTxn[],
  recurringKeys: Set<string>,
  overdraftMonths: number | null,
  resolvedIds: Set<string>,
  integrity: StatementIntegrity
): RiskAssessment & { unusual: UnusualTransaction[] } {
  const d = run(txns, recurringKeys, overdraftMonths, resolvedIds, integrity)
  const score = clamp(Math.round(d.score), 0, 100)
  const level = deriveLevel(score)
  return {
    level,
    score,
    typologies: d.typologies,
    clearedTypologies: d.cleared,
    unusual: d.unusual,
  }
}

function run(
  txns: NormalizedTxn[],
  recurringKeys: Set<string>,
  overdraftMonths: number | null,
  resolvedIds: Set<string>,
  integrity: StatementIntegrity
): Detected {
  const typologies: string[] = []
  const cleared: string[] = []
  const unusual: UnusualTransaction[] = []
  let score = 0

  const debits = txns.filter((t) => t.direction === 'debit')
  const medDebit = median(debits.map((t) => t.amount)) || 0
  const largeThreshold = Math.max(1000, medDebit * 6)

  // Counterparty frequency, for "isolated" judgements.
  const partyCount = new Map<string, number>()
  for (const t of txns) {
    const k = normalizeCounterparty(t)
    partyCount.set(k, (partyCount.get(k) ?? 0) + 1)
  }

  // ── Serious typologies (checked so absence can be stated) ──────────────────
  if (hasRapidPassThrough(txns)) { typologies.push('Rapid pass-through'); score += 30 }
  else cleared.push('Rapid pass-through')

  if (hasStructuring(txns)) { typologies.push('Structuring'); score += 30 }
  else cleared.push('Structuring')

  if (hasNewPayeeChurn(debits, partyCount)) { typologies.push('New-payee churn'); score += 25 }
  else cleared.push('New-payee churn')

  // ── Softer signals ─────────────────────────────────────────────────────────
  if (debits.some((t) => GAMBLING.test(t.description ?? ''))) { typologies.push('Gambling activity'); score += 12 }
  else cleared.push('Gambling activity')

  if (txns.some((t) => CRYPTO.test(t.description ?? ''))) { typologies.push('Crypto-related payments'); score += 8 }

  if (txns.filter((t) => t.direction === 'credit' && CASH_DEPOSIT.test(t.description ?? '')).length >= 4) {
    typologies.push('Repeated cash deposits'); score += 12
  }

  if (overdraftMonths !== null && overdraftMonths >= 3) { typologies.push('Frequent negative balance'); score += 10 }

  // Document integrity. The one signal that legitimately counts against the
  // customer — it concerns the statement itself, not their financial behaviour.
  if (integrity.hasBalances) {
    if (integrity.continuous) cleared.push('Statement ledger reconciles')
    else { typologies.push('Statement ledger does not reconcile'); score += 35 }
  }

  // ── Unusual individual transactions (surfaced, not judged) ─────────────────
  txns.forEach((t, i) => {
    const key = normalizeCounterparty(t)
    const name = displayName(key)
    const isRecurring = recurringKeys.has(key)
    const isolated = (partyCount.get(key) ?? 0) === 1
    const isIntl = INTERNATIONAL.test(t.description ?? '')
    const base = classify(t)
    const isTransfer = base === 'other' || isIntl

    const large = t.amount >= largeThreshold && !isRecurring && isTransfer
    if (!large && !(isIntl && !isRecurring && t.amount >= 300)) return

    const id = `txn:${t.date}:${Math.round(t.amount)}:${i}`
    const namedRecipient = looksLikePerson(key)
    unusual.push({
      id,
      date: t.date,
      amount: t.amount,
      direction: t.direction,
      counterparty: name,
      reason: large
        ? `Large ${t.direction === 'debit' ? 'payment' : 'receipt'} — well above the customer's typical activity`
        : 'International transfer that may be to the customer\'s own account',
      typology: isIntl ? 'International transfer' : null,
      context: {
        isolated,
        namedRecipient,
        normalBeforeAfter: !typologies.includes('Rapid pass-through') && !typologies.includes('Structuring'),
        matchesTypology: false,
      },
      status: resolvedIds.has(id) ? 'resolved' : 'pending_context',
    })
    // A large one-off is context to explain, not a heavy penalty — nudge only.
    score += 4
  })

  return { typologies, cleared, unusual, score }
}

function hasRapidPassThrough(txns: NormalizedTxn[]): boolean {
  const credits = txns.filter((t) => t.direction === 'credit')
  const debits = txns.filter((t) => t.direction === 'debit')
  let hits = 0
  for (const c of credits) {
    if (c.amount < 500) continue
    const ct = toDate(c.date).getTime()
    const match = debits.find((d) => {
      const dt = toDate(d.date).getTime()
      const days = (dt - ct) / (1000 * 60 * 60 * 24)
      return days >= 0 && days <= 3 && Math.abs(d.amount - c.amount) / c.amount <= 0.1
    })
    if (match) hits++
  }
  return hits >= 2
}

function hasStructuring(txns: NormalizedTxn[]): boolean {
  const nearThreshold = txns.filter(
    (t) => (t.amount >= 900 && t.amount < 1000) || (t.amount >= 9000 && t.amount < 10000)
  )
  return nearThreshold.length >= 3
}

function hasNewPayeeChurn(debits: NormalizedTxn[], partyCount: Map<string, number>): boolean {
  const oneOffRound = debits.filter(
    (t) => (partyCount.get(normalizeCounterparty(t)) ?? 0) === 1 && t.amount >= 100 && t.amount % 50 === 0
  )
  return oneOffRound.length >= 6
}

function deriveLevel(score: number): RiskLevel {
  if (score >= 60) return 'high'
  if (score >= 30) return 'moderate'
  if (score >= 12) return 'low_moderate'
  return 'low'
}
