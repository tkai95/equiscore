/**
 * The extraction strategy abstraction.
 *
 * Every route to a canonical ledger — CSV, native PDF, OCI, Google, LLM crop —
 * implements one `DocumentExtractor`. The dispatcher (`extractDocument`) picks
 * the strategy for a given input; the result is always the provider-neutral
 * `ExtractionResult`, which the validation engine then trusts or rejects.
 *
 * This indirection is deliberate: it lets us swap providers, run bake-offs
 * (benchmark/), and route by input type or geography WITHOUT the scoring or
 * persistence code ever knowing which extractor ran. Provider choice must not
 * leak past this boundary.
 */
import type { ExtractionResult } from './canonical'

/** The five strategies. Kept as a string union so the DB `extractor` column stays flat. */
export type ExtractionStrategy = 'csv' | 'native_pdf' | 'oci' | 'google' | 'llm_crop'

/** Thrown when an extractor is selected but not configured (e.g. OCI with no keys). */
export class ProviderNotConfigured extends Error {
  constructor(
    message: string,
    /** Stable machine code for the job state machine, e.g. 'needs_better_source'. */
    readonly failureStage:
      | 'needs_better_source'
      | 'unsupported_format'
      | 'unresolved_extraction'
      | 'provider_error'
  ) {
    super(message)
    this.name = 'ProviderNotConfigured'
  }
}

/**
 * What an extractor receives. `kind` is the classifier's verdict (csv | digital_pdf
 * | scanned_pdf | image | unknown); the strategy decides whether it can handle
 * that kind. Keeping the raw bytes + text here means extractors don't re-read the
 * file or re-classify.
 */
export interface ExtractorInput {
  kind: 'csv' | 'digital_pdf' | 'scanned_pdf' | 'image' | 'unknown'
  /** Raw file bytes (PDF or image). Null for CSV, which is text. */
  buffer: Buffer | null
  /** CSV text. Null for binary inputs. */
  csvText: string | null
  /** Original filename, for diagnostics only — never trusted for routing. */
  fileName: string | null
}

export interface DocumentExtractor {
  /** Which strategy this is. */
  readonly strategy: ExtractionStrategy
  /** Whether this extractor can handle the classified input kind. */
  canHandle(input: ExtractorInput): boolean
  /** Extract canonical transaction candidates + metadata. MUST NOT mutate input. */
  extract(input: ExtractorInput): Promise<ExtractionResult>
}

/**
 * Registry of available extractors, in preference order. The dispatcher picks
 * the first that `canHandle` the input. Strategies register themselves here as
 * they're implemented; the order encodes the "cheapest correct path wins" rule
 * from the roadmap (csv + native_pdf first; cloud OCR only for scans).
 */
const registry: DocumentExtractor[] = []

export function registerExtractor(extractor: DocumentExtractor): void {
  // Replace any existing entry for the same strategy (idempotent on re-import).
  const i = registry.findIndex((e) => e.strategy === extractor.strategy)
  if (i >= 0) registry[i] = extractor
  else registry.push(extractor)
}

/** Test seam: clear the registry (benchmark/harness resets between strategies). */
export function clearExtractors(): void {
  registry.length = 0
}

/** List registered strategies (for diagnostics / benchmarking). */
export function registeredStrategies(): ExtractionStrategy[] {
  return registry.map((e) => e.strategy)
}

/**
 * Dispatch extraction for a classified input. Returns the first registered
 * extractor that can handle it. Throws `ProviderNotConfigured` if a handler
 * exists but isn't configured (e.g. a scan with no cloud keys), so the caller
 * can surface a clean "please upload a digital PDF or CSV" rather than a fake
 * "couldn't read".
 */
export async function extractDocument(
  input: ExtractorInput,
  /** Force a specific strategy (benchmarking). If omitted, auto-selects. */
  forceStrategy?: ExtractionStrategy
): Promise<{ result: ExtractionResult; strategy: ExtractionStrategy }> {
  const chosen = forceStrategy
    ? registry.find((e) => e.strategy === forceStrategy)
    : registry.find((e) => e.canHandle(input))

  if (!chosen) {
    // No extractor can handle this kind. Map to a clean failure stage.
    const stage =
      input.kind === 'scanned_pdf' || input.kind === 'image'
        ? 'needs_better_source'
        : 'unsupported_format'
    throw new ProviderNotConfigured(
      stage === 'needs_better_source'
        ? 'Scanned statements need a cloud OCR provider, which is not configured. Please upload a digital PDF or CSV export.'
        : `No extractor configured for input kind '${input.kind}'.`,
      stage
    )
  }
  const result = await chosen.extract(input)
  return { result, strategy: chosen.strategy }
}
