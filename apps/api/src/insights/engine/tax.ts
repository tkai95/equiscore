/**
 * Estimate a gross annual salary from the net (take-home) income a statement
 * shows. Bank statements only ever show money that actually landed, i.e. after
 * PAYE income tax and employee National Insurance — so to suggest what someone
 * "earns" on paper we have to reverse those deductions.
 *
 * This is an ESTIMATE and is labelled as such in the UI. It uses England &
 * Northern Ireland rates for 2025/26 and assumes a standard tax code with the
 * full personal allowance. It deliberately ignores things a statement can't
 * reveal: pension contributions, salary sacrifice, student-loan deductions,
 * benefits in kind, Scottish/Welsh rates, and non-standard tax codes. It should
 * be read as "roughly what gross salary would net this amount", not a precise
 * payroll figure.
 */

const PERSONAL_ALLOWANCE = 12570
const BASIC_BAND = 37700 // taxable amount taxed at 20%
const ADDITIONAL_THRESHOLD = 125140 // gross at which 45% starts
const NI_PRIMARY_THRESHOLD = 12570
const NI_UPPER_EARNINGS_LIMIT = 50270

function annualIncomeTax(gross: number): number {
  // Personal allowance tapers by £1 for every £2 above £100k.
  const allowance = gross > 100000 ? Math.max(0, PERSONAL_ALLOWANCE - (gross - 100000) / 2) : PERSONAL_ALLOWANCE
  const taxable = Math.max(0, gross - allowance)
  // The 40% band runs from the top of the basic band up to where the (now
  // possibly tapered) allowance puts the £125,140 additional-rate threshold.
  const higherBandTaxableTop = Math.max(BASIC_BAND, ADDITIONAL_THRESHOLD - allowance)

  let tax = 0
  tax += Math.min(taxable, BASIC_BAND) * 0.2
  if (taxable > BASIC_BAND) {
    tax += (Math.min(taxable, higherBandTaxableTop) - BASIC_BAND) * 0.4
  }
  if (taxable > higherBandTaxableTop) {
    tax += (taxable - higherBandTaxableTop) * 0.45
  }
  return tax
}

function annualEmployeeNI(gross: number): number {
  if (gross <= NI_PRIMARY_THRESHOLD) return 0
  const main = Math.min(gross, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD
  const upper = Math.max(0, gross - NI_UPPER_EARNINGS_LIMIT)
  return main * 0.08 + upper * 0.02
}

function netFromGross(gross: number): number {
  return gross - annualIncomeTax(gross) - annualEmployeeNI(gross)
}

/** The most take-home an annual gross could produce (before any voluntary
 *  deductions like pension). Used to flag a payslip whose net is impossibly high. */
export function expectedNetFromGross(grossAnnual: number): number {
  return Math.round(netFromGross(Math.max(0, grossAnnual)))
}

/**
 * Invert net → gross. `netFromGross` is monotonic, so a bisection converges
 * quickly and avoids hard-coding band-by-band algebra.
 */
export function grossUpFromNet(netAnnual: number): number {
  if (netAnnual <= 0) return 0
  // Below the tax/NI thresholds, take-home equals gross.
  if (netAnnual <= PERSONAL_ALLOWANCE) return Math.round(netAnnual)

  let lo = netAnnual
  let hi = netAnnual * 2
  while (netFromGross(hi) < netAnnual && hi < 10_000_000) hi *= 1.5
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (netFromGross(mid) < netAnnual) lo = mid
    else hi = mid
  }
  return Math.round((lo + hi) / 2)
}
