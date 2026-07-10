import type { DocumentType } from '@equiscore/shared'
import { documentFamily, namesMatch, type ExtractedFields, type ProfileFacts } from './document-claims'
import { expectedNetFromGross } from '../insights/engine/tax'

/**
 * Basic anomaly checks — "things that just don't line up". This is not forgery
 * forensics; it's cheap cross-source corroboration that a skilled edit still has
 * to survive: does the document agree with the other evidence we already hold
 * (the connected bank feed, the profile) and with itself (arithmetic, dates)?
 *
 * The strongest signals come from data a fraudster can't easily fake in sync —
 * a payslip's net pay has to actually appear as a payment in the real bank feed,
 * and the name has to match the real account holder.
 */

const DAY = 24 * 60 * 60 * 1000

export type AnomalySeverity = 'high' | 'medium' | 'low'

export interface Anomaly {
  code: string
  severity: AnomalySeverity
  message: string
}

export interface AnomalyContext {
  profile: ProfileFacts
  /** Name on the connected bank account, if any. */
  bankAccountHolderName: string | null
  /** Recent credit amounts from the connected bank (for income reconciliation). */
  bankCredits: number[]
  /** Whether we have any bank transactions to reconcile against. */
  hasBankData: boolean
  now: Date
}

function parse(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function ageYears(dob: Date, now: Date): number {
  return (now.getTime() - dob.getTime()) / (365.25 * DAY)
}

export function detectAnomalies(type: DocumentType, f: ExtractedFields, ctx: AnomalyContext): Anomaly[] {
  const out: Anomaly[] = []
  const family = documentFamily(type)
  const docDate = parse(f.documentDate) ?? parse(f.payDate)

  // ── Age plausibility from the date of birth ──────────────────────────────────
  const dob = parse(f.dateOfBirth)
  if (dob) {
    const age = ageYears(dob, ctx.now)
    if (age < 18) {
      out.push({ code: 'underage', severity: 'high', message: 'The date of birth indicates the holder is under 18.' })
    } else if (age > 120) {
      out.push({ code: 'implausible_age', severity: 'high', message: 'The date of birth on this document is not plausible.' })
    }
  }

  // ── Future-dated document ────────────────────────────────────────────────────
  if (docDate && docDate.getTime() > ctx.now.getTime() + DAY) {
    out.push({ code: 'future_dated', severity: 'medium', message: 'This document is dated in the future.' })
  }

  // ── Name on the document vs the real bank account holder ─────────────────────
  // A cross-source check: the strongest identity signal is that independent
  // sources name the same person.
  if (ctx.bankAccountHolderName && f.fullName && namesMatch(f.fullName, ctx.bankAccountHolderName) === false) {
    out.push({
      code: 'name_bank_mismatch',
      severity: 'high',
      message: 'The name on this document does not match the name on your connected bank account.',
    })
  }

  // ── Income document reconciliation against the bank feed ─────────────────────
  // A payslip's net pay should actually appear as a payment that landed. This is
  // the hardest thing to fake, because it requires a matching real credit.
  if (family === 'income' && ctx.hasBankData && f.netPay && f.netPay > 0) {
    const tolerance = Math.max(75, f.netPay * 0.12)
    const matched = ctx.bankCredits.some((amount) => Math.abs(amount - f.netPay!) <= tolerance)
    if (!matched) {
      out.push({
        code: 'income_not_in_bank',
        severity: 'high',
        message: 'The pay shown on this document does not appear as a matching payment in your bank account.',
      })
    }
  }

  // ── Payslip internal arithmetic ──────────────────────────────────────────────
  // Take-home can never exceed gross minus income tax and NI. If it does, the
  // figures have been altered. Generous buffer so the monthly/annual split and
  // legitimate deductions never trip a false positive.
  if (family === 'income' && f.grossPay && f.netPay && f.grossPay > 0) {
    const expectedMonthlyNet = expectedNetFromGross(f.grossPay * 12) / 12
    if (f.netPay > expectedMonthlyNet * 1.1) {
      out.push({
        code: 'net_exceeds_takehome',
        severity: 'medium',
        message: 'The take-home pay is higher than the gross figure allows after tax and National Insurance.',
      })
    }
  }

  // ── Stale proof of address ───────────────────────────────────────────────────
  if (family === 'address' && docDate) {
    const monthsOld = (ctx.now.getTime() - docDate.getTime()) / (30 * DAY)
    if (monthsOld > 3) {
      out.push({
        code: 'stale_address_doc',
        severity: 'low',
        message: 'This address document is more than 3 months old; proof of address is usually required to be recent.',
      })
    }
  }

  return out
}

/** Whether any anomaly is serious enough to hold a document back from "verified". */
export function hasBlockingAnomaly(anomalies: Anomaly[]): boolean {
  return anomalies.some((a) => a.severity === 'high')
}
