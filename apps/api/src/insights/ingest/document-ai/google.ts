/**
 * Google Document AI adapter.
 *
 * WHY Google as a scan-route candidate: strong layout/table extraction; OCR-only
 * ~$1.50/1k pages, Layout Parser ~$10/1k. The benchmark alternative to OCI.
 *
 * STATUS: STUB. `isConfigured` returns false until Google credentials are
 * present (GOOGLE_APPLICATION_CREDENTIALS or the Document AI processor env
 * vars). When unconfigured the dispatcher skips it and scans reject cleanly.
 *
 * Same pattern as oci.ts: the cascade wiring is complete in common.ts; the live
 * SDK calls are BLOCKED on credentials. Selection vs OCI is EMPIRICAL (roadmap
 * benchmark) — do not assume Google wins.
 *
 * Per the brief, we deliberately do NOT build an AWS Textract adapter: not
 * uniquely useful for bank tables and priced higher.
 */
import { makeProviderExtractor, type ProviderAdapter } from './common'

const GOOGLE_VERSION = 'google-stub-1'

function isConfigured(): boolean {
  // Google auth via standard ADC (GOOGLE_APPLICATION_CREDENTIALS) + a processor
  // id/project. Treat the processor id as the configured signal.
  return Boolean(
    process.env['GOOGLE_DOCAI_PROCESSOR_ID']?.trim() &&
      (process.env['GOOGLE_APPLICATION_CREDENTIALS']?.trim() ||
        process.env['GOOGLE_DOCAI_KEY']?.trim())
  )
}

export const googleAdapter: ProviderAdapter = {
  strategy: 'google',
  isConfigured,
  version: () => GOOGLE_VERSION,
  cheapOcr: async (_buffer) => {
    if (!isConfigured()) {
      throw new Error('Google Document AI not configured — cannot run cheap OCR.')
    }
    // BLOCKED: call Document AI processDocument with an OCR-only processor
    // (e.g. the general "OCR" processor). Return OcrPage[] per page.
    throw new Error(
      'Google cheap OCR integration pending — provide credentials + processor id.'
    )
  },
  layoutExtract: async (_buffer) => {
    if (!isConfigured()) {
      throw new Error('Google Document AI not configured — cannot run layout extraction.')
    }
    // BLOCKED: call the Layout Parser (or Bank Statement Parser) processor.
    // Return LayoutRow[] keyed by column role. Note: the Bank Statement Parser
    // is intentionally NOT the default — per the brief, cheap OCR → our parser
    // → reconcile first; only escalate to a paid layout/bank parser on failure.
    throw new Error(
      'Google layout extraction pending — provide credentials + processor id.'
    )
  },
}

export const googleExtractor = makeProviderExtractor(googleAdapter)
