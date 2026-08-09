# Statement Ingestion & Verification — Roadmap

This document is the engineering plan for replacing the LLM-first bank-statement
extraction pipeline with a **deterministic-first ingestion and verification
engine**. It is the source of truth for what's being built, in what order, and
— importantly — what is deliberately **not** being built yet and why.

> If the code and this document disagree, **the code is the source of truth —
> then update this document in the same PR.**

---

## The principle

> **Never use reasoning to replace evidence when evidence can be extracted
> directly.**

A bank statement is structured data on a page. Reading its digits is a
**transcription** task, not a semantic one. The old pipeline asked a vision LLM
to transcribe every digit and then built elaborate machinery (self-healing,
cross-checks) to repair its mistakes. That inverts the right tool for the job
and is the root cause of every "figures don't add up" failure we've shipped
against.

The new architecture separates four responsibilities that must never be
collapsed into one LLM call:

1. **Extraction** — what did the document say? (deterministic where possible)
2. **Validation** — can we prove our extraction is internally consistent?
3. **Source assurance** — how trustworthy is the source itself?
4. **AI analysis** — what does the financial behaviour *mean*? (LLM, post-validation)

---

## The five strategies

```
extractDocument(document, strategy)
  ├─ csv           → own parser                          ~£0 / document
  ├─ native_pdf    → pdfjs text + x/y → rows             ~£0 / document
  ├─ oci           → cheap OCR → parser → reconcile?     pennies / page
  ├─ google        → (benchmark alternative)              pennies / page
  └─ llm_fallback  → targeted vision CROP of suspect row  tiny targeted call
```

- **CSV** and **Digital PDF** are the ~£0 routes — own parser + own
  text/coordinate extraction. These cover the large majority of real
  bank-downloaded statements.
- **Scans / photos** are the minority route and the only place a paid cloud
  provider enters. Per the brief: don't one-shot it — **cascade**.

### The scan cascade

```
scan/photo
   ↓ cheap OCR
   ↓ our bank-table parser
   ↓ does it reconcile?
   │
   ├─ YES → done (no expensive extractor, no LLM)
   │
   └─ NO
       ↓ better layout extractor (OCI / Google)
       ↓ does it reconcile?
       │
       ├─ YES → done
       │
       └─ NO
           ↓ targeted LLM vision crop (the single failing row only)
           ↓ unresolved? → UNRESOLVED_EXTRACTION (never synthetic rows)
```

Cheap OCR + reconcile-check handles the common case for cents. Only the
*failing region* escalates — a 600-transaction statement with one bad row
spends one cheap OCR pass plus one tiny targeted LLM crop, not a full-document
LLM read.

### Why these providers (and not others)

- **OCI Document Understanding** — extremely attractive economics (5,000 free
  transactions/month; OCR ~$1.31/1,000; full extraction ~$13.11/1,000). Strong
  default candidate for the scan cascade.
- **Google Document AI / Layout Parser** — the benchmark alternative. OCR alone
  is ~$1.50/1,000 pages; full Layout Parser ~$10/1,000.
- **AWS Textract** — deliberately **excluded** for now. Not uniquely useful for
  bank tables and priced higher than the alternatives. Revisit only if a
  benchmark proves it materially more accurate.
- **Self-hosted OCR (PaddleOCR / PP-Structure)** — deliberately **deferred**.
  At realistic volume (~2,000 OCR pages/month) cloud is ~$20/month; not worth
  the engineering and financial-correctness risk of maintaining our own OCR
  stack. Revisit at high scale.

> **Provider selection is empirical, not philosophical.** OCI vs Google is
> decided by the benchmark below on real labeled UK statements — not by
> marketing claims or who's cheaper in isolation.

---

## The benchmark (acceptance bar, not word-recall)

The metric that matters is **exactness**, measured per strategy against a golden
corpus of 50–100 real anonymised UK statements with manually-verified ground
truth:

- **date** exact match
- **amount** exact match
- **debit/credit direction** exact match
- **balance** exact match
- **entire row** exact match
- **transaction count** exact match
- **statement reconciles** (running balance + opening/closing)

And the safety metric above all:

- **FALSE AUTO-ACCEPT RATE** — statements accepted as verified while containing
  incorrect financial data. Optimise toward zero.

The baseline is **manually-verified source statements**, never the existing
Claude output (comparing one extractor against another extractor's errors).

---

## Current-state gaps (confirmed from the code)

These are what the rewrite fixes:

1. **LLM is the primary transcriber.** Every PDF goes through Claude vision for
   digit transcription. No native text-layer extraction exists (`getTextContent`
   has zero usage; pdfjs-dist is only used to *render*). This is the root cause
   of the recurring digit-misread failures.
2. **Running balance is verified at ingest then dropped.** `NormalizedTxn.balance`
   is checked by `checkBalanceContinuity` but **never persisted** —
   `BankTransaction` has no balance column. Once ingested, ledger continuity is
   unverifiable from the database.
3. **No provenance.** No source page/row, no bounding box, no extractor version,
   no source-assurance field. A value `£53.20` exists with `source = null`.
4. **"Whichever reconciles wins."** The self-healing accepts a correction if it
   makes the maths balance — explicitly forbidden by the safety rules below. A
   value must be trusted on *source evidence*, not arithmetic.
5. **Flat job status, not a state machine.** `processing|completed|failed` can't
   distinguish "extracting" from "validating" from "stuck." Failures surface as a
   generic "couldn't read your statement," masking the real failure class.

---

## Safety invariants (must not break)

Carried from the source brief and enforced in code:

- **No synthetic transactions.** If `opening + known transactions != closing`,
  the system records `unexplained difference = £X` but never inserts a fake
  `Unknown transaction -£X`. Status → `UNRESOLVED_EXTRACTION`.
- **A correction requires source evidence + reconciliation, not just arithmetic.**
  Arithmetic compatibility ≠ source verification. A correction record retains
  the original value, the replacement, the supporting providers, and the source
  location (page/row).
- **The scoring gate requires `verified`.** `persistStatement` refuses to score
  anything whose `validation.status !== 'verified'`. No partial statement
  contributes to a Trust Score.
- **AI cannot author factual ledger fields.** Semantic enrichment (merchant,
  category, income probability) lives in a separate layer and can never mutate
  `amount`/`date`/`balance`/`currency`.

---

## Build phases (in order)

Each phase is committed separately so it's reviewable and revertable. This
section's "Shipped" entries update as each lands.

### Shipped
_(none yet — build in progress)_

### In progress

- **Phase 1 — Canonical ledger + validation engine + schema.** Provider-neutral
  `CanonicalTransaction` / `ExtractionResult` / `ValidationResult` types.
  Multi-layer validation (structural, completeness, deduplication by row-identity,
  balance-continuity in minor currency, statement-level opening/closing, dates,
  metadata, provenance coverage). Schema migration: `BankTransaction.balance` +
  provenance columns; `StatementImportJob.stage` state machine + `validation` +
  `sourceAssurance`. This is pure backend, no external deps, and immediately
  improves safety even before extractors change.

### Upcoming

- **Phase 2 — `extractDocument` dispatcher + CSV route.** The strategy
  abstraction (`DocumentExtractor` interface, `extractDocument(input, strategy)`).
  CSV extractor wraps the existing deterministic `parseStatementCsv`, now
  returning `ExtractionResult` and routing through the new validator.

- **Phase 3 — Native PDF text-layer extraction.** `classifyPdf` (digital /
  scanned / mixed via per-page text density) + `extractNativePdf` (pdfjs
  `getTextContent` + positional grouping into rows/columns, header detection,
  page-checkpointed for the 600-transaction case). This is the single
  highest-value change: eliminates the LLM-digit-misread class for digital PDFs.

- **Phase 4 — Delete the Claude-primary path.** Remove `extractTransactionsFromLargePdf`,
  the self-healing, the cross-check, the rasterizer, the `@napi-rs/canvas` dep,
  and the webpack externals. Rewire `runPdfImportJob` to the new pipeline:
  classify → extract(strategy) → normalise → validate → resolve → persist-verified.

- **Phase 5 — Scan adapters (configured-on-demand stubs).** `document-ai/oci.ts`
  and `document-ai/google.ts` implementing the `DocumentExtractor` interface,
  throwing `ProviderNotConfigured` until env keys exist. The cheap-OCR → parser
  → reconcile → escalate cascade is wired through them. A scanned upload with
  no keys returns a clean `needs_better_source` rejection — never a fake
  "couldn't read."

- **Phase 6 — LLM as last-resort crop.** `exception-resolver.ts`: when cheap OCR
  + better extractor both fail a row, send ONLY the suspect page crop to a
  vision model for transcription. Corrections require source evidence +
  reconciliation (Invariant 2). Semantic categorisation (`classifyTransaction`)
  stays — post-validation, can't mutate ledger fields.

- **Phase 7 — Benchmark harness.** `benchmark/` loads the golden corpus and
  measures each strategy on the exactness metrics above. Runs the moment a
  corpus is dropped in; until then it's the gate for OCI-vs-Google selection.

---

## BLOCKED (needs external assets I don't have)

These are not engineering gaps — they need things only you can provide. Each is
built up to the point where the unblock is "add keys / drop in data."

- **OCI vs Google selection.** Needs your cloud account keys (`OCI_*` /
  `GOOGLE_*`) **and** a golden corpus of 50–100 anonymised UK statements with
  manually-verified transactions. The adapters and harness are built; the
  bake-off itself is the gate.
- **Confidence-threshold calibration.** Provider confidence ≠ correctness (§25).
  Thresholds must be calibrated against the labeled corpus, not assumed.
- **Internal review UI for `NEEDS_ATTENTION`.** Separate frontend work — display
  source crop, extracted row, alternate reads, balance context, approve/reject.
  Not in scope for this backend pass.
- **Self-hosted OCR.** Deferred on cost grounds (~$20/mo cloud vs engineering
  risk). Revisit at high scale.

---

## Why this shape

- **Cheapest correct path wins.** CSV ~£0; digital PDF ~£0; cheap OCR handles
  most scans for cents; escalation is per-failing-row, not per-document.
- **Resilient by construction.** Validation is independent of the extractor, so
  a provider swap never silently changes correctness semantics. Page
  checkpoints mean a 600-row statement isn't one fragile task.
- **Auditable.** Every transaction carries source provenance (page/row/extractor/
  version); every correction carries an evidence record; every stage transition
  is an audit event.
- **Honest about LLM.** The LLM is demoted from primary transcriber to
  last-resort row resolver + post-validation semantic analyser — the two places
  it genuinely adds value.
