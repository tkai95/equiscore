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

- **Phase 1 — Canonical ledger + validation engine + schema.** Provider-neutral
  `CanonicalTransaction` / `ExtractionResult` / `ValidationResult` types;
  8-layer validation engine (structural, completeness, deduplication,
  running-balance, statement-level, dates, metadata, provenance coverage).
  Schema migration applied: `BankTransaction.balance` + provenance columns;
  `StatementImportJob.stage` state machine + `validation` + `sourceAssurance`.
- **Phase 2-3 — `extractDocument` dispatcher + CSV + native-PDF.** Strategy
  abstraction; CSV wraps the deterministic parser; native-PDF reads the PDF's
  own text layer via pdfjs `getTextContent` + positional grouping (the ~£0
  route that eliminates the LLM-digit-misread class for digital PDFs).
- **Phase 4 — Deleted the Claude-primary path.** `pdf-extractor.ts` (all the
  extraction + self-healing) and `cross-check.ts` removed; `−1015` lines. CSV +
  PDF now flow through the deterministic-first pipeline.
- **Phase 5 — Scan adapters + LLM last-resort crop.** OCI + Google adapters
  (fail closed until credentials); exception resolver crops the suspect PAGE
  only and accepts corrections with evidence + reconciliation, never arithmetic
  alone.
- **Phase 6 — Rewired job runners.** Both inputs run classify → extract →
  validate → resolve → persist-verified. Real stage transitions + audit events;
  failures surface their true class. `persistVerifiedLedger` persists balance +
  provenance and only runs after `validation.status === 'verified'` (scoring
  gate). Scanned PDFs reject cleanly as `needs_better_source` until cloud keys.
- **Phase 7 — Benchmark harness.** `benchmark/harness.ts` measures each strategy
  on date/amount/direction/balance/row/count exact + reconciles + **false
  auto-accept rate**. Runs the moment a golden corpus is dropped in.

### Notes on what shipped vs. the original plan

- The rasterizer (`pdf-render.ts` + `@napi-rs/canvas`) was **retained**, not
  deleted as the original Phase 4 plan said — the LLM last-resort crop resolver
  needs page images for the vision model. The webpack externals for it stay too.
- AWS Textract was never built (deliberately excluded per the brief).
- Self-hosted OCR (PaddleOCR) remains deferred on cost grounds.

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
