/**
 * Credit-card provider recognition patterns (PRD §21, §77).
 *
 * Used to detect recurring debit streams that are PROBABLY credit-card / loan
 * repayments — so the engine can ask "is this your own credit card?" without
 * the user having to volunteer it. Entity identification (this IS a credit-card
 * provider) is deliberately separate from transaction interpretation (this is
 * the USER'S credit-card repayment) — per PRD §14.
 */

/** Merchants whose recurring presence on a debit stream likely indicates a
 *  credit-card or loan repayment. Matches the cleaned counterparty key. */
export const CREDIT_CARD_PROVIDER_RE =
  /\b(barclaycard|capital one|vanquis|aqua card|fluid card|amex|american express|mbna|saga card|tesco credit|m&s credit|creation card|new day|marbles card|ocean card|halifax card|lloyds card)\b/i

/** True if the counterparty key looks like a credit-card or loan provider. */
export function looksLikeCreditCardProvider(key: string): boolean {
  return CREDIT_CARD_PROVIDER_RE.test(key)
}
