import type { TrustFeatures } from '../types/trust'

export const DEFAULT_FEATURES: TrustFeatures = {
  monthsOfBankHistory: 0,
  connectedAccountsCount: 0,
  averageMonthlyIncome: 0,
  incomeVolatility: 1,
  recurringSalaryDetected: false,
  recurringRentDetected: false,
  averageEndMonthBalance: 0,
  savingsMonthsBuffer: 0,
  rentToIncomeRatio: 0,
  overdraftDependency: 0,
  missedPaymentIndicators: 0,
  accountHolderNameMatch: false,
  addressMatchConfidence: 0,
  documentCount: 0,
  verifiedSourcesCount: 0,
  profileFieldsComplete: 0,
  selfDeclaredOnly: true,
  openBankingConnected: false,
  hasUploadedDocuments: false,
}
