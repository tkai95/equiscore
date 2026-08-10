import { TransactionCategory } from '@prisma/client'
import { classifyTransaction } from '../../banking/transaction-classifier'
import type { NormalizedTxn } from './types'

/**
 * Resolve a transaction's category, honouring the stored category assigned at
 * ingest time (regex + LLM hybrid classifier) when present.
 *
 * The hybrid classifier at ingest is the source of truth: it has the full
 * description + an LLM fallback that catches what regex can't (e.g. a private
 * landlord like "Strideup Homes Limited" that matches no keyword but is
 * genuinely rent). Re-deriving the category here with the weaker regex-only
 * path would silently discard those corrections and produce the £0-rent bug
 * (commit that fixed it). We only fall back to regex classification when the
 * stored category is null/empty (Open Banking rows that carry a TrueLayer hint,
 * or legacy rows ingested before the hybrid classifier shipped).
 */
export function classify(t: NormalizedTxn): TransactionCategory {
  if (t.category && t.category !== 'other') return t.category
  // No trustworthy stored category — derive from description/merchant rules.
  return classifyTransaction({
    description: t.description ?? null,
    merchantName: t.merchantName ?? null,
    amount: t.amount,
    direction: t.direction,
    tlCategory: '',
  })
}
