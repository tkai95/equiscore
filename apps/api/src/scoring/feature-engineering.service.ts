import { Injectable } from '@nestjs/common'
import { db } from '@equiscore/database'
import type { TrustFeatures } from '@equiscore/shared'
import { DEFAULT_FEATURES } from '@equiscore/shared'

@Injectable()
export class FeatureEngineeringService {
  async computeFeatures(userId: string): Promise<TrustFeatures> {
    const [user, bankConnections, documents, rentalProfile] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          addresses: { where: { isCurrent: true } },
        },
      }),
      db.bankConnection.findMany({
        where: { userId, connectionStatus: 'active' },
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
      db.uploadedDocument.findMany({ where: { userId } }),
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
      const sortedDates = allTransactions
        .map((t) => t.bookedAt)
        .sort((a, b) => a.getTime() - b.getTime())

      const oldestDate = sortedDates[0]!
      const newestDate = sortedDates[sortedDates.length - 1]!
      const monthsDiff =
        (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      features.monthsOfBankHistory = Math.min(Math.round(monthsDiff), 24)

      // Monthly income aggregation (credits, excluding internal transfers)
      const monthlyIncomes = this.aggregateMonthlyCredits(allTransactions)
      if (monthlyIncomes.length > 0) {
        features.averageMonthlyIncome = this.average(monthlyIncomes)
        features.incomeVolatility = this.coefficientOfVariation(monthlyIncomes)
      }

      // Salary detection: consistent monthly credits within ±15% range
      features.recurringSalaryDetected = this.detectRecurringSalary(allTransactions)

      // Rent detection
      features.recurringRentDetected = this.detectRecurringRent(allTransactions)

      features.missedPaymentIndicators = this.detectMissedPayments(allTransactions)

      // End-of-month balances
      const endOfMonthBalances = this.computeEndOfMonthBalances(allAccounts)
      if (endOfMonthBalances.length > 0) {
        features.averageEndMonthBalance = this.average(endOfMonthBalances)
      }

      // Overdraft dependency
      const monthsInOverdraft = endOfMonthBalances.filter((b) => b < 0).length
      features.overdraftDependency = monthsInOverdraft / Math.max(endOfMonthBalances.length, 1)

      // Savings buffer: months of essential spend
      const avgMonthlySpend = this.computeAverageMonthlySpend(allTransactions)
      if (avgMonthlySpend > 0 && features.averageEndMonthBalance > 0) {
        features.savingsMonthsBuffer = features.averageEndMonthBalance / avgMonthlySpend
      }

      // Rent-to-income ratio
      const declaredRent = rentalProfile?.monthlyRentDeclared ?? 0
      if (declaredRent > 0 && features.averageMonthlyIncome > 0) {
        features.rentToIncomeRatio = declaredRent / features.averageMonthlyIncome
      }

      // Name match check
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

  private aggregateMonthlyCredits(
    transactions: Array<{ direction: string; amount: number; bookedAt: Date; category: string | null }>
  ): number[] {
    const monthly = new Map<string, number>()

    for (const txn of transactions) {
      if (txn.direction !== 'credit') continue
      if (txn.category === 'savings_transfer') continue

      const key = `${txn.bookedAt.getFullYear()}-${txn.bookedAt.getMonth()}`
      monthly.set(key, (monthly.get(key) ?? 0) + txn.amount)
    }

    return Array.from(monthly.values())
  }

  private detectRecurringSalary(
    transactions: Array<{ direction: string; amount: number; bookedAt: Date; category: string | null; description: string | null }>
  ): boolean {
    const salaryTxns = transactions.filter(
      (t) =>
        t.direction === 'credit' &&
        (t.category === 'salary' ||
          /salary|payroll|wages|employer/i.test(t.description ?? ''))
    )

    if (salaryTxns.length < 2) return false

    const months = new Set(
      salaryTxns.map((t) => `${t.bookedAt.getFullYear()}-${t.bookedAt.getMonth()}`)
    )
    return months.size >= 2
  }

  private detectRecurringRent(
    transactions: Array<{ direction: string; amount: number; bookedAt: Date; category: string | null; description: string | null }>
  ): boolean {
    const rentTxns = transactions.filter(
      (t) =>
        t.direction === 'debit' &&
        (t.category === 'rent_payment' ||
          /rent|landlord|letting/i.test(t.description ?? ''))
    )

    if (rentTxns.length < 2) return false

    const months = new Set(
      rentTxns.map((t) => `${t.bookedAt.getFullYear()}-${t.bookedAt.getMonth()}`)
    )
    return months.size >= 2
  }

  private detectMissedPayments(
    transactions: Array<{ direction: string; amount: number; description: string | null }>
  ): number {
    // Returned/bounced payments appear as credits reversing a failed debit
    // (returned DD, unpaid standing order, recalled payment)
    const RETURN_PATTERN = /\b(returned|unpaid|unpaids|bounced|recalled|reversal|reversed|return unpaid)\b/i
    return transactions.filter((t) => t.description && RETURN_PATTERN.test(t.description)).length
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

  private coefficientOfVariation(nums: number[]): number {
    if (nums.length < 2) return 0
    const avg = this.average(nums)
    if (avg === 0) return 1
    const variance = nums.reduce((acc, n) => acc + Math.pow(n - avg, 2), 0) / nums.length
    return Math.sqrt(variance) / avg
  }

  private nameMatchScore(a: string, b: string): number {
    if (!a || !b) return 0
    const aParts = a.split(' ').filter(Boolean)
    const bParts = b.split(' ').filter(Boolean)
    const matches = aParts.filter((p) => bParts.some((bp) => bp.includes(p) || p.includes(bp)))
    return matches.length / Math.max(aParts.length, 1)
  }
}
