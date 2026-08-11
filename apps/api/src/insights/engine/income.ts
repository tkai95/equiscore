import type { TransactionCategory } from '@prisma/client'
import type { NormalizedTxn, IncomeProfile, IncomeSource, IncomeCharacter, Consistency } from './types'
import type { RecurringStream } from './recurrence'
import { classify } from './classify'
import { normalizeCounterparty, displayName, looksLikePerson } from './normalize'
import { grossUpFromNet } from './tax'
import { toDate, monthKey, mean, coefficientOfVariation, round2 } from './util'

const INTERNATIONAL = /\b(wise|transferwise|remitly|western union|moneygram|worldremit|xoom|revolut international)\b/i
const CASH_DEPOSIT = /\b(cash deposit|deposit at|paying in|counter credit|cash in)\b/i
/** A returned/reversed debit lands as a credit — it is not income. */
const RETURN_PATTERN =
  /\b(returned|unpaid|bounced|recalled|reversal|reversed|refer to payer|represented|dd rejected)\b/i
/** Student maintenance loans/grants land as credits and are genuine income. */
const STUDENT_FINANCE = /\b(student loans? company|slc|student finance|maintenance loan|sfe england|saas)\b/i

/** Categories that represent genuine money coming in (not internal shuffling). */
const INCOME_CATEGORIES = new Set<TransactionCategory>([
  'salary',
  'gig_income',
  'government_benefit',
])

/**
 * Distinct months a source must appear in before an otherwise-unrecognised
 * inflow is treated as regular income rather than a one-off personal transfer.
 * Below this it's most likely money from a friend/family, a repayment, or a
 * refund — real cash, but not income you could budget rent against.
 */
const REGULAR_INCOME_MONTHS = 3

function isIncomeCredit(t: NormalizedTxn): boolean {
  return t.direction === 'credit' && !RETURN_PATTERN.test(t.description ?? '')
}

/**
 * Decide, per counterparty, whether their inflows count as income. The rule is
 * deliberately conservative: only recognised income categories, student
 * finance, a detected salary, or a source that recurs across several months
 * count. A single large credit from "J Carter" is a transfer, not a salary.
 *
 * Returns the set of income-eligible counterparty keys, so the *same* decision
 * drives both the income figures here and the monthly cashflow series in
 * build-profile — they can never disagree.
 */
export function incomeEligibleKeys(txns: NormalizedTxn[], creditStreams: RecurringStream[]): Set<string> {
  const salaryStream = detectSalaryStream(creditStreams)
  const byParty = new Map<string, { cat: TransactionCategory; months: Set<string>; studentFinance: boolean }>()
  for (const t of txns) {
    if (!isIncomeCredit(t)) continue
    const key = normalizeCounterparty(t)
    const cat = salaryStream && key === salaryStream.key ? 'salary' : classify(t)
    const e = byParty.get(key) ?? { cat, months: new Set<string>(), studentFinance: false }
    e.months.add(monthKey(toDate(t.date)))
    if (INCOME_CATEGORIES.has(cat)) e.cat = cat
    if (STUDENT_FINANCE.test(t.description ?? '')) e.studentFinance = true
    byParty.set(key, e)
  }

  const keys = new Set<string>()
  for (const [key, e] of byParty) {
    if (e.cat === 'savings_transfer' || e.cat === 'investment') continue
    const isSalary = salaryStream?.key === key
    const recognisedIncome = INCOME_CATEGORIES.has(e.cat)
    const regular = e.months.size >= REGULAR_INCOME_MONTHS
    if (isSalary || recognisedIncome || e.studentFinance || regular) keys.add(key)
  }
  return keys
}

export function analyzeIncome(
  txns: NormalizedTxn[],
  creditStreams: RecurringStream[],
  resolvedIds: Set<string>,
  incomeKeys: Set<string>
): IncomeProfile {
  // All non-reversal credits, split into genuine income vs personal transfers.
  const credits = txns.filter(isIncomeCredit)
  const incomeCredits = credits.filter((t) => incomeKeys.has(normalizeCounterparty(t)))
  const transferCredits = credits.filter((t) => !incomeKeys.has(normalizeCounterparty(t)))

  // Monthly income totals — genuine income only.
  const monthly = new Map<string, number>()
  for (const t of incomeCredits) {
    const cat = classify(t)
    if (cat === 'savings_transfer' || cat === 'investment') continue
    const k = monthKey(toDate(t.date))
    monthly.set(k, (monthly.get(k) ?? 0) + t.amount)
  }
  const monthlyValues = [...monthly.values()]
  const averageMonthlyIncome = round2(mean(monthlyValues))
  const volatility = round2(coefficientOfVariation(monthlyValues))
  const consistency = rateIncomeConsistency(volatility, monthlyValues.length)

  // How much comes in as personal transfers (not counted as income), per month.
  const periodMonths = new Set(credits.map((t) => monthKey(toDate(t.date)))).size || 1
  const transfersTotal = transferCredits.reduce((s, t) => s + t.amount, 0)
  const personalTransfersMonthly = round2(transfersTotal / periodMonths)

  // Salary detection is *behavioural*, not keyword-based: a monthly credit
  // stream with a stable amount from a single source is a salary even when the
  // description is just "BACS CREDIT BRIGHT CARE LTD". Keywords only break ties.
  const salaryStream = detectSalaryStream(creditStreams)
  const recurringSalaryDetected = Boolean(salaryStream)

  // Estimate a gross annual salary by grossing up the net salary received. Only
  // meaningful above the personal allowance (£12,570) — below it there is no tax
  // or NI to reverse, so gross would equal net. That floor also guards against a
  // behaviourally-detected "salary" that is really regular support or a pension:
  // if grossing-up wouldn't change the figure, we don't present one.
  const PERSONAL_ALLOWANCE = 12570
  let salaryMonthlyNet: number | null = null
  let estimatedGrossAnnualSalary: number | null = null
  if (salaryStream) {
    // Cadence-aware annualisation. The per-payment amount must be multiplied by
    // the number of payments per year — NOT treated as a monthly figure. Using
    // ×12 for a fortnightly salary under-counts by ~46% (12/26). Weekly → 52,
    // fortnightly → 26, four-weekly → 13, monthly/else → 12.
    const paymentsPerYear =
      salaryStream.cadence === 'weekly' ? 52
      : salaryStream.cadence === 'fortnightly' ? 26
      : salaryStream.cadence === 'four_weekly' ? 13
      : 12
    const netAnnualSalary = salaryStream.amount * paymentsPerYear
    if (netAnnualSalary > PERSONAL_ALLOWANCE) {
      salaryMonthlyNet = round2((salaryStream.amount * paymentsPerYear) / 12)
      estimatedGrossAnnualSalary = grossUpFromNet(netAnnualSalary)
    }
  }

  /** The stream we identified as salary wins over whatever the keyword rules said. */
  const effectiveCategory = (t: NormalizedTxn): TransactionCategory =>
    salaryStream && normalizeCounterparty(t) === salaryStream.key ? 'salary' : classify(t)

  // Build the source list from income-eligible counterparties only.
  const byParty = new Map<string, { name: string; cat: TransactionCategory; total: number; months: Set<string> }>()
  for (const t of incomeCredits) {
    const cat = effectiveCategory(t)
    if (cat === 'savings_transfer' || cat === 'investment') continue
    const key = normalizeCounterparty(t)
    const e = byParty.get(key) ?? { name: displayName(key), cat, total: 0, months: new Set<string>() }
    e.total += t.amount
    e.months.add(monthKey(toDate(t.date)))
    // Prefer the most "income-like" category seen for the party.
    if (INCOME_CATEGORIES.has(cat)) e.cat = cat
    byParty.set(key, e)
  }

  // Reuse the recurring-stream detection for per-source timing (day + cadence).
  const streamByKey = new Map(creditStreams.map((s) => [s.key, s]))

  const monthsSpan = Math.max(1, monthlyValues.length)
  const sources: IncomeSource[] = [...byParty.entries()]
    .map(([key, e]) => {
      const stream = streamByKey.get(key)
      return {
        name: e.name,
        key,
        category: e.cat,
        total: round2(e.total),
        monthlyAverage: round2(e.total / monthsSpan),
        monthsPresent: e.months.size,
        // Gig income only counts as regular once the user confirms it.
        pendingConfirmation: e.cat === 'gig_income' && !resolvedIds.has(`income:${e.name}`),
        typicalDayOfMonth: stream?.typicalDayOfMonth ?? null,
        typicalAmount: round2(stream?.amount ?? e.total / Math.max(1, e.months.size)),
        cadence: stream?.cadence ?? 'irregular',
        consistency: stream?.consistency ?? 'variable',
      }
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)

  const { primaryCharacter, characterTags } = deriveCharacter(sources, incomeCredits, recurringSalaryDetected)

  return {
    averageMonthlyIncome,
    netAnnualIncome: round2(averageMonthlyIncome * 12),
    personalTransfersMonthly,
    salaryMonthlyNet,
    estimatedGrossAnnualSalary,
    volatility,
    consistency,
    recurringSalaryDetected,
    primaryCharacter,
    characterTags,
    sources,
    narrative: buildNarrative(averageMonthlyIncome, consistency, primaryCharacter, monthlyValues.length),
  }
}

function streamCategory(s: RecurringStream): TransactionCategory {
  // Classify the stream by its most representative transaction.
  return classify(s.txns[Math.floor(s.txns.length / 2)]!)
}

/**
 * Dominant-amount detection for variable salary streams (PRD §16).
 *
 * Real salary packages mix amounts: base salary + bonus + allowance + dividends
 * under one employer. The aggregate CoV is high, but there IS a stable dominant
 * amount (the base salary) buried in the mix. This function checks whether the
 * stream has a dominant amount band — an amount ±5% that covers ≥40% of the
 * stream's transactions with low internal variance (CoV ≤ 0.05 within the
 * band) and a median ≥ £300. If so, the stream qualifies as salary despite the
 * high aggregate CoV.
 *
 * This avoids false positives: a genuinely variable stream (freelance/gig income
 * where every payment differs) has no dominant band and is correctly rejected.
 */
function hasDominantSalaryAmount(stream: RecurringStream): boolean {
  const amounts = stream.txns.map((t) => t.amount)
  if (amounts.length < 3) return false

  // Cluster amounts into bands (±5% of each anchor). Greedy: sort, then group
  // by proximity.
  const sorted = [...amounts].sort((a, b) => a - b)
  const bands: number[][] = []
  for (const amt of sorted) {
    const last = bands[bands.length - 1]
    if (last && last.length > 0) {
      const anchor = last[0]!
      if (Math.abs(amt - anchor) / anchor <= 0.05) {
        last.push(amt)
        continue
      }
    }
    bands.push([amt])
  }

  // Find the largest band.
  const largest = bands.sort((a, b) => b.length - a.length)[0] ?? []
  if (largest.length < 3) return false

  // Dominant: covers ≥40% of the stream's transactions.
  if (largest.length / amounts.length < 0.4) return false

  // Low internal variance within the band (CoV ≤ 0.05 — the band is tight).
  const bandMean = largest.reduce((s, x) => s + x, 0) / largest.length
  const bandStd = Math.sqrt(largest.reduce((s, x) => s + (x - bandMean) ** 2, 0) / largest.length)
  const bandCoV = bandMean > 0 ? bandStd / bandMean : 1
  if (bandCoV > 0.05) return false

  // Materially sized (median of the band ≥ £300).
  const bandMedian = largest.sort((a, b) => a - b)[Math.floor(largest.length / 2)]!
  if (bandMedian < 300) return false

  return true
}

/**
 * A salary is a *shape*: monthly-ish, stable amount, same source, materially
 * sized. Prefer a stream the keyword rules already call salary; otherwise take
 * the largest qualifying stream that isn't clearly benefits or gig work.
 */
function detectSalaryStream(creditStreams: RecurringStream[]): RecurringStream | undefined {
  // Cadence allow-list. Salary may be paid monthly, four-weekly, OR fortnightly
  // (common in the UK — e.g. Wise payroll). The previous allow-list excluded
  // fortnightly, which silently suppressed recurringSalaryDetected for
  // fortnightly-paid users even when the stream was perfectly stable. Weekly
  // is admitted too: a stable weekly credit from one source with a salary-
  // shaped description is legitimately salary for weekly-paid roles.
  const cadenceOk = (s: RecurringStream) =>
    s.cadence === 'monthly' || s.cadence === 'four_weekly' || s.cadence === 'fortnightly' || s.cadence === 'weekly'

  // Strict candidates: stable amount (CoV ≤ 0.15).
  const candidates = creditStreams.filter(
    (s) => cadenceOk(s) && s.occurrences >= 3 && s.amountCoV <= 0.15 && s.amount >= 300,
  )

  // Fallback: dominant-amount detection (PRD §16: "Do NOT assume recurring =
  // same amount"). Real salary packages mix amounts under one counterparty —
  // base salary + bonus + allowance + dividends — inflating the aggregate CoV
  // far above 0.15. If the strict filter finds nothing, look for a stream with
  // the right cadence where ONE amount band (±5%) covers ≥40% of transactions
  // with low internal variance. That dominant band is the core salary.
  if (candidates.length === 0) {
    const dominantCandidates = creditStreams.filter(
      (s) => cadenceOk(s) && s.occurrences >= 3 && hasDominantSalaryAmount(s),
    )
    if (dominantCandidates.length === 0) return undefined
    const keywordMatch = dominantCandidates.find((s) => streamCategory(s) === 'salary')
    if (keywordMatch) return keywordMatch
    return dominantCandidates.sort((a, b) => b.amount - a.amount)[0]
  }

  const keywordMatch = candidates.find((s) => streamCategory(s) === 'salary')
  if (keywordMatch) return keywordMatch

  const behavioural = candidates
    .filter((s) => {
      const cat = streamCategory(s)
      return cat !== 'government_benefit' && cat !== 'gig_income' && cat !== 'savings_transfer'
    })
    .sort((a, b) => b.amount - a.amount)

  return behavioural[0]
}

function rateIncomeConsistency(volatility: number, months: number): Consistency {
  if (months < 2) return 'one_off'
  if (volatility <= 0.1) return 'very_consistent'
  if (volatility <= 0.35) return 'consistent'
  return 'variable'
}

function deriveCharacter(
  sources: IncomeSource[],
  credits: NormalizedTxn[],
  recurringSalary: boolean
): { primaryCharacter: IncomeCharacter; characterTags: string[] } {
  const totals: Record<string, number> = { salary: 0, gig_income: 0, government_benefit: 0, other: 0 }
  for (const s of sources) {
    totals[s.category in totals ? s.category : 'other'] += s.total
  }
  const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1

  const tags: string[] = []
  let primaryCharacter: IncomeCharacter = 'unclear'

  const salaryShare = totals['salary']! / grand
  const gigShare = totals['gig_income']! / grand
  const benefitShare = totals['government_benefit']! / grand

  if (salaryShare >= 0.6) primaryCharacter = 'employment'
  else if (gigShare >= 0.5) primaryCharacter = 'gig'
  else if (benefitShare >= 0.5) primaryCharacter = 'benefits'
  else if (salaryShare > 0.2 && gigShare > 0.2) primaryCharacter = 'mixed'
  else if (salaryShare + gigShare + benefitShare < 0.3) primaryCharacter = 'unclear'
  else primaryCharacter = 'mixed'

  if (recurringSalary) tags.push('Employer-based', 'Paid monthly')
  if (gigShare >= 0.2) tags.push('Gig / freelance income')
  if (benefitShare >= 0.1) tags.push('Includes benefits')
  else tags.push('Not benefits-reliant')

  const hasInternational = credits.some((t) => INTERNATIONAL.test(t.description ?? ''))
  const hasCashDeposits = credits.filter((t) => CASH_DEPOSIT.test(t.description ?? '')).length >= 3
  if (hasInternational) tags.push('Overseas inflows present')
  else tags.push('UK-sourced')
  if (hasCashDeposits) tags.push('Cash-based component')

  return { primaryCharacter, characterTags: tags }
}

function buildNarrative(avg: number, consistency: Consistency, character: IncomeCharacter, months: number): string {
  if (avg === 0) return 'No regular income was detected in the statements provided.'
  const cons =
    consistency === 'very_consistent'
      ? 'very consistent, with low month-to-month volatility'
      : consistency === 'consistent'
        ? 'relatively consistent'
        : 'variable month to month'
  const charText: Record<IncomeCharacter, string> = {
    employment: 'Primary income appears to come from employment.',
    gig: 'Primary income appears to come from gig or freelance work.',
    self_employed: 'Primary income appears to be self-employment.',
    benefits: 'Income includes regular government benefits.',
    mixed: 'Income comes from more than one source.',
    unclear: 'The source of income is not yet clear and may need confirmation.',
  }
  return `The customer receives income across ${months} month(s), averaging £${avg.toLocaleString('en-GB')} per month. Income is ${cons}. ${charText[character]}`
}
