'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Landmark, RefreshCw, CheckCircle, AlertCircle, CreditCard, Building2, PiggyBank, Briefcase, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BankAccount {
  id: string
  externalAccountId: string
  accountName: string
  accountHolderName: string | null
  accountType: 'current' | 'savings' | 'credit_card' | 'business'
  currency: string
  currentBalance: number | null
  syncedAt: string | null
  bankConnection: {
    institutionName: string | null
    connectionStatus: string
    lastSyncedAt: string | null
  }
}

const ACCOUNT_TYPE_LABELS: Record<BankAccount['accountType'], string> = {
  current: 'Current Account',
  savings: 'Savings Account',
  credit_card: 'Credit Card',
  business: 'Business Account',
}

const ACCOUNT_TYPE_ICONS: Record<BankAccount['accountType'], React.ElementType> = {
  current: Building2,
  savings: PiggyBank,
  credit_card: CreditCard,
  business: Briefcase,
}

function formatBalance(amount: number | null, currency: string) {
  if (amount === null) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function formatDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

interface Props {
  bankConnected: boolean
  bankError: boolean
}

export function BankConnectionsView({ bankConnected, bankError }: Props) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const token = await getToken()
      return api.banking.getAccounts(token!) as Promise<BankAccount[]>
    },
  })

  const connectMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      const { url } = await api.banking.getLinkUrl(token!)
      window.location.href = url
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return api.banking.sync(token!)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })

  const hasAccounts = accounts.length > 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank connections</h1>
          <p className="text-gray-600">Connect your bank account to strengthen your trust profile.</p>
        </div>
        {hasAccounts && (
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />
            {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>

      {/* Status banners */}
      {bankConnected && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          Bank connected successfully — your transactions are being imported.
        </div>
      )}
      {bankError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          Something went wrong connecting your bank. Please try again.
        </div>
      )}

      {/* Accounts list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : hasAccounts ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const Icon = ACCOUNT_TYPE_ICONS[account.accountType]
            return (
              <Link
                key={account.id}
                href={`/dashboard/connections/${account.id}`}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md hover:ring-gray-200"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{account.accountName}</p>
                  <p className="text-sm text-gray-500">
                    {ACCOUNT_TYPE_LABELS[account.accountType]}
                    {account.bankConnection.institutionName
                      ? ` · ${account.bankConnection.institutionName}`
                      : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Last synced: {formatDate(account.bankConnection.lastSyncedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatBalance(account.currentBalance, account.currency)}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                      account.bankConnection.connectionStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {account.bankConnection.connectionStatus}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 shadow-sm ring-1 ring-gray-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream">
            <Landmark className="h-8 w-8 text-brand" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">No bank connected yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Linking your bank adds income and spending signals to your trust score.
            </p>
          </div>
        </div>
      )}

      {/* Connect button */}
      <div className={cn(hasAccounts && 'pt-2')}>
        <button
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-cream-surface shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          <Landmark className="h-4 w-4" />
          {connectMutation.isPending
            ? 'Redirecting…'
            : hasAccounts
              ? 'Connect another bank'
              : 'Connect your bank'}
        </button>
        <p className="mt-2 text-xs text-gray-400">
          Powered by TrueLayer · Secure Open Banking · Read-only access
        </p>
      </div>
    </div>
  )
}
