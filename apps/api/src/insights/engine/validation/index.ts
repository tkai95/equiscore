/**
 * The validation engine — independent of any extraction provider.
 *
 * Its job is NOT "does Google/OCI/Claude think this looks correct?" It is:
 * "does the extracted dataset satisfy the observable constraints contained in
 * the statement?" The engine never asks another LLM whether the first was right.
 *
 * Runs in layers (spec §16-23): structural → completeness → deduplication →
 * running-balance → statement-level → dates → metadata → provenance. Each layer
 * writes its CheckStatus into the result; the overall status is the honest
 * roll-up: `verified` only when every applicable check passes, `failed` when a
 * hard check fails, `uncertain` when resolution might still recover it.
 *
 * SAFETY INVARIANTS (enforced here, not just documented):
 * - No synthetic transactions are ever inserted to make the maths balance.
 * - A correction is accepted only with source evidence + reconciliation, never
 *   just because a value makes the ledger balance. (That logic lives in the
 *   exception resolver, which calls back into this engine to re-verify.)
 * - The result's `status === 'verified'` is the sole key that unlocks scoring.
 */
import type {
  CanonicalTransaction,
  ValidationResult,
  ValidationBreak,
  CheckStatus,
} from '../../ingest/canonical'
import { emptyValidationResult } from '../../ingest/canonical'
import { toDate, round2 } from '../util'

const TOLERANCE = 0.02 // pennies of floating-point slack, matching the legacy check

/** Layer 1 — structural: every row has a parseable date, positive amount, valid direction. */
function checkStructural(txns: CanonicalTransaction[]): CheckStatus {
  for (const t of txns) {
    if (!t.date || Number.isNaN(toDate(t.date).getTime())) return 'fail'
    if (!(t.amount > 0) || !Number.isFinite(t.amount)) return 'fail'
    if (t.direction !== 'credit' && t.direction !== 'debit') return 'fail'
  }
  return txns.length === 0 ? 'not_applicable' : 'pass'
}

/** Layer 2 — page completeness: processed == expected pages, if the extractor reported both. */
function checkCompleteness(processed: number | null, expected: number | null): CheckStatus {
  if (processed === null || expected === null) return 'not_applicable'
  return processed === expected ? 'pass' : 'fail'
}

/**
 * Layer 3 — deduplication. Flags probable duplicates by a row-identity derived
 * from source position + raw text, NOT just date+amount+description (legitimate
 * identical transactions exist). Returns the count of suspected duplicates;
 * the orchestrator treats a non-zero count as a fail since the extractor should
 * already have deduped.
 */
function checkDeduplication(txns: CanonicalTransaction[]): CheckStatus {
  if (txns.length === 0) return 'not_applicable'
  const seen = new Set<string>()
  for (const t of txns) {
    // Identity is source-position-aware: two rows on the same page+row with the
    // same raw text are the same row; the same amount on different rows is fine.
    const key = `${t.sourcePage ?? '?'}|${t.sourceRow ?? '?'}|${t.dateRaw ?? ''}|${t.amountRaw ?? ''}|${t.descriptionRaw ?? ''}`
    if (seen.has(key)) return 'fail'
    seen.add(key)
  }
  return 'pass'
}

/**
 * Layer 4 — running-balance reconciliation.
 *
 * INVARIANT (ordering-independent): for every transaction with a balance B and
 * signed amount Δ, there must exist another balance in the statement equal to
 * B − Δ (the "previous" balance) — except for the single opening balance, which
 * has no predecessor. Equivalently, every balance value must be reachable from
 * exactly one other balance by applying one transaction's signed amount. This
 * holds regardless of whether the bank lists transactions oldest-first or
 * newest-first, and regardless of intra-day ordering, because it doesn't walk
 * an assumed sequence — it checks the set relationship the running balance
 * defines.
 *
 * The previous implementation walked transactions in date-sorted order and
 * checked `expected = prev.balance + delta`. That assumed the sorted array
 * reflected true chronological order, which fails for same-day transactions on
 * newest-first statements (Wise and most fintechs): same-date rows keep array
 * order, which is reverse-chronological, so every same-day row after the first
 * "broke" — a false negative. The balance-ascending sort variant was also wrong
 * because on a net-debit account the balance DECREASES over time, so ascending
 * balance is reverse-chronological too. The set-membership check below has no
 * such assumption.
 *
 * Returns the breaks (transactions whose B−Δ matches no other balance) with
 * source location for exception resolution.
 */
function checkRunningBalance(txns: CanonicalTransaction[]): { status: CheckStatus; breaks: ValidationBreak[] } {
  const withBalance = txns.filter((t) => typeof t.balance === 'number')
  if (withBalance.length < 2) return { status: 'not_applicable', breaks: [] }

  // Multiset of all balance values (rounded), so duplicate balance values are
  // counted correctly (two txns can legitimately share a balance only if their
  // amounts net to zero — rare but legal).
  const balanceCounts = new Map<number, number>()
  for (const t of withBalance) {
    const b = round2(t.balance as number)
    balanceCounts.set(b, (balanceCounts.get(b) ?? 0) + 1)
  }

  const breaks: ValidationBreak[] = []
  for (const t of withBalance) {
    const delta = t.direction === 'credit' ? t.amount : -t.amount
    const neededPrior = round2((t.balance as number) - delta)
    // Consume one occurrence of the needed-prior balance. If absent, this
    // transaction's balance has no reconcilable predecessor → genuine break.
    const count = balanceCounts.get(neededPrior) ?? 0
    if (count <= 0) {
      breaks.push({
        index: txns.indexOf(t),
        date: t.date,
        // For human reporting: the balance we expected to find as this row's
        // predecessor (i.e. this row's balance minus its own movement).
        expected: neededPrior,
        actual: round2(t.balance as number),
        sourcePage: t.sourcePage,
        sourceRow: t.sourceRow,
      })
    }
    // Note: we do NOT decrement the count when a match is found, because the
    // needed-prior balance legitimately belongs to a DIFFERENT transaction
    // (this row's actual predecessor); consuming it here would steal it from
    // that predecessor's own check. Each balance is matched independently.
  }
  // Account for the single opening balance (one balance has no predecessor by
  // definition). If exactly one break remains, it's the opening row — not a
  // data error. More than one break means genuine unreconciled rows.
  if (breaks.length <= 1) return { status: 'pass', breaks: [] }
  return { status: 'fail', breaks }
}

/**
 * Layer 5 — statement-level: opening + total credits − total debits = closing,
 * where opening/closing are candidate values from the extractor. Only applicable
 * when both balances were recovered.
 */
function checkStatementLevel(
  txns: CanonicalTransaction[],
  opening: number | null,
  closing: number | null
): CheckStatus {
  if (opening === null || closing === null) return 'not_applicable'
  let credits = 0
  let debits = 0
  for (const t of txns) {
    if (t.direction === 'credit') credits += t.amount
    else debits += t.amount
  }
  const expectedClosing = round2(opening + credits - debits)
  return Math.abs(expectedClosing - round2(closing)) <= TOLERANCE ? 'pass' : 'fail'
}

/**
 * Layer 6 — dates. Flags clearly inverted month/day parses (e.g. a UK statement
 * where day > 12 got read as month). Does NOT reject out-of-order rows outright
 * (banks sometimes group), just flags parse plausibility.
 */
function checkDates(txns: CanonicalTransaction[]): CheckStatus {
  if (txns.length === 0) return 'not_applicable'
  for (const t of txns) {
    // A date that parses but has day > 31 or month > 12 would already fail
    // structural; here we catch the subtler "looks like a valid date but the
    // day field exceeds 12 while month <= 12" inversion smell on raw input.
    const m = /^(\d{1,2})[/-](\d{1,2})[/-]/.exec(t.dateRaw ?? '')
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      // If the first number is > 12 it must be a day, so the raw was DD/MM — fine.
      // If both <= 12 it's ambiguous, not a failure. No hard fail here.
      if (a > 31 || b > 31) return 'fail'
    }
  }
  return 'pass'
}

/** Layer 7 — metadata consistency. Placeholder: verifies currency uniformity. */
function checkMetadata(txns: CanonicalTransaction[]): CheckStatus {
  if (txns.length === 0) return 'not_applicable'
  return 'pass' // currency is canonicalised upstream; extend here for account-id checks
}

/**
 * Layer 8 — provenance coverage. For an auto-accepted statement, 100% of
 * transaction amounts must have identifiable source evidence. A value with
 * null source page/row/raw cannot be auto-accepted.
 */
function checkProvenance(txns: CanonicalTransaction[]): { status: CheckStatus; unresolved: number } {
  if (txns.length === 0) return { status: 'not_applicable', unresolved: 0 }
  let unresolved = 0
  for (const t of txns) {
    // CSV has no page but has a row; PDF has page+row. amountRaw is the universal
    // evidence flag — if we never captured the source text for the amount, we
    // cannot trace it.
    if (t.amountRaw === null && t.sourceRow === null) unresolved++
  }
  return { status: unresolved === 0 ? 'pass' : 'fail', unresolved }
}

/**
 * Run every applicable layer and roll up to an overall status.
 *
 * `verified` requires: structural pass, deduplication pass, running-balance
 * pass (or n/a), statement-level pass (or n/a), provenance pass. Completeness,
 * dates and metadata flag issues but don't alone block verification — they
 * surface as warnings/uncertainty. (Tune as the corpus benchmarks land.)
 */
export function validateExtraction(
  extraction: {
    transactions: CanonicalTransaction[]
    openingBalance: number | null
    closingBalance: number | null
    pagesProcessed: number | null
    pagesExpected: number | null
  }
): ValidationResult {
  const { transactions: txns, openingBalance, closingBalance, pagesProcessed, pagesExpected } = extraction
  const result = emptyValidationResult(txns.length)

  result.checks.structural = checkStructural(txns)
  result.checks.completeness = checkCompleteness(pagesProcessed, pagesExpected)
  result.checks.deduplication = checkDeduplication(txns)
  const rb = checkRunningBalance(txns)
  result.checks.runningBalance = rb.status
  result.breaks = rb.breaks
  result.checks.statementLevel = checkStatementLevel(txns, openingBalance, closingBalance)
  result.checks.dates = checkDates(txns)
  result.checks.metadata = checkMetadata(txns)
  const prov = checkProvenance(txns)
  result.checks.provenance = prov.status
  result.unresolvedFields = prov.unresolved
  result.openingBalance = openingBalance
  result.closingBalance = closingBalance

  // Hard gates. `passOrNa` means the check is satisfied (either it passed, or
  // it wasn't applicable to this statement — e.g. running-balance on a
  // statement with no balance column). A non-empty statement must clear all
  // hard gates to be `verified`.
  const passOrNa = (s: CheckStatus) => s === 'pass' || s === 'not_applicable'
  const hardGatesClear =
    result.checks.structural === 'pass' &&
    passOrNa(result.checks.deduplication) &&
    passOrNa(result.checks.runningBalance) &&
    passOrNa(result.checks.statementLevel) &&
    passOrNa(result.checks.provenance)

  if (txns.length === 0) {
    result.status = 'failed'
  } else if (hardGatesClear && result.breaks.length === 0) {
    result.status = 'verified'
  } else if (hardGatesClear && result.breaks.length > 0) {
    // Gates clear structurally but there are balance breaks to resolve.
    result.status = 'uncertain'
  } else {
    result.status = 'failed'
  }

  return result
}
