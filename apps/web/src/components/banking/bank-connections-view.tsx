'use client'

import { useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  Landmark,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Building2,
  PiggyBank,
  Briefcase,
  ChevronRight,
  Unlink,
  Upload,
  FileSpreadsheet,
} from 'lucide-react'
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
    id: string
    providerName: string
    institutionName: string | null
    connectionStatus: string
    lastSyncedAt: string | null
  }
}

interface ConnectionGroup {
  id: string
  label: string
  connectionStatus: string
  lastSyncedAt: string | null
  accounts: BankAccount[]
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

/**
 * Consent and access tokens live on the connection, not the account, so a bank
 * is connected and disconnected as a whole. Grouping makes that obvious rather
 * than offering a per-account control that would quietly remove its siblings.
 */
function groupByConnection(accounts: BankAccount[]): ConnectionGroup[] {
  const groups = new Map<string, ConnectionGroup>()
  for (const account of accounts) {
    const c = account.bankConnection
    const existing = groups.get(c.id)
    if (existing) {
      existing.accounts.push(account)
      continue
    }
    groups.set(c.id, {
      id: c.id,
      label: c.institutionName ?? 'Connected bank',
      connectionStatus: c.connectionStatus,
      lastSyncedAt: c.lastSyncedAt,
      accounts: [account],
    })
  }
  return [...groups.values()]
}

interface Props {
  bankConnected: boolean
  bankError: boolean
}

export function BankConnectionsView({ bankConnected, bankError }: Props) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

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

  // Dry-run the score impact of disconnecting the bank the user is confirming.
  const { data: impact, isLoading: impactLoading } = useQuery({
    queryKey: ['disconnect-impact', confirmingId],
    enabled: confirmingId !== null,
    queryFn: async () => {
      const token = await getToken()
      return api.scores.impactPreview(token!, { excludeConnectionIds: [confirmingId!] })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const token = await getToken()
      return api.banking.disconnect(token!, connectionId)
    },
    onSuccess: () => {
      setConfirmingId(null)
      // Removing bank data changes the score and every view derived from it.
      for (const key of [['bank-accounts'], ['score'], ['analytics-summary'], ['accounts']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })

  // "Score without Open Banking" — parse a CSV export and import it directly.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const csv = await file.text()
      const token = await getToken()
      return api.insights.importCsv(token!, csv)
    },
    onSuccess: () => {
      for (const key of [['bank-accounts'], ['score'], ['analytics-summary'], ['accounts']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })

  const connections = groupByConnection(accounts)
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
      {disconnectMutation.isError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          We couldn&apos;t disconnect that bank. Please try again.
        </div>
      )}

      {/* Connections, grouped by bank */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : hasAccounts ? (
        <div className="space-y-5">
          {connections.map((connection) => {
            const isConfirming = confirmingId === connection.id
            const isDisconnecting =
              disconnectMutation.isPending && disconnectMutation.variables === connection.id

            return (
              <div
                key={connection.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
              >
                {/* Bank header */}
                <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream">
                    <Landmark className="h-5 w-5 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{connection.label}</p>
                    <p className="text-xs text-gray-400">
                      {connection.accounts.length}{' '}
                      {connection.accounts.length === 1 ? 'account' : 'accounts'} · Last synced:{' '}
                      {formatDate(connection.lastSyncedAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      connection.connectionStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {connection.connectionStatus}
                  </span>
                  {!isConfirming && (
                    <button
                      onClick={() => setConfirmingId(connection.id)}
                      disabled={isDisconnecting}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Unlink className="h-4 w-4" />
                      Disconnect
                    </button>
                  )}
                </div>

                {/* Confirmation */}
                {isConfirming && (
                  <div className="border-b border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-red-900">
                          Disconnect {connection.label}?
                        </p>
                        <p className="mt-1 text-sm text-red-800">
                          This withdraws Equiscore&apos;s access to your bank and permanently deletes{' '}
                          {connection.accounts.length}{' '}
                          {connection.accounts.length === 1 ? 'account' : 'accounts'} and their
                          transaction history. Your trust score will be recalculated without this
                          data.
                        </p>

                        {/* Concrete, dry-run score impact */}
                        <div className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm ring-1 ring-red-100">
                          {impactLoading || !impact ? (
                            <span className="text-red-800/70">Calculating score impact…</span>
                          ) : impact.delta < 0 ? (
                            <span className="text-red-900">
                              Your score would drop from{' '}
                              <strong>
                                {impact.current.overallTier} / {impact.current.overallScore}
                              </strong>{' '}
                              to{' '}
                              <strong>
                                {impact.projected.overallTier} / {impact.projected.overallScore}
                              </strong>{' '}
                              ({impact.delta}).
                            </span>
                          ) : (
                            <span className="text-red-900">
                              Your score would stay at{' '}
                              <strong>
                                {impact.projected.overallTier} / {impact.projected.overallScore}
                              </strong>
                              .
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => disconnectMutation.mutate(connection.id)}
                            disabled={isDisconnecting}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                          >
                            {isDisconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            disabled={isDisconnecting}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accounts within this bank */}
                <div className="divide-y divide-gray-50">
                  {connection.accounts.map((account) => {
                    const Icon = ACCOUNT_TYPE_ICONS[account.accountType]
                    return (
                      <Link
                        key={account.id}
                        href={`/dashboard/connections/${account.id}`}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream">
                          <Icon className="h-4 w-4 text-brand" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{account.accountName}</p>
                          <p className="text-sm text-gray-500">
                            {ACCOUNT_TYPE_LABELS[account.accountType]}
                          </p>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatBalance(account.currentBalance, account.currency)}
                        </p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </Link>
                    )
                  })}
                </div>
              </div>
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

      {/* Upload a statement — the no-open-banking path */}
      <div className="rounded-2xl border border-dashed border-[#D8D6C9] bg-cream/50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-gray-100">
            <FileSpreadsheet className="h-5 w-5 text-brand" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">Can&apos;t connect a bank? Upload a statement</p>
            <p className="mt-0.5 text-sm text-gray-500">
              Export your transactions as a CSV from your banking app and upload it — we&apos;ll read
              it and build your profile. Nothing is shared without your say-so.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importCsv.mutate(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importCsv.isPending}
              className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className={cn('h-4 w-4', importCsv.isPending && 'animate-pulse')} />
              {importCsv.isPending ? 'Reading your statement…' : 'Upload a statement (CSV)'}
            </button>

            {importCsv.isSuccess && importCsv.data && (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
                Imported <strong>{importCsv.data.imported}</strong> transactions
                {importCsv.data.imported > 0 && (
                  <>
                    {' '}
                    ({formatDate(importCsv.data.coverageStart)} – {formatDate(importCsv.data.coverageEnd)})
                  </>
                )}
                . Your score is now{' '}
                <strong>
                  {importCsv.data.overallTier} / {importCsv.data.overallScore}
                </strong>
                .
                {importCsv.data.ledgerVerified && (
                  <span className="mt-1 block text-xs text-emerald-700/80">
                    ✓ Statement ledger verified — every balance reconciles.
                  </span>
                )}
                {importCsv.data.skipped > 0 && (
                  <span className="mt-1 block text-xs text-emerald-700/80">
                    {importCsv.data.skipped} rows couldn&apos;t be read and were skipped.
                  </span>
                )}
              </div>
            )}
            {importCsv.isError && (
              <div className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800 ring-1 ring-red-200">
                {(importCsv.error as Error).message ||
                  "We couldn't read that file. Make sure it's a CSV export from your bank."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
