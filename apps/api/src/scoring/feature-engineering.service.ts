import { Injectable } from '@nestjs/common'
import { db } from '@equiscore/database'
import type { TrustFeatures } from '@equiscore/shared'
import { DEFAULT_FEATURES } from '@equiscore/shared'
import { buildInsightProfile } from '../insights/engine'
import type { NormalizedTxn } from '../insights/engine'

export interface EvidenceExclusion {
  connectionIds?: string[]
  documentIds?: string[]
}

@Injectable()
export class FeatureEngineeringService {
  /**
   * Compute features from a user's evidence.
   *
   * `exclude` lets a caller ask "what would the features be *without* this bank
   * connection or document" — the basis for a deletion-impact preview. It is a
   * pure read; nothing is persisted.
   */
  async computeFeatures(userId: string, exclude?: EvidenceExclusion): Promise<TrustFeatures> {
    const excludeConnectionFilter =
      exclude?.connectionIds && exclude.connectionIds.length > 0
        ? { id: { notIn: exclude.connectionIds } }
        : {}
    const excludeDocumentFilter =
      exclude?.documentIds && exclude.documentIds.length > 0
        ? { id: { notIn: exclude.documentIds } }
        : {}

    const [user, bankConnections, documents, rentalProfile] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          addresses: { where: { isCurrent: true } },
        },
      }),
      db.bankConnection.findMany({
        where: { userId, connectionStatus: 'active', ...excludeConnectionFilter },
        include: {
          bankAccounts: {
            include: {
              transactions: { orderBy: { bookedAt: 'desc' } },
              directDebits: true,
              standingOrders: true,
            },
          },
        },
      }),
      db.uploadedDocument.findMany({ where: { userId, ...excludeDocumentFilter } }),
      db.rentalProfile.findFirst({ where: { userId, isCurrent: true } }),
    ])

    const features: TrustFeatures = { ...DEFAULT_FEATURES }

    // ── Profile completeness ──────────────────────────────────────────────────
    const profile = user?.profile
    if (profile) {
      const fields = [
        profile.fullName,
        profile.dob,
        profile.nationality,
        profile.residencyStatus,
        profile.employmentType,
      ]
      const filled = fields.filter(Boolean).length
      features.profileFieldsComplete = filled / fields.length

      features.residencyStatus = profile.residencyStatus ?? null

      if (profile.ukMoveDate) {
        const msPerYear = 1000 * 60 * 60 * 24 * 365.25
        features.yearsInUK = (Date.now() - new Date(profile.ukMoveDate).getTime()) / msPerYear
      } else if (profile.residencyStatus === 'british_citizen') {
        features.yearsInUK = 20
      }
    }

    // ── Banking features ──────────────────────────────────────────────────────
    const allAccounts = bankConnections.flatMap((c) => c.bankAccounts)
    const allTransactions = allAccounts.flatMap((a) => a.transactions)

    features.openBankingConnected = bankConnections.length > 0
    features.connectedAccountsCount = allAccounts.length

    if (allTransactions.length > 0) {
      // Source the banking signals from the SAME deterministic engine the
      // Insights page uses, so the Trust Score reflects that behavioural analysis
      // (stream-based income, behavioural salary/rent detection, detected
      // rent-to-income) rather than a second, cruder keyword pass. This is what
      // makes the number a landlord sees agree with the profile they see.
      const normTxns: NormalizedTxn[] = allTransactions.map((t) => ({
        date: t.bookedAt.toISOString().slice(0, 10),
        amount: Math.abs(t.amount),
        direction: t.direction as 'credit' | 'debit',
        description: t.description,
        merchantName: t.merchantName ?? null,
        balance: null,
      }))
      const answered = await db.insightQuestionAnswer.findMany({
        where: { userId },
        select: { questionId: true },
      })
      const insight = buildInsightProfile(normTxns, {
        source: features.openBankingConnected ? 'open_banking' : 'statement_upload',
        accountHolderName: allAccounts.find((a) => a.accountHolderName)?.accountHolderName ?? null,
        profileName: profile?.fullName ?? null,
        declaredMonthlyRent: rentalProfile?.monthlyRentDeclared ?? null,
        resolvedQuestionIds: answered.map((a) => a.questionId),
      })

      features.monthsOfBankHistory = Math.min(insight.period.months, 24)
      features.averageMonthlyIncome = insight.income.averageMonthlyIncome
      features.incomeVolatility = insight.income.volatility
      features.recurringSalaryDetected = insight.income.recurringSalaryDetected
      features.recurringRentDetected = insight.commitments.some((c) => c.category === 'rent_payment')
      features.missedPaymentIndicators =
        insight.paymentBehaviour.missedPayments + insight.paymentBehaviour.returnedPayments

      // Balance-derived features stay on the local reconstruction: it uses each
      // account's currentBalance, whereas the engine relies on per-transaction
      // balances that aren't persisted.
      const endOfMonthBalances = this.computeEndOfMonthBalances(allAccounts)
      if (endOfMonthBalances.length > 0) {
        features.averageEndMonthBalance = this.average(endOfMonthBalances)
      }
      const monthsInOverdraft = endOfMonthBalances.filter((b) => b < 0).length
      features.overdraftDependency = monthsInOverdraft / Math.max(endOfMonthBalances.length, 1)

      const avgMonthlySpend = this.computeAverageMonthlySpend(allTransactions)
      if (avgMonthlySpend > 0 && features.averageEndMonthBalance > 0) {
        features.savingsMonthsBuffer = features.averageEndMonthBalance / avgMonthlySpend
      }

      // Rent-to-income: prefer the rent the engine actually detected; fall back
      // to a declared figure only when no rent was found in the transactions.
      const detectedRentRatio = insight.affordability.ratios.rentToIncome
      if (detectedRentRatio !== null) {
        features.rentToIncomeRatio = detectedRentRatio
      } else {
        const declaredRent = rentalProfile?.monthlyRentDeclared ?? 0
        if (declaredRent > 0 && features.averageMonthlyIncome > 0) {
          features.rentToIncomeRatio = declaredRent / features.averageMonthlyIncome
        }
      }

      // Name match (identity signal) stays local.
      const profileName = profile?.fullName?.toLowerCase() ?? ''
      const accountNames = allAccounts.map((a) => a.accountHolderName?.toLowerCase() ?? '')
      features.accountHolderNameMatch =
        profileName.length > 0 &&
        accountNames.some((name) => this.nameMatchScore(profileName, name) > 0.7)
    }

    // ── Documents ─────────────────────────────────────────────────────────────
    features.documentCount = documents.length
    features.hasUploadedDocuments = documents.length > 0
    // Count all submitted documents as sources — when OCR verification lands,
    // swap the filter back to verificationStatus === 'verified' and adjust weights.
    features.verifiedSourcesCount =
      (features.openBankingConnected ? 1 : 0) +
      documents.filter((d) => d.verificationStatus !== 'rejected').length

    // ── Self-declared check ───────────────────────────────────────────────────
    features.selfDeclaredOnly = !features.openBankingConnected && features.documentCount === 0

    // ── Address confidence ────────────────────────────────────────────────────
    const ADDRESS_DOC_TYPES = ['utility_bill', 'bank_statement', 'tenancy_agreement']
    const currentAddress = user?.addresses[0]
    const addressDocVerified = documents.some(
      (d) => ADDRESS_DOC_TYPES.includes(d.documentType) && d.verificationStatus === 'verified'
    )
    const addressDocSubmitted = documents.some(
      (d) => ADDRESS_DOC_TYPES.includes(d.documentType) && d.verificationStatus !== 'rejected'
    )
    // 0.85 = OCR-verified address doc, 0.65 = submitted/pending (onboard-and-hold phase),
    // 0.4 = declared only, 0 = nothing provided.
    features.addressMatchConfidence =
      currentAddress && addressDocVerified ? 0.85
      : currentAddress && addressDocSubmitted ? 0.65
      : currentAddress ? 0.4
      : 0

    return features
  }

  private computeEndOfMonthBalances(
    accounts: Array<{ currentBalance: number | null; transactions: Array<{ direction: string; amount: number; bookedAt: Date }> }>
  ): number[] {
    const now = new Date()
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Collect completed months that have at least one transaction across any account
    const completedMonthKeys = new Set<string>()
    for (const account of accounts) {
      for (const txn of account.transactions) {
        const key = `${txn.bookedAt.getFullYear()}-${String(txn.bookedAt.getMonth() + 1).padStart(2, '0')}`
        if (key < currentMonthKey) completedMonthKeys.add(key)
      }
    }

    if (completedMonthKeys.size === 0) return []

    // oldest → newest
    const sortedMonths = Array.from(completedMonthKeys).sort().slice(-12)

    const monthlyTotals = new Map<string, number>(sortedMonths.map((m) => [m, 0]))

    for (const account of accounts) {
      if (account.currentBalance === null) continue

      // Net flow per month: positive = more credits than debits
      const flowByMonth = new Map<string, number>()
      for (const txn of account.transactions) {
        const key = `${txn.bookedAt.getFullYear()}-${String(txn.bookedAt.getMonth() + 1).padStart(2, '0')}`
        const delta = txn.direction === 'credit' ? txn.amount : -txn.amount
        flowByMonth.set(key, (flowByMonth.get(key) ?? 0) + delta)
      }

      // Walk backwards through completed months, accumulating a suffix sum of flows
      // that occurred AFTER each target month (including the current partial month).
      // endOfMonthBalance[M] = currentBalance - sum(flows in all months > M)
      let suffixFlow = flowByMonth.get(currentMonthKey) ?? 0

      for (let i = sortedMonths.length - 1; i >= 0; i--) {
        const month = sortedMonths[i]!
        monthlyTotals.set(month, monthlyTotals.get(month)! + (account.currentBalance - suffixFlow))
        suffixFlow += flowByMonth.get(month) ?? 0
      }
    }

    return sortedMonths.map((m) => monthlyTotals.get(m)!)
  }

  private computeAverageMonthlySpend(
    transactions: Array<{ direction: string; amount: number; bookedAt: Date }>
  ): number {
    const monthly = new Map<string, number>()
    for (const txn of transactions) {
      if (txn.direction !== 'debit') continue
      const key = `${txn.bookedAt.getFullYear()}-${txn.bookedAt.getMonth()}`
      monthly.set(key, (monthly.get(key) ?? 0) + txn.amount)
    }
    const values = Array.from(monthly.values())
    return values.length > 0 ? this.average(values) : 0
  }

  private average(nums: number[]): number {
    if (nums.length === 0) return 0
    return nums.reduce((a, b) => a + b, 0) / nums.length
  }


  private nameMatchScore(a: string, b: string): number {
    if (!a || !b) return 0
    const aParts = a.split(' ').filter(Boolean)
    const bParts = b.split(' ').filter(Boolean)
    const matches = aParts.filter((p) => bParts.some((bp) => bp.includes(p) || p.includes(bp)))
    return matches.length / Math.max(aParts.length, 1)
  }
}
