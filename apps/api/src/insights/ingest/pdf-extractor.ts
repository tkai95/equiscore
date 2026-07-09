import Anthropic from '@anthropic-ai/sdk'
import type { NormalizedTxn } from '../engine/types'

/**
 * PDF bank-statement extraction via Claude vision.
 *
 * This is the ONE place AI enters the pipeline, and only at the extraction
 * boundary: Claude turns the pixels/text of a statement (typed e-statement OR
 * scanned photo) into structured transaction rows. Everything downstream —
 * classification, recurrence, scoring, and the balance-continuity check — stays
 * deterministic. The integrity check doubles as an accuracy guard: if Claude
 * misreads an amount, the running balance won't reconcile and the import is
 * rejected, so a hallucinated figure can't quietly inflate a score.
 */

export interface PdfExtractionResult {
  transactions: NormalizedTxn[]
  accountHolderName: string | null
  warnings: string[]
}

const EXTRACTION_PROMPT = `You are extracting transactions from a UK bank statement (it may be a typed PDF or a scan/photo).

Return ONLY a JSON object, no markdown, no commentary, in exactly this shape:
{
  "accountHolderName": string | null,   // the account holder's name from the statement header, or null
  "transactions": [
    {
      "date": "YYYY-MM-DD",              // the transaction date, ISO format
      "description": string,             // the full merchant/payee/reference text, joined if it wraps lines
      "amount": number,                  // POSITIVE magnitude, no currency symbol or commas
      "direction": "credit" | "debit",   // credit = money in, debit = money out
      "balance": number | null           // the running balance AFTER this transaction, or null if the statement shows no balance column
    }
  ]
}

Rules:
- Extract EVERY transaction line, in chronological order (oldest first).
- If debits and credits are in separate columns, infer direction from which column the value is in.
- If there is a single signed amount column, a negative value is a debit and a positive value is a credit; output amount as a positive number and set direction accordingly.
- Copy the running balance EXACTLY as printed (it is used to verify accuracy) — do not compute or "correct" it.
- Do NOT include opening/closing balance summary rows, headers, page footers, interest-rate notices, or marketing text as transactions.
- If a value is genuinely unreadable, omit that single row rather than guessing.
- Output only the JSON object.`

/** Best-effort JSON extraction: strip any prose/markdown fences the model may add. */
function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) throw new Error('No JSON object found in model output')
  return text.slice(start, end + 1)
}

export async function extractTransactionsFromPdf(
  apiKey: string,
  base64Pdf: string
): Promise<PdfExtractionResult> {
  const client = new Anthropic({ apiKey })

  // Stream so a large statement's output can't hit an HTTP timeout.
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 32000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      },
    ],
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new Error('The statement could not be processed.')
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  let parsed: { accountHolderName?: string | null; transactions?: unknown[] }
  try {
    parsed = JSON.parse(extractJson(text))
  } catch {
    // A parse failure usually means the output was truncated — surface it clearly.
    throw new Error('Could not read the statement reliably. Please try a clearer copy or a CSV export.')
  }

  const warnings: string[] = []
  const transactions: NormalizedTxn[] = []

  for (const raw of parsed.transactions ?? []) {
    const t = raw as Record<string, unknown>
    const date = typeof t.date === 'string' ? t.date : null
    const amount = typeof t.amount === 'number' ? Math.abs(t.amount) : null
    const direction = t.direction === 'credit' || t.direction === 'debit' ? t.direction : null
    if (!date || amount === null || !direction || Number.isNaN(new Date(date).getTime())) continue

    transactions.push({
      date,
      amount,
      direction,
      description: typeof t.description === 'string' ? t.description : null,
      merchantName: null,
      balance: typeof t.balance === 'number' ? t.balance : null,
    })
  }

  if (transactions.length === 0) {
    warnings.push('No transactions could be read from this statement.')
  }

  return {
    transactions,
    accountHolderName:
      typeof parsed.accountHolderName === 'string' ? parsed.accountHolderName : null,
    warnings,
  }
}
