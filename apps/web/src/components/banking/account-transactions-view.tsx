'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button, PageTitle } from '@/components/ui'

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
// Category → signal group. Colour is derived from the signal group via
// SIGNAL_TONE so the palette stays consistent with the design system.
const CATEGORY_META: Record<string, { label: string; signal: string }> = {
  salary:             { label: 'Salary',        signal: 'Income' },
  gig_income:         { label: 'Gig Income',    signal: 'Income' },
  government_benefit: { label: 'Gov Benefit',   signal: 'Income' },
  rent_payment:       { label: 'Rent',          signal: 'Commitment' },
  loan_repayment:     { label: 'Loan',          signal: 'Commitment' },
  utilities:          { label: 'Utilities',     signal: 'Commitment' },
  groceries:          { label: 'Groceries',     signal: 'Living' },
  transport:          { label: 'Transport',     signal: 'Living' },
  healthcare:         { label: 'Healthcare',    signal: 'Living' },
  education:          { label: 'Education',     signal: 'Living' },
  entertainment:      { label: 'Entertainment', signal: 'Discretionary' },
  cash_withdrawal:    { label: 'Cash',          signal: 'Discretionary' },
  savings_transfer:   { label: 'Savings',       signal: 'Savings' },
  investment:         { label: 'Investment',    signal: 'Savings' },
  other:              { label: 'Other',         signal: '—' },
}

// One tone per signal group, drawn from system tokens (no raw emerald/teal/hex).
const SIGNAL_TONE: Record<string, string> = {
  Income:        'bg-success-soft text-success-strong',
  Commitment:    'bg-brand-50 text-brand-900',
  Savings:       'bg-info-soft text-info-strong',
  Living:        'bg-surface-inset text-content-secondary',
  Discretionary: 'bg-warning-soft text-warning-strong',
  '—':           'text-content-muted',
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
        <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
        <div className="h-20 animate-pulse rounded-card bg-surface-hover" />
        <div className="h-96 animate-pulse rounded-card bg-surface-hover" />
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
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" />
          Bank connections
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <PageTitle>{account.accountName ?? 'Account'}</PageTitle>
            <p className="text-sm text-content-secondary">
              {account.bankConnection.institutionName ?? 'Connected bank'}
              {' · '}
              {account.accountType.replace('_', ' ')}
            </p>
          </div>
          {account.currentBalance !== null && (
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-content">{fmt(account.currentBalance, currency)}</p>
              <p className="text-xs text-content-muted">Current balance</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card border border-line bg-surface-card p-4">
          <p className="text-xs text-content-muted">Transactions</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-content">{account.transactions.length}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-card p-4">
          <p className="text-xs text-content-muted">Total in</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-success-strong">{fmt(totalCredit, currency)}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-card p-4">
          <p className="text-xs text-content-muted">Total out</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-content">{fmt(totalDebit, currency)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-muted" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-line bg-surface-card pl-8 pr-3 text-sm text-content placeholder:text-content-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
          />
        </div>
        <select
          value={filterSignal}
          onChange={e => setFilterSignal(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface-card px-3 text-sm text-content-secondary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
        >
          <option value="All">All signals</option>
          {SIGNAL_ORDER.filter(s => s !== '—').map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterDirection}
          onChange={e => setFilterDirection(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface-card px-3 text-sm text-content-secondary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
        >
          <option value="All">In &amp; Out</option>
          <option value="Credit">Money in</option>
          <option value="Debit">Money out</option>
        </select>
        {(search || filterSignal !== 'All' || filterDirection !== 'All') && (
          <Button
            variant="secondary"
            onClick={() => { setSearch(''); setFilterSignal('All'); setFilterDirection('All') }}
          >
            Clear
          </Button>
        )}
        <span className="ml-auto self-center text-sm text-content-muted">
          {filtered.length} of {account.transactions.length}
        </span>
      </div>

      {/* Table */}
      {grouped.length === 0 ? (
        <div className="rounded-card border border-line bg-surface-card py-16 text-center">
          <p className="text-content-secondary">No transactions match your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-subtle bg-surface-inset text-left text-xs font-semibold uppercase tracking-wide text-content-muted">
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
                    <tr key={`header-${key}`} className="border-b border-line-subtle bg-surface-inset">
                      <td colSpan={3} className="px-4 py-2">
                        <span className="font-semibold text-content">{monthLabel(key)}</span>
                        <span className="ml-2 text-xs text-content-muted">{txns.length} transactions</span>
                      </td>
                      <td colSpan={2} className="px-4 py-2 text-right text-xs tabular-nums">
                        <span className="font-medium text-success-strong">+{fmt(credit, currency)}</span>
                        <span className="mx-2 text-content-muted/50">·</span>
                        <span className="font-medium text-content-secondary">−{fmt(debit, currency)}</span>
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
                            'border-b border-line-subtle transition-colors hover:bg-surface-hover',
                            i === txns.length - 1 && 'border-b-0'
                          )}
                        >
                          {/* Date */}
                          <td className="px-4 py-3 tabular-nums text-content-secondary whitespace-nowrap">
                            {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </td>

                          {/* Description */}
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-medium text-content truncate">{name}</p>
                            {hasSecondary && (
                              <p className="text-xs text-content-muted truncate">{txn.description}</p>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                              SIGNAL_TONE[meta.signal]
                            )}>
                              {meta.label}
                            </span>
                          </td>

                          {/* Signal Type */}
                          <td className="px-4 py-3">
                            {meta.signal !== '—' ? (
                              <span className={cn(
                                'inline-block rounded-md px-2 py-0.5 text-xs font-semibold',
                                SIGNAL_TONE[meta.signal]
                              )}>
                                {meta.signal}
                              </span>
                            ) : (
                              <span className="text-xs text-content-muted">—</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className={cn(
                            'px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap',
                            txn.direction === 'credit' ? 'text-success-strong' : 'text-content'
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
