/* eslint-disable no-console */
/** Verify the fix: build the insight profile from real DB transactions (now
 *  with category threaded through) and confirm the rent commitment appears. */
import { Client } from 'pg'
import { buildInsightProfile } from './index'
import type { NormalizedTxn } from './types'

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const conn = await c.query(`SELECT id, user_id FROM bank_connections WHERE provider_name='statement_upload' ORDER BY created_at DESC LIMIT 1`)
  const { id: connId, user_id: userId } = conn.rows[0]

  // Load txns WITH category (the fix)
  const rows = await c.query(
    `SELECT t.booked_at, t.amount, t.direction, t.description, t.merchant_name, t.bank_account_id, t.category, t.balance
     FROM bank_transactions t JOIN bank_accounts a ON a.id = t.bank_account_id
     WHERE a.bank_connection_id = $1 ORDER BY t.booked_at ASC`,
    [connId],
  )
  await c.end()

  const txns: NormalizedTxn[] = rows.rows.map((t) => ({
    date: new Date(t.booked_at).toISOString().slice(0, 10),
    amount: Math.abs(Number(t.amount)),
    direction: t.direction,
    description: t.description,
    merchantName: t.merchant_name,
    accountId: t.bank_account_id,
    balance: t.balance !== null ? Number(t.balance) : null,
    category: t.category, // ← the fix
  }))
  console.log(`${txns.length} txns loaded, ${txns.filter((t) => t.category && t.category !== 'other').length} with a real category`)

  const profile = buildInsightProfile(txns, { source: 'statement_upload' })

  // The key check: does the rent commitment now appear?
  const rent = profile.commitments.find((cm) => cm.category === 'rent_payment')
  console.log(`\n=== RENT COMMITMENT ===`)
  if (rent) {
    console.log(`  FOUND: ${rent.name} — £${rent.amount}/mo, cadence=${rent.cadence}, occurrences=${rent.occurrences}, consistency=${rent.consistency}`)
  } else {
    console.log(`  NOT FOUND — rent still missing. Bug not fully fixed.`)
  }

  console.log(`\n affordability.currentRent: ${profile.affordability.currentRent}`)
  console.log(` affordability.rentToIncome: ${profile.affordability.ratios.rentToIncome}`)

  console.log(`\n=== ALL COMMITMENTS (${profile.commitments.length}) ===`)
  for (const cm of profile.commitments.slice(0, 12)) {
    console.log(`  [${cm.category.padEnd(16)}] ${cm.name.slice(0, 35).padEnd(35)} £${cm.amount.toFixed(2)}/mo  (${cm.cadence}, ${cm.occurrences}x)`)
  }
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
