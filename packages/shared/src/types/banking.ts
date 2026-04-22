export type ConnectionStatus = 'active' | 'expired' | 'error' | 'pending'

export type AccountType = 'current' | 'savings' | 'credit_card' | 'business'

export type TransactionDirection = 'credit' | 'debit'

export interface BankAccount {
  id: string
  bankConnectionId: string
  accountName: string
  accountHolderName: string
  accountType: AccountType
  currency: string
  maskedAccountNumber: string
  currentBalance?: number
}

export interface BankTransaction {
  id: string
  bankAccountId: string
  externalTxnId: string
  bookedAt: string
  amount: number
  currency: string
  description: string
  merchantName?: string
  category?: TransactionCategory
  direction: TransactionDirection
}

export type TransactionCategory =
  | 'salary'
  | 'rent_payment'
  | 'groceries'
  | 'transport'
  | 'utilities'
  | 'savings_transfer'
  | 'loan_repayment'
  | 'entertainment'
  | 'healthcare'
  | 'education'
  | 'gig_income'
  | 'government_benefit'
  | 'investment'
  | 'cash_withdrawal'
  | 'other'
