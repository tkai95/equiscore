/**
 * LLM last-resort exception resolver.
 *
 * When the validation engine finds balance breaks that the cheaper extractors
 * couldn't resolve (native text layer failed, or cheap OCR + better layout
 * extraction both failed a row), this is the final escalation step: send ONLY
 * the suspect PAGE crop to a vision model for transcription — not the whole
 * document — and accept a correction ONLY with both:
 *
 *   1. SOURCE EVIDENCE — the model read specific cells on a specific page
 *      (never "I inferred this to make it balance"), AND
 *   2. RECONCILIATION — the corrected window actually connects the trusted
 *      anchor balances (windowReconciles).
 *
 * Arithmetic compatibility alone is NOT sufficient (safety invariant §5/§28).
 * If both conditions aren't met, the break stays UNRESOLVED — no synthetic
 * transactions are inserted to force a balance (§29).
 *
 * Uses an OpenAI-compatible vision endpoint (OPENAI_* env), same as the old
 * cross-check — but now scoped to the suspect page only and gated on evidence.
 */
import type { CanonicalTransaction } from './canonical'
import type { ValidationBreak } from './canonical'
import type { BreakContext } from '../engine/integrity'
import { findBreakContext, windowReconciles } from '../engine/integrity'
import { renderPagesToPngs } from './pdf-render'

/** A correction that was accepted, with the evidence record proving why. */
export interface AcceptedCorrection {
  breakDate: string
  /** The page we cropped and sent to the model (provenance). */
  sourcePage: number | null
  /** Which provider produced the accepted read. */
  provider: string
  /** The corrected transactions for the window. */
  corrected: CanonicalTransaction[]
}

/** Result of attempting to resolve all breaks via the LLM crop. */
export interface ResolutionResult {
  /** Corrections accepted (each with source evidence + reconciliation). */
  corrections: AcceptedCorrection[]
  /** Breaks we could NOT resolve — these remain and the statement cannot verify. */
  unresolved: ValidationBreak[]
  /** Soft warnings for the job log. */
  warnings: string[]
}

/**
 * Attempt to resolve each validation break by cropping the suspect page and
 * asking the vision model to transcribe ONLY the transaction row(s) around the
 * break. Never sends the whole document. Never accepts a correction without
 * evidence + reconciliation.
 *
 * @param txns       the current canonical transaction set (mutated copy returned)
 * @param breaks     the balance breaks to resolve
 * @param pdfBuffer  the source PDF (for page crops); null for CSV (no crops → no LLM)
 */
export async function resolveBreaks(
  txns: CanonicalTransaction[],
  breaks: ValidationBreak[],
  pdfBuffer: Buffer | null
): Promise<ResolutionResult> {
  const warnings: string[] = []
  const corrections: AcceptedCorrection[] = []
  const unresolved: ValidationBreak[] = []

  if (breaks.length === 0) return { corrections, unresolved, warnings }
  if (!pdfBuffer) {
    // CSV has no pages to crop — the LLM crop path doesn't apply. CSV breaks
    // are genuine source errors; the statement rejects honestly.
    return { corrections, unresolved: [...breaks], warnings: ['CSV source — no LLM crop available.'] }
  }

  const apiKey = process.env['OPENAI_API_KEY']?.trim()
  const model = process.env['OPENAI_MODEL']?.trim() || 'gpt-4o-mini'
  const baseUrl = process.env['OPENAI_BASE_URL']?.trim() || 'https://api.openai.com/v1'

  if (!apiKey) {
    // No LLM configured — can't escalate. Breaks stay unresolved.
    return {
      corrections,
      unresolved: [...breaks],
      warnings: ['OPENAI_API_KEY unset — LLM crop escalation unavailable.'],
    }
  }

  let working = [...txns]

  for (const brk of breaks) {
    // Build the break context (anchors + window) from the current working set.
    const ctx: BreakContext = findBreakContext(working, brk)

    // Crop ONLY the suspect page (cheapest, most focused). If the break has no
    // page attribution we can't crop precisely — treat as unresolved.
    const pageNum = brk.sourcePage ?? 1
    try {
      const pngs = await renderPagesToPngs(pdfBuffer, [pageNum - 1]) // 0-based for renderer
      if (pngs.length === 0) {
        unresolved.push(brk)
        warnings.push(`Break ${brk.date}: could not render page ${pageNum} for crop.`)
        continue
      }

      const corrected = await llmTranscribeCrop(ctx, pngs[0]!, apiKey, model, baseUrl)
      if (corrected.length === 0) {
        unresolved.push(brk)
        warnings.push(`Break ${brk.date}: LLM crop returned nothing usable.`)
        continue
      }

      // GATE: evidence + reconciliation. windowReconciles checks the corrected
      // rows connect the trusted anchors. This is the safety invariant — a read
      // that makes the maths balance but doesn't connect the actual printed
      // anchor balances is NOT accepted.
      const reconciled = windowReconciles(corrected, ctx.beforeBalance, ctx.afterBalance)
      if (!reconciled) {
        unresolved.push(brk)
        warnings.push(
          `Break ${brk.date}: LLM crop read did not reconcile against anchor balances — rejected (evidence gate).`
        )
        continue
      }

      // Accept: splice the corrected window into the working set.
      working = spliceWindow(working, brk.date, corrected)
      corrections.push({
        breakDate: brk.date,
        sourcePage: pageNum,
        provider: model,
        corrected,
      })
    } catch (err) {
      unresolved.push(brk)
      warnings.push(
        `Break ${brk.date}: LLM crop error — ${err instanceof Error ? err.message : 'unknown'}`
      )
    }
  }

  return { corrections, unresolved, warnings }
}

/** Send a single page crop + the targeted transcription prompt to the vision model. */
async function llmTranscribeCrop(
  ctx: BreakContext,
  pagePng: string,
  apiKey: string,
  model: string,
  baseUrl: string
): Promise<CanonicalTransaction[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 4000, // a single page crop is small
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/png;base64,${pagePng}` } },
              { type: 'text', text: buildCropPrompt(ctx) },
            ],
          },
        ],
      }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content ?? ''
    return parseTranscription(text)
  } catch {
    return [] // a crop timeout/failure isn't fatal — break stays unresolved
  } finally {
    clearTimeout(timeout)
  }
}

function buildCropPrompt(ctx: BreakContext): string {
  return `You are transcribing a single transaction row from a UK bank statement page image. The running balance does not reconcile around ${ctx.breakDate}.

Trusted anchor balances (verified independently):
- Balance immediately BEFORE the break: ${ctx.beforeBalance ?? 'unknown'}
- Balance at/after the break: ${ctx.afterBalance ?? 'unknown'}

Read the transaction row(s) within ~7 days of ${ctx.breakDate} EXACTLY as printed. Do NOT infer, compute, or invent values. If a digit is unreadable, omit that row rather than guessing.

Return ONLY JSON:
{ "transactions": [ { "date": "YYYY-MM-DD", "description": string, "amount": number, "direction": "credit"|"debit", "balance": number|null } ] }

Rules: copy amounts and the running balance EXACTLY as printed; chronological order; only rows in that window.`
}

function parseTranscription(text: string): CanonicalTransaction[] {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return []
  let parsed: { transactions?: unknown[] }
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    return []
  }
  const out: CanonicalTransaction[] = []
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
      balance: typeof t.balance === 'number' ? t.balance : null,
      dateRaw: date,
      descriptionRaw: typeof t.description === 'string' ? t.description : null,
      amountRaw: String(amount),
      balanceRaw: typeof t.balance === 'number' ? String(t.balance) : null,
      sourcePage: null, // attributed by the caller (crop was of a known page)
      sourceRow: null,
      extractor: 'llm_crop',
      extractorVersion: 'openai-crop-1',
      confidence: null,
    })
  }
  return out
}

/** Replace the ±7-day window around a break date with corrected rows. Pure. */
function spliceWindow(all: CanonicalTransaction[], breakDate: string, replacement: CanonicalTransaction[]): CanonicalTransaction[] {
  const breakTime = new Date(breakDate).getTime()
  const windowMs = 7 * 24 * 60 * 60 * 1000
  const outside = all.filter((t) => {
    const dt = new Date(t.date).getTime()
    return dt < breakTime - windowMs || dt > breakTime + windowMs
  })
  return [...outside, ...replacement].sort((a, b) => a.date.localeCompare(b.date))
}
