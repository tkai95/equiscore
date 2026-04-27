'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, Search } from 'lucide-react'
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

// How each category maps to a scoring signal
const CATEGORY_META: Record<string, { label: string; signal: string; signalClass: string }> = {
  salary:             { label: 'Salary',        signal: 'Income',      signalClass: 'bg-emerald-100 text-emerald-700' },
  gig_income:         { label: 'Gig Income',    signal: 'Income',      signalClass: 'bg-emerald-100 text-emerald-700' },
  government_benefit: { label: 'Gov Benefit',   signal: 'Income',      signalClass: 'bg-emerald-100 text-emerald-700' },
  rent_payment:       { label: 'Rent',          signal: 'Commitment',  signalClass: 'bg-[#EBF2EF] text-[#3D6658]' },
  loan_repayment:     { label: 'Loan',          signal: 'Commitment',  signalClass: 'bg-[#EBF2EF] text-[#3D6658]' },
  utilities:          { label: 'Utilities',     signal: 'Commitment',  signalClass: 'bg-[#EBF2EF] text-[#3D6658]' },
  groceries:          { label: 'Groceries',     signal: 'Living',      signalClass: 'bg-gray-100 text-gray-600' },
  transport:          { label: 'Transport',     signal: 'Living',      signalClass: 'bg-gray-100 text-gray-600' },
  healthcare:         { label: 'Healthcare',    signal: 'Living',      signalClass: 'bg-gray-100 text-gray-600' },
  education:          { label: 'Education',     signal: 'Living',      signalClass: 'bg-gray-100 text-gray-600' },
  entertainment:      { label: 'Entertainment', signal: 'Discretionary', signalClass: 'bg-orange-100 text-orange-700' },
  cash_withdrawal:    { label: 'Cash',          signal: 'Discretionary', signalClass: 'bg-orange-100 text-orange-700' },
  savings_transfer:   { label: 'Savings',       signal: 'Savings',     signalClass: 'bg-teal-100 text-teal-700' },
  investment:         { label: 'Investment',    signal: 'Savings',     signalClass: 'bg-teal-100 text-teal-700' },
  other:              { label: 'Other',         signal: '—',           signalClass: 'text-gray-400' },
}

const SIGNAL_ORDER = ['Income', 'Commitment', 'Savings', 'Living', 'Discretionary', '—']

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function getMeta(category: string | null) {
  return (category ? CATEGORY_META[category] : undefined) ?? CATEGORY_META['other']!
}

export function AccountTransactionsView({ accountId }: { accountId: string }) {
  const { getToken } = useAuth()
  const [search, setSearch] = useState('')
  const [filterSignal, setFilterSignal] = useState('All')
  const [filterDirection, setFilterDirection] = useState('All')

  const { data: account, isLoading } = useQuery({
    queryKey: ['account-transactions', accountId],
    queryFn: async () => {
      const token = await getToken()
      return api.banking.getAccountTransactions(token!, accountId) as Promise<Account>
    },
  })

  const filtered = useMemo(() => {
    if (!account) return []
    return account.transactions.filter(txn => {
      const meta = getMeta(txn.category)
      const name = (txn.merchantName ?? txn.description ?? '').toLowerCase()
      if (search && !name.includes(search.toLowerCase())) return false
      if (filterSignal !== 'All' && meta.signal !== filterSignal) return false
      if (filterDirection !== 'All' && txn.direction !== filterDirection.toLowerCase()) return false
      return true
    })
  }, [account, search, filterSignal, filterDirection])

  // Group filtered transactions by month
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const key = monthKey(t.bookedAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    )
  }

  if (!account) return null

  const currency = account.currency
  const totalCredit = account.transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
  const totalDebit  = account.transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-5">
      {/* Back + title */}
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
            <p className="text-sm text-gray-500">
              {account.bankConnection.institutionName ?? 'Connected bank'}
              {' · '}
              {account.accountType.replace('_', ' ')}
            </p>
          </div>
          {account.currentBalance !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{fmt(account.currentBalance, currency)}</p>
              <p className="text-xs text-gray-500">Current balance</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs text-gray-500">Transactions</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{account.transactions.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs text-gray-500">Total in</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{fmt(totalCredit, currency)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs text-gray-500">Total out</p>
          <p className="mt-1 text-xl font-bold text-red-500">{fmt(totalDebit, currency)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
          />
        </div>
        <select
          value={filterSignal}
          onChange={e => setFilterSignal(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
        >
          <option value="All">All signals</option>
          {SIGNAL_ORDER.filter(s => s !== '—').map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterDirection}
          onChange={e => setFilterDirection(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
        >
          <option value="All">In &amp; Out</option>
          <option value="Credit">Money in</option>
          <option value="Debit">Money out</option>
        </select>
        {(search || filterSignal !== 'All' || filterDirection !== 'All') && (
          <button
            onClick={() => { setSearch(''); setFilterSignal('All'); setFilterDirection('All') }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-500 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
        <span className="ml-auto self-center text-sm text-gray-400">
          {filtered.length} of {account.transactions.length}
        </span>
      </div>

      {/* Table */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-gray-500">No transactions match your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 w-24">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 w-36">Category</th>
                <th className="px-4 py-3 w-36">Signal Type</th>
                <th className="px-4 py-3 w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([key, txns]) => {
                const credit = txns.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
                const debit  = txns.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0)
                return (
                  <>
                    {/* Month group header */}
                    <tr key={`header-${key}`} className="border-b border-gray-100 bg-cream/60">
                      <td colSpan={3} className="px-4 py-2">
                        <span className="font-semibold text-gray-700">{monthLabel(key)}</span>
                        <span className="ml-2 text-xs text-gray-500">{txns.length} transactions</span>
                      </td>
                      <td colSpan={2} className="px-4 py-2 text-right text-xs">
                        <span className="text-emerald-600 font-medium">+{fmt(credit, currency)}</span>
                        <span className="mx-2 text-gray-300">·</span>
                        <span className="text-red-500 font-medium">−{fmt(debit, currency)}</span>
                      </td>
                    </tr>
                    {txns.map((txn, i) => {
                      const meta = getMeta(txn.category)
                      const d = new Date(txn.bookedAt)
                      const name = txn.merchantName ?? txn.description ?? 'Transaction'
                      const hasSecondary = txn.merchantName && txn.description && txn.merchantName !== txn.description
                      return (
                        <tr
                          key={txn.id}
                          className={cn(
                            'border-b border-gray-50 transition-colors hover:bg-gray-50/50',
                            i === txns.length - 1 && 'border-b-0'
                          )}
                        >
                          {/* Date */}
                          <td className="px-4 py-3 tabular-nums text-gray-500 whitespace-nowrap">
                            {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </td>

                          {/* Description */}
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-medium text-gray-900 truncate">{name}</p>
                            {hasSecondary && (
                              <p className="text-xs text-gray-400 truncate">{txn.description}</p>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                              meta.signalClass
                            )}>
                              {meta.label}
                            </span>
                          </td>

                          {/* Signal Type */}
                          <td className="px-4 py-3">
                            {meta.signal !== '—' ? (
                              <span className={cn(
                                'inline-block rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                                meta.signal === 'Income'        && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                                meta.signal === 'Commitment'    && 'bg-[#EBF2EF] text-[#3D6658] ring-[#B5CEC8]',
                                meta.signal === 'Savings'       && 'bg-teal-50 text-teal-700 ring-teal-200',
                                meta.signal === 'Living'        && 'bg-gray-50 text-gray-600 ring-gray-200',
                                meta.signal === 'Discretionary' && 'bg-orange-50 text-orange-700 ring-orange-200',
                              )}>
                                {meta.signal}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className={cn(
                            'px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap',
                            txn.direction === 'credit' ? 'text-emerald-600' : 'text-gray-900'
                          )}>
                            {txn.direction === 'credit' ? '+' : '−'}
                            {fmt(txn.amount, txn.currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
