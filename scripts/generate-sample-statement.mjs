#!/usr/bin/env node
/**
 * Generates a realistic 14-month UK current-account statement fixture for the
 * insight-profile engine. Deterministic (seeded) so runs are reproducible.
 *
 *   node scripts/generate-sample-statement.mjs
 *
 * Deliberately includes hard cases:
 *   - a salary with NO "salary" keyword ("BACS CREDIT BRIGHT CARE LTD")
 *   - rent to a lettings agent, council tax, utilities, mobile, a gym
 *   - a gym direct debit returned once, then re-paid late
 *   - a recurring transfer to an individual (rent? family support? — ambiguous)
 *   - a large one-off transfer to a named person
 *   - an international transfer (possibly to the customer's own account)
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../apps/api/src/insights/fixtures/sample-statement.json')

// Deterministic PRNG (mulberry32) so the fixture never changes between runs.
let seed = 20260707
const rnd = () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const jitter = (n, pct) => Math.round(n * (1 + (rnd() - 0.5) * 2 * pct) * 100) / 100
const dayShift = (max) => Math.floor(rnd() * (max * 2 + 1)) - max

const iso = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, Math.max(1, Math.min(28, d))))
  return dt.toISOString().slice(0, 10)
}

const txns = []
const add = (date, amount, direction, description) =>
  txns.push({ date, amount: Math.round(amount * 100) / 100, direction, description })

// Apr 2025 → May 2026 inclusive (14 months)
const months = []
for (let i = 0; i < 14; i++) {
  const m = 4 + i
  months.push({ y: 2025 + Math.floor((m - 1) / 12), m: ((m - 1) % 12) + 1 })
}

for (const [idx, { y, m }] of months.entries()) {
  // ── Income ────────────────────────────────────────────────────────────────
  // Salary with no "salary" keyword — behavioural detection must catch this.
  add(iso(y, m, 28 + dayShift(1)), jitter(2760, 0.01), 'credit', 'BACS CREDIT BRIGHT CARE LTD')

  // Gig top-up in 9 of the 14 months.
  if (idx % 3 !== 2) {
    add(iso(y, m, 14 + dayShift(3)), jitter(180, 0.35), 'credit', 'UBER EATS PAYOUT')
  }

  // ── Committed outgoings ───────────────────────────────────────────────────
  add(iso(y, m, 2 + dayShift(1)), 1100, 'debit', 'OPENRENT LTD REF 88213')
  add(iso(y, m, 1), 148, 'debit', 'CAMDEN COUNCIL TAX DD')
  add(iso(y, m, 6 + dayShift(2)), jitter(86, 0.06), 'debit', 'BRITISH GAS ENERGY DD')
  add(iso(y, m, 15 + dayShift(2)), 42, 'debit', 'THAMES WATER DD')
  add(iso(y, m, 15 + dayShift(1)), 28, 'debit', 'VODAFONE LTD DD')
  add(iso(y, m, 22 + dayShift(1)), 10.99, 'debit', 'NETFLIX.COM')

  // Gym: returned once (Feb 2026), then re-presented four days later.
  if (y === 2026 && m === 2) {
    add(iso(y, m, 3), 45, 'credit', 'PUREGYM DD RETURNED UNPAID')
    add(iso(y, m, 7), 45, 'debit', 'PUREGYM LTD DD')
  } else {
    add(iso(y, m, 3 + dayShift(1)), 45, 'debit', 'PUREGYM LTD DD')
  }

  // Recurring transfer to an individual — rent to a private landlord, or
  // family support? The engine must ask rather than assume.
  add(iso(y, m, 5 + dayShift(1)), 480, 'debit', 'TRANSFER TO J SMITH')

  // ── Living costs ──────────────────────────────────────────────────────────
  for (let w = 0; w < 4; w++) {
    add(iso(y, m, 4 + w * 7 + dayShift(1)), jitter(90, 0.3), 'debit', 'TESCO STORES 3411')
  }
  for (let w = 0; w < 3; w++) {
    add(iso(y, m, 3 + w * 9), jitter(40, 0.25), 'debit', 'TFL TRAVEL CHARGE')
  }
  add(iso(y, m, 18 + dayShift(2)), jitter(60, 0.4), 'debit', 'ATM WITHDRAWAL LINK')
  add(iso(y, m, 24 + dayShift(3)), jitter(35, 0.6), 'debit', 'PRET A MANGER')
}

// ── One-off items that require context ──────────────────────────────────────
add('2026-02-12', 2600, 'debit', 'TRANSFER TO J OKAFOR')
add('2026-03-03', 900, 'debit', 'WISE PAYMENT REF 4471')

// ── Ledger: attach a running balance (statements carry this; Open Banking doesn't)
txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
let balance = 1850
for (const t of txns) {
  balance += t.direction === 'credit' ? t.amount : -t.amount
  t.balance = Math.round(balance * 100) / 100
}

const payload = {
  source: 'statement_upload',
  accountHolderName: 'Amara Okafor',
  profileName: 'Amara Okafor',
  transactions: txns,
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(payload, null, 2))
console.log(`Wrote ${txns.length} transactions across 14 months → ${OUT}`)
console.log(`Closing balance: £${balance.toFixed(2)}`)
