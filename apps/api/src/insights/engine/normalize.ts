import type { NormalizedTxn } from './types'

/**
 * Turn a messy bank description into a stable counterparty key.
 *
 * Real statement lines are noisy: card-scheme prefixes, POS references,
 * embedded dates, long digit runs, trailing location / country codes,
 * aggregator wrappers ("PAYPAL *UBER"). Behavioural detection (recurrence,
 * salary, rent) only works if the same payee collapses to the same key
 * across months — so this is the load-bearing step for the whole engine.
 */

const NOISE_PATTERNS: RegExp[] = [
  /\bref\s*[:#]?\s*\w+/gi, // reference numbers
  /\b\d{6,}\b/g, // long digit runs (card refs, account numbers)
  /\b\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?\b/g, // embedded dates
  /\b\d{1,2}:\d{2}\b/g, // times
  /\bon \d{1,2} \w{3}\b/gi, // "on 14 Feb"
  /\b(gbp|usd|eur)\b/gi, // currency codes
  /\b(bgc|bp|cp|pos|crd|vis|dd|so|ftp|fp|fpi|fpo|chq|atm|dr|cr)\b/gi, // channel codes
  /\b(contactless|card payment|debit card|visa|mastercard|maestro)\b/gi,
  /[*#]+/g,
  /\b(london|manchester|birmingham|leeds|glasgow|gb|uk|gbr)\b/gi, // trailing locations
  /\s{2,}/g,
]

/** Aggregators that hide the true merchant — surface the wrapped name if present. */
const AGGREGATOR = /\b(paypal|sq|sumup|zettle|izettle|stripe|gocardless)\b\s*/gi

/**
 * Payment verbs and rails. Stripped from the *grouping key* only — never from
 * the description the classifier reads — so "TRANSFER TO J SMITH" and
 * "FP TO J SMITH" collapse to the same counterparty.
 */
const RAIL_NOISE = /\b(transfer|payment|pymt|paid|to|from|via|bacs|fps|faster|standing order|direct debit|credit|debit)\b/gi

export function normalizeCounterparty(txn: Pick<NormalizedTxn, 'description' | 'merchantName'>): string {
  const merchant = (txn.merchantName ?? '').trim()
  if (merchant) return canonical(merchant)

  let s = (txn.description ?? '').toLowerCase()
  s = s.replace(AGGREGATOR, '') // keep whatever the aggregator wrapped
  for (const p of NOISE_PATTERNS) s = s.replace(p, ' ')
  s = s.replace(RAIL_NOISE, ' ')

  s = s.replace(/[^a-z0-9&'\s-]/g, ' ').replace(/\s{2,}/g, ' ').trim()

  // Keep the leading tokens — merchant names lead, references trail.
  // Single letters are retained: they are usually initials ("j smith").
  const tokens = s.split(' ').filter(Boolean)
  const key = tokens.slice(0, 4).join(' ').trim()
  return canonical(key || (txn.description ?? 'unknown'))
}

function canonical(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|llp|inc|the)\b/g, '')
    .replace(/[^a-z0-9&'\s-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const ACRONYMS = new Set(['tfl', 'atm', 'bt', 'ee', 'o2', 'hmrc', 'dwp', 'nhs', 'bg'])

/** Title-cased display name derived from a counterparty key. */
export function displayName(key: string): string {
  if (!key) return 'Unknown'
  return key
    .split(' ')
    .filter(Boolean)
    .filter((w) => w !== 'com' && w !== 'co') // "netflix com" → "Netflix"
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ')
}

/** Does the counterparty look like a person's name rather than a business? */
export function looksLikePerson(key: string): boolean {
  const tokens = key.split(' ').filter(Boolean)
  if (tokens.length < 2 || tokens.length > 3) return false
  const businessish =
    /(ltd|energy|water|gas|council|tax|insurance|mobile|broadband|rent|bank|card|finance|gym|tv|store|shop|market|cafe|coffee|uber|group|services|solutions|wise|remitly)/
  if (businessish.test(key)) return false
  if (!tokens.every((t) => /^[a-z][a-z'-]*$/.test(t))) return false

  // An initial is a single letter and it leads the name ("j smith").
  // Anything else with a stray single letter is a trading name ("pret a manger").
  const initials = tokens.filter((t) => t.length === 1)
  if (initials.length > 1) return false
  if (initials.length === 1 && tokens[0]!.length !== 1) return false

  return tokens.some((t) => t.length >= 3)
}

/** Fuzzy name match (fraction of profile-name tokens found in the other name). */
export function nameMatchScore(a: string | null | undefined, b: string | null | undefined): number {
  const an = (a ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  const bn = (b ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (an.length === 0 || bn.length === 0) return 0
  const matches = an.filter((p) => bn.some((q) => q.includes(p) || p.includes(q)))
  return matches.length / an.length
}
