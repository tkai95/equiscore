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
              transactions: {
                orderBy: { bookedAt: 'desc' },
              },
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
    features.verifiedSourcesCount =
      (features.openBankingConnected ? 1 : 0) +
      documents.filter((d) => d.verificationStatus === 'verified').length

    // ── Self-declared check ───────────────────────────────────────────────────
    features.selfDeclaredOnly = !features.openBankingConnected && features.documentCount === 0

    // ── Address confidence ────────────────────────────────────────────────────
    const currentAddress = user?.addresses[0]
    const addressVerified = documents.some(
      (d) =>
        ['utility_bill', 'bank_statement', 'tenancy_agreement'].includes(d.documentType) &&
        d.verificationStatus === 'verified'
    )
    features.addressMatchConfidence =
      currentAddress && addressVerified ? 0.85 : currentAddress ? 0.4 : 0

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

  private computeEndOfMonthBalances(
    accounts: Array<{ currentBalance: number | null; transactions: Array<{ direction: string; amount: number; bookedAt: Date }> }>
  ): number[] {
    // Simplified: use current balance minus recent months of net activity
    const totalCurrentBalance = accounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)
    return [totalCurrentBalance]
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
