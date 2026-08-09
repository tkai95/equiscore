/**
 * Canonical ingestion types — the provider-neutral intermediate representation
 * every extractor (CSV, native PDF, OCI, Google, LLM crop) must produce, and
 * the validation engine consumes.
 *
 * The central rule (see docs/STATEMENT_INGESTION_ROADMAP.md): extraction
 * determines what the document said; validation determines whether we can trust
 * it; AI analysis determines what it means. These types enforce the boundary —
 * extractors emit evidence + candidates, never "trusted" values. Trust is
 * conferred only by the ValidationResult.
 *
 * Amounts are kept as numbers (minor currency is enforced at the validation/
 * reconciliation layer, not in the type, to keep the extractor interfaces
 * simple). Source evidence (page/row/raw) is required for any value that will
 * be auto-accepted — provenance coverage is a validation check.
 */

/** How trustworthy the source itself is — distinct from extraction confidence. */
export type SourceAssurance =
  | 'bank_api' // Open Banking — bank-attested
  | 'user_document' // user-uploaded statement (editable, unattested)
  | 'user_unverified' // explicit "we parsed it but cannot attest the source"

/** Direction of money movement, as resolved from the source. */
export type TxnDirection = 'credit' | 'debit'

/**
 * A single transaction as extracted, BEFORE validation decides whether to trust
 * it. Carries both the normalised values and the raw evidence that produced them,
 * so the validator (and any correction) can point at exactly where a figure
 * came from. A value with `source = null` cannot be auto-accepted (provenance
 * coverage check).
 */
export interface CanonicalTransaction {
  /** ISO date (YYYY-MM-DD). */
  date: string
  /** Positive magnitude of the transaction. */
  amount: number
  direction: TxnDirection
  description: string | null
  /** Running balance AFTER this transaction, if the source prints one. */
  balance: number | null

  // ── Raw evidence (the "where did this come from" layer) ───────────────────
  dateRaw: string | null
  descriptionRaw: string | null
  /** The amount text exactly as printed (before sign/column parsing). */
  amountRaw: string | null
  balanceRaw: string | null
  /** 1-based source page (PDF) or null (CSV row index only). */
  sourcePage: number | null
  /** Row within the source page / file. */
  sourceRow: number | null

  // ── Extractor provenance ──────────────────────────────────────────────────
  /** Which strategy produced this row: csv | native_pdf | oci | google | llm_crop. */
  extractor: string
  extractorVersion: string
  /** Provider OCR confidence if available (0-1). Confidence != correctness —
   *  used only for routing/flagging, never as proof of correctness. */
  confidence: number | null
}

/**
 * The provider-neutral result every extractor returns. The validation engine
 * turns this into a trusted (or rejected) ledger.
 */
export interface ExtractionResult {
  /** Canonical transaction candidates, in source order. */
  transactions: CanonicalTransaction[]
  /** Account holder name from the statement header, if recovered. */
  accountHolderName: string | null
  /** Statement-level metadata candidates (opening/closing balance, period, etc).
   *  Each is a candidate — validation verifies them, doesn't assume them. */
  openingBalance: number | null
  closingBalance: number | null
  statementPeriodStart: string | null
  statementPeriodEnd: string | null
  /** Page count the extractor actually processed vs expects (completeness check). */
  pagesProcessed: number | null
  pagesExpected: number | null
  /** Soft warnings (non-fatal issues the extractor noticed). */
  warnings: string[]
  /** Which strategy + version produced this. */
  extractor: string
  extractorVersion: string
}

/** Outcome of a single validation check. */
export type CheckStatus = 'pass' | 'fail' | 'not_applicable'

/** A balance break, with enough context to target resolution at the smallest region. */
export interface ValidationBreak {
  /** Index in the validated transaction array where the break appears. */
  index: number
  date: string
  expected: number
  actual: number
  /** Source page/row of the breaking transaction, for targeted re-extraction. */
  sourcePage: number | null
  sourceRow: number | null
}

/**
 * The full validation result — the object that confers (or denies) trust.
 * Downstream scoring depends on `status === 'verified'`; anything else must not
 * contribute to a Trust Score.
 */
export interface ValidationResult {
  status: 'verified' | 'uncertain' | 'failed'
  checks: {
    structural: CheckStatus
    completeness: CheckStatus
    deduplication: CheckStatus
    runningBalance: CheckStatus
    statementLevel: CheckStatus
    dates: CheckStatus
    metadata: CheckStatus
    provenance: CheckStatus
  }
  transactionCount: number
  /** Balance breaks (running-balance reconciliation failures), for exception resolution. */
  breaks: ValidationBreak[]
  /** Transactions lacking source provenance — cannot be auto-accepted. */
  unresolvedFields: number
  /** Opening/closing as reconciled by the validator (may differ from candidates). */
  openingBalance: number | null
  closingBalance: number | null
}

/** Build an empty (all not_applicable) result — the starting point for the validator. */
export function emptyValidationResult(transactionCount: number): ValidationResult {
  return {
    status: 'uncertain',
    checks: {
      structural: 'not_applicable',
      completeness: 'not_applicable',
      deduplication: 'not_applicable',
      runningBalance: 'not_applicable',
      statementLevel: 'not_applicable',
      dates: 'not_applicable',
      metadata: 'not_applicable',
      provenance: 'not_applicable',
    },
    transactionCount,
    breaks: [],
    unresolvedFields: 0,
    openingBalance: null,
    closingBalance: null,
  }
}
