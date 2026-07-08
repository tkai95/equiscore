import type { TransactionCategory } from '@prisma/client'
import { classifyTransaction } from '../../banking/transaction-classifier'
import type { NormalizedTxn } from './types'

/**
 * Thin wrapper over the existing deterministic classifier so the insight
 * engine reuses exactly the same category rules as the Open Banking path.
 * Statement sources have no TrueLayer category hint, so it's left blank —
 * the description/merchant rules carry the classification.
 */
export function classify(t: NormalizedTxn): TransactionCategory {
  return classifyTransaction({
    description: t.description ?? null,
    merchantName: t.merchantName ?? null,
    amount: t.amount,
    direction: t.direction,
    tlCategory: '',
  })
}
