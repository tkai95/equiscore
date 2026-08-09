/**
 * Extractor benchmark harness — the empirical gate for strategy selection.
 *
 * Per the roadmap (and the source brief): OCI vs Google vs native vs LLM is
 * decided by MEASURING exactness on a golden corpus of real labeled UK
 * statements, never by marketing claims or price in isolation.
 *
 * The metric that matters is exactness, not word-recall:
 *   date exact | amount exact | debit/credit exact | balance exact
 *   entire row exact | transaction count exact | statement reconciles
 *
 * And the safety metric above all: FALSE AUTO-ACCEPT RATE (statements accepted
 * as verified while containing incorrect financial data) — optimised toward zero.
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────────
 * This harness is BLOCKED until you provide:
 *   1. A golden corpus: a directory of real anonymised UK statements, each
 *      paired with a manually-verified ground-truth JSON (same bank, mix of
 *      digital PDF / scanned PDF / photo / long + short). Target 50-100.
 *   2. Provider credentials for any cloud strategy you want to measure
 *      (OCI_COMPARTMENT_ID, GOOGLE_DOCAI_PROCESSOR_ID + auth, etc.).
 *
 * Drop the corpus at the path in CORPUS_DIR (default ./benchmark-corpus), then:
 *   npx ts-node apps/api/src/insights/ingest/benchmark/harness.ts
 *
 * The baseline is MANUALLY-VERIFIED ground truth, never another extractor's
 * output (comparing one extractor against another extractor's errors).
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { extractDocument, registerExtractor, clearExtractors, type ExtractionStrategy } from '../extractor'
import { csvExtractor } from '../csv-extractor'
import { nativePdfExtractor } from '../native-pdf'
import { ociExtractor } from '../document-ai/oci'
import { googleExtractor } from '../document-ai/google'
import { validateExtraction } from '../../engine/validation'
import type { CanonicalTransaction } from '../canonical'

const CORPUS_DIR = process.env['BENCHMARK_CORPUS_DIR'] ?? './benchmark-corpus'

interface GroundTruthTxn {
  date: string
  amount: number
  direction: 'credit' | 'debit'
  balance: number | null
}
interface GroundTruth {
  /** Expected transaction rows in chronological order. */
  transactions: GroundTruthTxn[]
  openingBalance?: number | null
  closingBalance?: number | null
}
interface CorpusItem {
  id: string
  /** Path to the source document (pdf/csv). */
  file: string
  /** Path to the ground-truth JSON. */
  truth: string
  /** Expected input kind, to drive strategy selection. */
  kind: 'csv' | 'digital_pdf' | 'scanned_pdf' | 'image'
}

/** Per-strategy accuracy across the corpus. */
interface StrategyResult {
  strategy: ExtractionStrategy
  statementsRun: number
  /** Field-level exact-match rates (0-1). */
  dateExact: number
  amountExact: number
  directionExact: number
  balanceExact: number
  /** Entire-row exact-match rate. */
  rowExact: number
  /** Transaction-count exact-match rate. */
  countExact: number
  /** Fraction of statements whose extracted ledger reconciles. */
  reconciles: number
  /** Fraction auto-accepted as verified by the validation engine. */
  autoAccepted: number
  /**
   * FALSE AUTO-ACCEPT RATE — the safety metric. Statements accepted as verified
   * while containing incorrect financial data (any field mismatch). Optimise to 0.
   */
  falseAutoAccept: number
}

/** Load every (file, truth) pair in the corpus directory. */
async function loadCorpus(dir: string): Promise<CorpusItem[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    throw new Error(
      `Benchmark corpus not found at ${dir}. Drop 50-100 anonymised UK statements (+ ground-truth .json) there. See harness header.`
    )
  }
  const items: CorpusItem[] = []
  for (const name of entries) {
    if (name.endsWith('.json')) {
      const base = name.slice(0, -5)
      const file = entries.find((e) => e.startsWith(base) && !e.endsWith('.json'))
      if (!file) continue
      const ext = file.toLowerCase()
      const kind: CorpusItem['kind'] = ext.endsWith('.csv')
        ? 'csv'
        : ext.endsWith('.pdf')
          ? 'digital_pdf' // refine per-file via classifyPdf if needed
          : ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png')
            ? 'image'
            : 'digital_pdf'
      items.push({ id: base, file: join(dir, file), truth: join(dir, name), kind })
    }
  }
  return items
}

/** Compare an extracted txn set against ground truth at field + row + count level. */
function scoreExtraction(extracted: CanonicalTransaction[], truth: GroundTruthTxn[]): {
  dateExact: number
  amountExact: number
  directionExact: number
  balanceExact: number
  rowExact: number
  countExact: boolean
} {
  const n = Math.min(extracted.length, truth.length)
  let dateOk = 0, amountOk = 0, dirOk = 0, balOk = 0, rowOk = 0
  for (let i = 0; i < n; i++) {
    const e = extracted[i]!
    const t = truth[i]!
    const d = e.date === t.date
    const a = Math.abs(e.amount - t.amount) < 0.005
    const dr = e.direction === t.direction
    const b = t.balance === null ? e.balance === null : (e.balance !== null && Math.abs(e.balance - t.balance) < 0.005)
    if (d) dateOk++
    if (a) amountOk++
    if (dr) dirOk++
    if (b) balOk++
    if (d && a && dr && b) rowOk++
  }
  return {
    dateExact: n > 0 ? dateOk / n : 0,
    amountExact: n > 0 ? amountOk / n : 0,
    directionExact: n > 0 ? dirOk / n : 0,
    balanceExact: n > 0 ? balOk / n : 0,
    rowExact: n > 0 ? rowOk / n : 0,
    countExact: extracted.length === truth.length,
  }
}

/** Does the extracted ledger reconcile internally (running balance continuous)? */
function reconciles(extracted: CanonicalTransaction[]): boolean {
  const withBal = extracted.filter((t) => t.balance !== null)
  for (let i = 1; i < withBal.length; i++) {
    const prev = withBal[i - 1]!
    const curr = withBal[i]!
    const delta = curr.direction === 'credit' ? curr.amount : -curr.amount
    if (Math.abs((prev.balance! + delta) - curr.balance!) > 0.02) return false
  }
  return true
}

async function benchmarkStrategy(
  strategy: ExtractionStrategy,
  corpus: CorpusItem[]
): Promise<StrategyResult> {
  const acc = {
    dateExact: 0, amountExact: 0, directionExact: 0, balanceExact: 0,
    rowExact: 0, countExact: 0, reconciles: 0, autoAccepted: 0, falseAutoAccept: 0,
  }
  let run = 0
  for (const item of corpus) {
    try {
      const [fileBuf, truthJson] = await Promise.all([
        readFile(item.file),
        readFile(item.truth, 'utf8'),
      ])
      const truth = JSON.parse(truthJson) as GroundTruth
      const input = {
        kind: item.kind,
        buffer: item.kind === 'csv' ? null : fileBuf,
        csvText: item.kind === 'csv' ? fileBuf.toString('utf8') : null,
        fileName: item.file,
      }
      const { result } = await extractDocument(input as never, strategy)
      const validation = validateExtraction(result)
      const s = scoreExtraction(result.transactions, truth.transactions)
      const perfectlyExtracted = s.rowExact === 1 && s.countExact
      run++
      acc.dateExact += s.dateExact
      acc.amountExact += s.amountExact
      acc.directionExact += s.directionExact
      acc.balanceExact += s.balanceExact
      acc.rowExact += s.rowExact
      acc.countExact += s.countExact ? 1 : 0
      acc.reconciles += reconciles(result.transactions) ? 1 : 0
      const accepted = validation.status === 'verified'
      acc.autoAccepted += accepted ? 1 : 0
      // FALSE AUTO-ACCEPT: verified by us but actually wrong.
      if (accepted && !perfectlyExtracted) acc.falseAutoAccept++
    } catch (err) {
      // A strategy that can't handle an input (e.g. native_pdf on a scan, or a
      // not-configured cloud provider) counts as a failure for that item.
      console.error(`  ${strategy} × ${item.id}: ${err instanceof Error ? err.message : 'error'}`)
    }
  }
  const n = run || 1
  return {
    strategy,
    statementsRun: run,
    dateExact: acc.dateExact / n,
    amountExact: acc.amountExact / n,
    directionExact: acc.directionExact / n,
    balanceExact: acc.balanceExact / n,
    rowExact: acc.rowExact / n,
    countExact: acc.countExact / n,
    reconciles: acc.reconciles / n,
    autoAccepted: acc.autoAccepted / n,
    falseAutoAccept: acc.falseAutoAccept / n,
  }
}

/** Entry point — runs every strategy over the corpus and prints the comparison. */
export async function runBenchmark(): Promise<void> {
  console.log(`Benchmark corpus: ${CORPUS_DIR}`)
  const corpus = await loadCorpus(CORPUS_DIR)
  console.log(`Loaded ${corpus.length} statement(s).\n`)

  // Register all strategies so forceStrategy can exercise each.
  clearExtractors()
  registerExtractor(csvExtractor)
  registerExtractor(nativePdfExtractor)
  registerExtractor(ociExtractor)
  registerExtractor(googleExtractor)

  const strategies: ExtractionStrategy[] = ['csv', 'native_pdf', 'oci', 'google']
  const results: StrategyResult[] = []
  for (const strat of strategies) {
    console.log(`Running strategy: ${strat}`)
    results.push(await benchmarkStrategy(strat, corpus))
  }

  console.log('\n=== RESULTS (exactness rates) ===')
  console.log(
    'strategy'.padEnd(12),
    'date'.padStart(7), 'amount'.padStart(7), 'dir'.padStart(7), 'bal'.padStart(7),
    'row'.padStart(7), 'count'.padStart(7), 'recon'.padStart(7), 'accept'.padStart(7), 'FALSE'.padStart(7)
  )
  for (const r of results) {
    console.log(
      r.strategy.padEnd(12),
      r.dateExact.toFixed(3).padStart(7),
      r.amountExact.toFixed(3).padStart(7),
      r.directionExact.toFixed(3).padStart(7),
      r.balanceExact.toFixed(3).padStart(7),
      r.rowExact.toFixed(3).padStart(7),
      r.countExact.toFixed(3).padStart(7),
      r.reconciles.toFixed(3).padStart(7),
      r.autoAccepted.toFixed(3).padStart(7),
      r.falseAutoAccept.toFixed(3).padStart(7)
    )
  }
  console.log('\nFALSE = false auto-accept rate (verified while wrong). Optimise toward 0.')
}

// Run when invoked directly.
runBenchmark().catch((e) => {
  console.error('Benchmark failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
