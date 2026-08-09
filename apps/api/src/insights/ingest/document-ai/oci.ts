/**
 * OCI Document Understanding adapter.
 *
 * WHY OCI as a scan-route candidate: extremely attractive economics (5,000 free
 * transactions/month; OCR ~$1.31/1k; full extraction ~$13.11/1k). Strong
 * default for the cheap-OCR-first cascade.
 *
 * STATUS: STUB. `isConfigured` returns false until OCI credentials are present
 * in env (OCI_COMPARTMENT_ID + OCI config). When unconfigured the dispatcher
 * skips this strategy and a scan rejects cleanly as `needs_better_source`.
 *
 * The cascade wiring (cheapOcr → layoutExtract → canonical) is complete in
 * common.ts; implementing cheapOcr/layoutExtract against the live OCI SDK is
 * BLOCKED on you providing cloud credentials (see STATEMENT_INGESTION_ROADMAP
 * §BLOCKED). The benchmark harness exercises this the moment keys + corpus land.
 *
 * Selection between OCI and Google is EMPIRICAL (roadmap benchmark), not
 * hardwired — do not assume OCI wins.
 */
import { makeProviderExtractor, type ProviderAdapter } from './common'

const OCI_VERSION = 'oci-stub-1'

function isConfigured(): boolean {
  // OCI auth is compartment + user/tenancy config. Treat presence of the
  // compartment id as the "configured" signal (the rest lives in standard OCI
  // config locations or OCI_CONFIG env). Keep this conservative: if we're not
  // sure it's configured, we must NOT claim to handle scans.
  return Boolean(process.env['OCI_COMPARTMENT_ID']?.trim())
}

export const ociAdapter: ProviderAdapter = {
  strategy: 'oci',
  isConfigured,
  version: () => OCI_VERSION,
  cheapOcr: async (_buffer) => {
    if (!isConfigured()) {
      throw new Error('OCI not configured — cannot run cheap OCR.')
    }
    // BLOCKED: integrate @oci-sdk (or the OCI REST AnalyzeDocument action with
    // featureType=TEXT). Return OcrPage[] per page. Until then this throws and
    // the cascade escalates / rejects.
    throw new Error(
      'OCI cheap OCR integration pending — provide OCI credentials and implement the SDK call.'
    )
  },
  layoutExtract: async (_buffer) => {
    if (!isConfigured()) {
      throw new Error('OCI not configured — cannot run layout extraction.')
    }
    // BLOCKED: AnalyzeDocument with featureType=TABLES + TEXT. Return LayoutRow[]
    // keyed by column role. Until then this throws → provider_error stage.
    throw new Error(
      'OCI layout extraction pending — provide OCI credentials and implement the SDK call.'
    )
  },
}

export const ociExtractor = makeProviderExtractor(ociAdapter)
