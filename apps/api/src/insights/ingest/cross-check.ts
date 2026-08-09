/**
 * Second-model cross-check for PDF self-healing.
 *
 * When the balance-continuity check finds a break, Claude re-reads the suspect
 * page (the primary path). This module runs a SECOND, cheap, OpenAI-compatible
 * model on the same page image IN PARALLEL, giving an independent read of the
 * pixels — a different model is unlikely to make the identical OCR error, so if
 * Claude misread a digit, this is the second chance at getting it right. The
 * caller takes whichever result reconciles via windowReconciles.
 *
 * Fail-safe by design: no OPENAI_API_KEY, a rasterization failure upstream, a
 * network/parse error, or a timeout all return [] — the caller simply falls
 * back to Claude's result. This module can NEVER break the primary path.
 *
 * Provider-agnostic: OPENAI_BASE_URL lets you point at DeepSeek, OpenRouter, or
 * any OpenAI-compatible multimodal endpoint without code changes. Only
 * requirement is image_url input support (gpt-4o-mini, GLM-4.6V, etc.).
 */

import type { NormalizedTxn } from '../engine/types'
import type { BreakContext } from '../engine/integrity'
import { extractJson } from './pdf-extractor'

/** Parse the model's JSON array-of-transactions into NormalizedTxn[]. */
function parseTxns(text: string): NormalizedTxn[] {
  let parsed: { transactions?: unknown[] }
  try {
    parsed = JSON.parse(extractJson(text))
  } catch {
    return [] // unparseable — not fatal, caller falls back to the other provider
  }
  const out: NormalizedTxn[] = []
  for (const raw of parsed.transactions ?? []) {
    const t = raw as Record<string, unknown>
    const date = typeof t.date === 'string' ? t.date : null
    const amount = typeof t.amount === 'number' ? Math.abs(t.amount) : null
    const direction = t.direction === 'credit' || t.direction === 'debit' ? t.direction : null
    if (!date || amount === null || !direction || Number.isNaN(new Date(date).getTime())) continue
    out.push({
      date,
      amount,
      direction,
      description: typeof t.description === 'string' ? t.description : null,
      merchantName: null,
      balance: typeof t.balance === 'number' ? t.balance : null,
    })
  }
  return out
}

/** Build the same targeted re-read prompt the Claude path uses, minus the PDF. */
function buildPrompt(ctx: BreakContext): string {
  const lines = ctx.windowTxns.map(
    (t) =>
      `  ${t.date} | ${t.direction === 'credit' ? '+' : '-'}${t.amount.toFixed(2)} | balance: ${t.balance ?? '?'} | ${t.description ?? ''}`
  )
  const gap =
    ctx.beforeBalance !== null && ctx.afterBalance !== null
      ? `\nThe running balance is off by ${Math.abs(ctx.afterBalance - ctx.beforeBalance).toFixed(2)} across this window. A gap of exactly 2× some transaction's amount usually means that transaction's direction (credit vs debit) was read backwards. A gap equal to a transaction's amount usually means a row was dropped or duplicated.`
      : ''
  return `You are re-reading a page from a UK bank statement. The running balance does NOT reconcile around ${ctx.breakDate}.

A different process independently verified these anchor balances are CORRECT:
- Balance immediately BEFORE the break: ${ctx.beforeBalance ?? 'unknown'}
- Balance at/after the break: ${ctx.afterBalance ?? 'unknown'}

What we currently have in that window (date | amount | balance | description):
${lines.join('\n')}
${gap}

One row was misread. The most common causes: (1) a transaction's DIRECTION was flipped; (2) a row was dropped or duplicated; (3) an amount digit was misread; (4) the running balance was copied wrong. Look carefully at the statement page image and re-extract ONLY the transactions within roughly 7 days of ${ctx.breakDate}, correcting the error.

Return ONLY a JSON object, no markdown, in exactly this shape:
{
  "transactions": [
    { "date": "YYYY-MM-DD", "description": string, "amount": number, "direction": "credit" | "debit", "balance": number | null }
  ]
}

Rules:
- The amounts and balances MUST connect ${ctx.beforeBalance ?? 'the prior balance'} to ${ctx.afterBalance ?? 'the following balance'} exactly — verify before returning.
- Copy the running balance EXACTLY as printed — do not compute or "correct" it.
- Include EVERY transaction line in that window, chronological. Nothing outside it.
- If a row is genuinely unreadable, omit it rather than guessing.
- Output only the JSON object.`
}

/**
 * Run the cross-check model on a break's page image(s). Returns corrected
 * transactions (possibly empty). Never throws — [] means "no contribution",
 * and the caller uses the other provider's result.
 *
 * @param ctx        the break context (anchors + current window)
 * @param pagePngs   base64 PNG strings of the page(s) around the break; if empty, returns [] (nothing to show the model)
 */
export async function crossCheckBreak(
  ctx: BreakContext,
  pagePngs: string[]
): Promise<NormalizedTxn[]> {
  const apiKey = process.env['OPENAI_API_KEY']?.trim()
  if (!apiKey || pagePngs.length === 0) return [] // feature disabled, or no image available

  const model = process.env['OPENAI_MODEL']?.trim() || 'gpt-4o-mini'
  const baseUrl = process.env['OPENAI_BASE_URL']?.trim() || 'https://api.openai.com/v1'
  const startedAt = Date.now()

  // Per-call ceiling shorter than the overall healing budget so one stuck call
  // can't eat it. Wrapped in a timeout race; fetch has no native Abort timeout
  // here, but the healing budget bounds the total regardless.
  const timeoutMs = 90_000

  const content: Array<Record<string, unknown>> = [
    // Image blocks first, then the prompt — same convention as the Claude path.
    ...pagePngs.map((png) => ({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${png}` },
    })),
    { type: 'text', text: buildPrompt(ctx) },
  ]

  const race = <T>(p: Promise<T>, ms: number): Promise<T> =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('cross-check timed out')), ms)
      p.then(
        (v) => {
          clearTimeout(t)
          resolve(v)
        },
        (e) => {
          clearTimeout(t)
          reject(e)
        }
      )
    })

  try {
    const res = await race(
      fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: 16000,
          messages: [{ role: 'user', content }],
        }),
      }),
      timeoutMs
    )
    if (!res.ok) {
      console.log(
        `Cross-check: ${model} returned ${res.status} after ${((Date.now() - startedAt) / 1000).toFixed(0)}s — skipping`
      )
      return []
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data.choices?.[0]?.message?.content ?? ''
    const out = parseTxns(text)
    console.log(
      `Cross-check: ${model} returned ${out.length} txn(s) in ${((Date.now() - startedAt) / 1000).toFixed(0)}s`
    )
    return out
  } catch (err) {
    console.log(
      `Cross-check: ${model} failed after ${((Date.now() - startedAt) / 1000).toFixed(0)}s — ${err instanceof Error ? err.message : 'unknown error'}`
    )
    return []
  }
}
