import type { DocumentType } from '@equiscore/shared'

/**
 * The evidence matrix: which claims each document type can actually attest, and
 * the deterministic checks that decide whether an extracted document genuinely
 * corroborates the user's profile. Extraction (Claude) turns a file into
 * fields; everything here is pure and testable.
 *
 * Principle: a document is only worth points once its contents are read AND the
 * key fact it carries matches the profile. An unread upload, or one whose name
 * or address disagrees with the profile, is not verification.
 */

/** Photo ID — attests legal name and date of birth (and often a document number/expiry). */
export const IDENTITY_DOCS: DocumentType[] = [
  'passport',
  'national_id',
  'biometric_residence_permit',
  'driving_licence',
]

/** Carries a residential address that can be matched to the declared address. */
export const ADDRESS_CAPABLE_DOCS: DocumentType[] = [
  'utility_bill',
  'tenancy_agreement',
  'bank_statement',
  'driving_licence',
  'biometric_residence_permit',
]

/** Corroborates income / employment. */
export const INCOME_DOCS: DocumentType[] = ['payslip', 'p60', 'p45', 'employment_letter', 'tax_return']

export type DocumentFamily = 'identity' | 'address' | 'income' | 'other'

export function documentFamily(t: DocumentType): DocumentFamily {
  if (IDENTITY_DOCS.includes(t)) return 'identity'
  if (INCOME_DOCS.includes(t)) return 'income'
  if (ADDRESS_CAPABLE_DOCS.includes(t)) return 'address'
  return 'other'
}

/** The structured fields Claude is asked to pull from a document image/PDF. */
export interface ExtractedFields {
  fullName: string | null
  dateOfBirth: string | null // ISO YYYY-MM-DD
  address: string | null
  postcode: string | null
  documentNumber: string | null
  expiryDate: string | null // ISO YYYY-MM-DD
  /** The date printed on the document (bill date, statement date, issue date). */
  documentDate: string | null // ISO YYYY-MM-DD
  employerName: string | null
  payDate: string | null // ISO YYYY-MM-DD
  netPay: number | null
  grossPay: number | null
  /** The document type Claude thinks this is (to catch "utility bill" uploaded as "passport"). */
  detectedDocumentType: string | null
  /** Claude's read on whether this is a genuine document of a recognised kind (not a blank/selfie/screenshot). */
  looksAuthentic: boolean
  /** False when the file was too poor to read the key fields. */
  readable: boolean
}

export interface ProfileFacts {
  fullName: string | null
  dob: Date | null
  addressLine1: string | null
  postcode: string | null
}

export interface DocumentMatch {
  /** null = not checkable (a needed field is missing on the document or the profile). */
  nameMatch: boolean | null
  dobMatch: boolean | null
  addressMatch: boolean | null
  expired: boolean
}

// ── Field matchers ─────────────────────────────────────────────────────────────

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

/** Fuzzy name match: most profile-name tokens appear in the document name (or vice-versa). */
export function namesMatch(a: string | null, b: string | null): boolean | null {
  if (!a || !b) return null
  const an = tokens(a)
  const bn = tokens(b)
  if (an.length === 0 || bn.length === 0) return null
  const overlap = (x: string[], y: string[]) =>
    x.filter((p) => y.some((q) => q === p || q.includes(p) || p.includes(q))).length / x.length
  // Require a strong overlap in whichever direction has fewer tokens (handles
  // middle names present on one side only).
  return Math.max(overlap(an, bn), overlap(bn, an)) >= 0.6
}

export function datesMatch(iso: string | null, dob: Date | null): boolean | null {
  if (!iso || !dob) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10) === dob.toISOString().slice(0, 10)
}

const normPostcode = (p: string) => p.toUpperCase().replace(/\s+/g, '')

export function addressesMatch(
  docAddress: string | null,
  docPostcode: string | null,
  profileLine1: string | null,
  profilePostcode: string | null
): boolean | null {
  // Postcode is the strongest, most reliable signal — prefer it.
  if (docPostcode && profilePostcode) {
    return normPostcode(docPostcode) === normPostcode(profilePostcode)
  }
  // A postcode may be embedded in the free-text address.
  if (docAddress && profilePostcode) {
    return docAddress.toUpperCase().replace(/\s+/g, '').includes(normPostcode(profilePostcode))
  }
  // Fall back to street-line token overlap.
  if (docAddress && profileLine1) {
    const dn = tokens(docAddress)
    const pn = tokens(profileLine1)
    if (pn.length === 0) return null
    const overlap = pn.filter((p) => dn.includes(p)).length / pn.length
    return overlap >= 0.6
  }
  return null
}

export function matchDocument(fields: ExtractedFields, profile: ProfileFacts): DocumentMatch {
  const expired = fields.expiryDate
    ? (() => {
        const d = new Date(fields.expiryDate as string)
        return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
      })()
    : false
  return {
    nameMatch: namesMatch(fields.fullName, profile.fullName),
    dobMatch: datesMatch(fields.dateOfBirth, profile.dob),
    addressMatch: addressesMatch(fields.address, fields.postcode, profile.addressLine1, profile.postcode),
    expired,
  }
}

export type DocVerdict = 'verified' | 'needs_review' | 'rejected'

/**
 * Turn extraction + matching into a verification verdict for one document,
 * scoped to what its type can actually prove.
 *   verified     — read cleanly and the claim it carries matches the profile
 *   needs_review — read, but the key fact mismatched, is missing, or it expired
 *   rejected     — unreadable, or not a genuine document of the expected kind
 */
export function verdictFor(
  type: DocumentType,
  fields: ExtractedFields,
  match: DocumentMatch
): DocVerdict {
  if (!fields.readable || !fields.looksAuthentic) return 'rejected'
  const family = documentFamily(type)

  if (family === 'identity') {
    if (match.expired) return 'needs_review'
    if (match.nameMatch === false) return 'needs_review'
    if (match.nameMatch === true) return 'verified'
    return 'needs_review' // couldn't read a name to compare
  }
  if (family === 'address') {
    if (match.addressMatch === true) return 'verified'
    if (match.addressMatch === false) return 'needs_review'
    return 'needs_review'
  }
  if (family === 'income') {
    // An income document is corroboration; we just need it to be a genuine,
    // readable income document. Name mismatch drops it to review.
    if (match.nameMatch === false) return 'needs_review'
    return 'verified'
  }
  // 'other' — readable but supports no specific claim.
  return 'needs_review'
}
