/**
 * LLM transaction categorizer — the second pass of the hybrid classifier.
 *
 * The deterministic regex classifier (transaction-classifier.ts) runs first and
 * catches everything its merchant/keyword rules know about for free. This
 * module handles whatever is LEFT as `other`: messy statement prose that no
 * fixed regex set can cover ("Card transaction issued by Some Merchant We've
 * Never Heard Of Ltd"). It batches ALL the `other` descriptions into a single
 * GLM call and asks for a JSON array of { index, category }, constrained to
 * the TransactionCategory enum.
 *
 * SAFETY (non-negotiable):
 *   - The LLM touches ONLY the `category` string field. It can never mutate
 *     amount / date / balance / direction — the validation engine already
 *     locked those before this runs.
 *   - Output is strictly validated against the TransactionCategory enum. Any
 *     category the model returns that isn't a valid enum value is rejected and
 *     that transaction keeps its regex result (`other`). The LLM is a category
 *     HINT, never a source of truth.
 *   - Fail-closed: if GLM_API_KEY is unset, the call errors, or the response is
 *     malformed, this returns an empty map (caller keeps the regex categories).
 *     No exception escapes; the pipeline still persists with regex-only results.
 *
 * COST: one batched call per statement for the `other` bucket. On a ~600-txn
 * statement with regex catching ~60%, that's one call with ~240 descriptions —
 * well under 1p. Chunks into batches of 250 to stay within token limits.
 */
import { TransactionCategory } from '@prisma/client'
import type { Logger } from '@nestjs/common'

const VALID_CATEGORIES = new Set<string>(Object.values(TransactionCategory))

/** The valid category values, listed for the model in the prompt. */
const CATEGORY_LIST = Object.values(TransactionCategory).join(' | ')

/** Max descriptions per LLM call — keeps the prompt+response within token limits. */
const BATCH_SIZE = 250

export interface CategorizerInput {
  description: string | null
  direction: 'credit' | 'debit'
}

export interface CategorizerConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  logger?: Logger
}

/**
 * Categorize a batch of `other`-bucket transactions via GLM.
 *
 * Returns a Map from input index → TransactionCategory for every input the
 * model classified with a valid enum value. Missing/invalid entries are simply
 * absent (caller keeps the regex `other` result for those).
 */
export async function categorizeBatch(
  inputs: CategorizerInput[],
  config: CategorizerConfig
): Promise<Map<number, TransactionCategory>> {
  const result = new Map<number, TransactionCategory>()
  if (inputs.length === 0 || !config.apiKey) return result

  // Chunk into batches to stay within token limits.
  for (let start = 0; start < inputs.length; start += BATCH_SIZE) {
    const batch = inputs.slice(start, start + BATCH_SIZE)
    const batchResult = await categorizeOneBatch(batch, start, config)
    for (const [k, v] of batchResult) result.set(k, v)
  }
  return result
}

async function categorizeOneBatch(
  batch: CategorizerInput[],
  offset: number,
  config: CategorizerConfig
): Promise<Map<number, TransactionCategory>> {
  const result = new Map<number, TransactionCategory>()
  const baseUrl = config.baseUrl ?? 'https://api.z.ai/api/paas/v4'
  // glm-4.5-flash is the non-reasoning variant — essential here. The reasoning
  // models (glm-5.2 / glm-4.5) burn their entire token budget on chain-of-
  // thought for a batch this size and never emit the JSON. Flash returns the
  // answer directly, faster and cheaper. Quality on categorization is more
  // than adequate for this task.
  const model = config.model ?? 'glm-4.5-flash'

  // Numbered list of descriptions with direction. Cleaned descriptions make
  // the model's job easier and reduce token use.
  const lines = batch.map((t, i) => {
    const dir = t.direction === 'credit' ? 'CREDIT' : 'DEBIT'
    return `${offset + i}. [${dir}] ${cleanForPrompt(t.description ?? '')}`
  })
  const prompt = [
    'You are categorizing UK bank statement transactions. Assign each a category from ONLY this list:',
    CATEGORY_LIST,
    '',
    'Guidance:',
    '- "Card transaction issued by MERCHANT ..." → MERCHANT is the seller. Categorize by what they sell.',
    '- Clothing/fashion shops (Asos, Zara, H&M, Primark) → groceries (general spending).',
    '- Tech subscriptions / SaaS (Apple, Google, Supabase, Cursor, hosting) → utilities.',
    '- Food shops, supermarkets, restaurants, takeaway → groceries.',
    '- CREDITS from "Sent/Received money from PERSON" → savings_transfer (person-to-person).',
    '- CREDITS from an employer / "Salary" / payroll → salary.',
    '- Buses, trains, fuel, taxi, parking, flights → transport.',
    '- Pharmacies, opticians, doctors, dentists → healthcare.',
    '- Films, music, streaming, cinema, games → entertainment.',
    '- Rent, mortgage, landlord → rent_payment or loan_repayment.',
    '- Card repayments, Klarna, loans → loan_repayment.',
    '- Investment platforms, stocks, ISA → investment.',
    '- If genuinely unidentifiable, use "other".',
    '',
    'Return ONLY a JSON object, no markdown fences, no explanation:',
    '{"results":[{"index":0,"category":"groceries"},...]}',
    'The "index" must match the number from the list. Cover EVERY transaction.',
    '',
    'Transactions:',
    ...lines,
  ].join('\n')

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        // Disable reasoning. Without this the reasoning models spend their
        // whole budget on chain-of-thought and return empty content.
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      config.logger?.warn?.(`GLM categorizer: request failed ${res.status} ${body.slice(0, 200)}`)
      return result
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    const finishReason = data.choices?.[0]?.finish_reason

    if (finishReason === 'length') {
      config.logger?.warn?.(`GLM categorizer: response truncated (finish_reason=length) — batch ${offset} may be incomplete`)
    }

    // Defensive JSON extraction — strip markdown code fences and any prose.
    const stripped = content.replace(/```(?:json)?/gi, '').trim()
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start === -1 || end === -1 || end < start) {
      config.logger?.warn?.('GLM categorizer: no JSON object found in response')
      return result
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(stripped.slice(start, end + 1))
    } catch {
      config.logger?.warn?.('GLM categorizer: response was not valid JSON')
      return result
    }
    const results = (parsed as { results?: Array<{ index?: number; category?: string }> }).results
    if (!Array.isArray(results)) {
      config.logger?.warn?.('GLM categorizer: response.results was not an array')
      return result
    }

    let accepted = 0
    let rejected = 0
    for (const r of results) {
      if (typeof r.index !== 'number' || typeof r.category !== 'string') {
        rejected++
        continue
      }
      const cat = r.category.toLowerCase()
      if (!VALID_CATEGORIES.has(cat)) {
        rejected++
        continue
      }
      result.set(r.index, cat as TransactionCategory)
      accepted++
    }
    config.logger?.log?.(`GLM categorizer: batch ${offset}–${offset + batch.length - 1}: ${accepted} accepted, ${rejected} rejected`)
  } catch (err) {
    config.logger?.warn?.(
      `GLM categorizer: call threw — ${err instanceof Error ? err.message : 'unknown error'}`
    )
  }
  return result
}

/**
 * Trim a raw description for the prompt: keep the merchant-bearing prefix,
 * drop the Wise metadata tail that adds tokens without information. This is a
 * lighter clean than cleanDescription() (which is for regex) — here we just
 * want to shorten, not normalize.
 */
function cleanForPrompt(s: string): string {
  return s
    .replace(/\s+Transaction:\s+[A-Z0-9_-]+.*$/i, '')
    .replace(/\s+Reference:\s+.*$/i, '')
    .replace(/\s+Card ending in\s+\S+.*$/i, '')
    .replace(/\s+MOHAMMED\s+[A-Z\s]+$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 120)
}
