'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  bookedAt: string
  amount: number
  currency: string
  description: string | null
  merchantName: string | null
  category: string | null
  direction: 'credit' | 'debit'
}

interface Account {
  id: string
  accountName: string | null
  accountType: string
  currency: string
  currentBalance: number | null
  bankConnection: { institutionName: string | null; connectionStatus: string }
  transactions: Transaction[]
}

const CATEGORY_STYLES: Record<string, { label: string; className: string }> = {
  salary:             { label: 'Salary',          className: 'bg-emerald-100 text-emerald-700' },
  rent_payment:       { label: 'Rent',             className: 'bg-blue-100 text-blue-700' },
  groceries:          { label: 'Groceries',        className: 'bg-orange-100 text-orange-700' },
  transport:          { label: 'Transport',        className: 'bg-violet-100 text-violet-700' },
  utilities:          { label: 'Utilities',        className: 'bg-yellow-100 text-yellow-800' },
  savings_transfer:   { label: 'Savings',          className: 'bg-teal-100 text-teal-700' },
  loan_repayment:     { label: 'Loan',             className: 'bg-red-100 text-red-700' },
  entertainment:      { label: 'Entertainment',    className: 'bg-pink-100 text-pink-700' },
  healthcare:         { label: 'Healthcare',       className: 'bg-rose-100 text-rose-700' },
  education:          { label: 'Education',        className: 'bg-indigo-100 text-indigo-700' },
  gig_income:         { label: 'Gig Income',       className: 'bg-green-100 text-green-700' },
  government_benefit: { label: 'Gov Benefit',      className: 'bg-purple-100 text-purple-700' },
  investment:         { label: 'Investment',       className: 'bg-cyan-100 text-cyan-700' },
  cash_withdrawal:    { label: 'Cash',             className: 'bg-gray-100 text-gray-700' },
  other:              { label: 'Other',            className: 'bg-gray-100 text-gray-600' },
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function groupByMonth(txns: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  for (const t of txns) {
    const d = new Date(t.bookedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

function MonthBar({ txns, currency }: { txns: Transaction[]; currency: string }) {
  const credit = txns.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
  const debit  = txns.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0)
  return (
    <div className="flex gap-4 text-sm">
      <span className="flex items-center gap-1 font-medium text-emerald-600">
        <TrendingUp className="h-3.5 w-3.5" />{fmt(credit, currency)}
      </span>
      <span className="flex items-center gap-1 font-medium text-red-500">
        <TrendingDown className="h-3.5 w-3.5" />{fmt(debit, currency)}
      </span>
    </div>
  )
}

export function AccountTransactionsView({ accountId }: { accountId: string }) {
  const { getToken } = useAuth()

  const { data: account, isLoading } = useQuery({
    queryKey: ['account-transactions', accountId],
    queryFn: async () => {
      const token = await getToken()
      return api.banking.getAccountTransactions(token!, accountId) as Promise<Account>
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!account) return null

  const grouped = groupByMonth(account.transactions)
  const currency = account.currency
  const totalCredit = account.transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
  const totalDebit  = account.transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/connections"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Bank connections
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{account.accountName ?? 'Account'}</h1>
            <p className="text-gray-500">
              {account.bankConnection.institutionName ?? 'Connected bank'}
              {' · '}
              {account.accountType.replace('_', ' ')}
            </p>
          </div>
          {account.currentBalance !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{fmt(account.currentBalance, currency)}</p>
              <p className="text-sm text-gray-500">Current balance</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Transactions', value: String(account.transactions.length), highlight: '' },
          { label: 'Total in',  value: fmt(totalCredit, currency), highlight: 'text-emerald-600' },
          { label: 'Total out', value: fmt(totalDebit,  currency), highlight: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn('mt-1 text-lg font-semibold text-gray-900', s.highlight)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions grouped by month */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-gray-500">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, txns]) => (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">{monthLabel(key)}</h3>
                <MonthBar txns={txns} currency={currency} />
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                {txns.map((txn, i) => {
                  const cat = txn.category ? CATEGORY_STYLES[txn.category] : null
                  const name = txn.merchantName ?? txn.description ?? 'Transaction'
                  const d = new Date(txn.bookedAt)
                  return (
                    <div
                      key={txn.id}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3',
                        i < txns.length - 1 && 'border-b border-gray-50'
                      )}
                    >
                      <div className="w-9 shrink-0 text-center">
                        <p className="text-sm font-semibold text-gray-900 leading-none">{d.getDate()}</p>
                        <p className="text-xs text-gray-400">
                          {d.toLocaleDateString('en-GB', { month: 'short' })}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                        {cat && (
                          <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', cat.className)}>
                            {cat.label}
                          </span>
                        )}
                      </div>

                      <p className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        txn.direction === 'credit' ? 'text-emerald-600' : 'text-gray-900'
                      )}>
                        {txn.direction === 'credit' ? '+' : '−'}
                        {fmt(txn.amount, txn.currency)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
