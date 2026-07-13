'use client'

import { useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api, type StatementImportResult } from '@/lib/api'
import { useImportJobs } from '@/lib/use-import-jobs'
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
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, PageTitle, StatusPill } from '@/components/ui'
import { EnableBankingConnect } from './enable-banking-connect'

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
  providerName: string
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
      providerName: c.providerName,
      label: c.institutionName ?? 'Connected bank',
      connectionStatus: c.connectionStatus,
      lastSyncedAt: c.lastSyncedAt,
      accounts: [account],
    })
  }
  return [...groups.values()]
}

const isUpload = (g: ConnectionGroup) => g.providerName === 'statement_upload'

/** What the user is confirming they want to disconnect. */
type ConfirmTarget = {
  kind: 'bank' | 'uploads'
  ids: string[]
  label: string
  accountCount: number
}

interface Props {
  bankConnected: boolean
  bankError: boolean
}

export function BankConnectionsView({ bankConnected, bankError }: Props) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [selectedUploads, setSelectedUploads] = useState<Set<string>>(new Set())

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

  // Dry-run the combined score impact of disconnecting everything being confirmed.
  const { data: impact, isLoading: impactLoading } = useQuery({
    queryKey: ['disconnect-impact', confirm?.ids ?? []],
    enabled: confirm !== null,
    queryFn: async () => {
      const token = await getToken()
      return api.scores.impactPreview(token!, { excludeConnectionIds: confirm!.ids })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const token = await getToken()
      // Consent lives per-connection, so remove each selected connection in turn.
      for (const id of ids) await api.banking.disconnect(token!, id)
    },
    onSuccess: () => {
      setConfirm(null)
      setSelectedUploads(new Set())
      // Removing bank data changes the score and every view derived from it.
      for (const key of [['bank-accounts'], ['score'], ['analytics-summary'], ['accounts']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })

  // "Score without Open Banking" — import a statement (PDF or CSV) directly.
  // CSV parses deterministically in-request, so it stays synchronous. A PDF is
  // read by Claude (30–90s), so it runs as a background job: we return instantly
  // and the user can leave the page — the global chip announces completion.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const { data: jobs = [] } = useImportJobs()
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : undefined

  const importCsvMut = useMutation({
    mutationFn: async (file: File): Promise<StatementImportResult> => {
      const token = await getToken()
      const csv = await file.text()
      return api.insights.importCsv(token!, csv)
    },
    onSuccess: () => {
      for (const key of [['bank-accounts'], ['score'], ['analytics-summary'], ['accounts'], ['insight-profile']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })

  const startPdfMut = useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken()
      return api.insights.importPdf(token!, file)
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId)
      // Start polling immediately so the "reading…" state appears at once.
      void queryClient.invalidateQueries({ queryKey: ['import-jobs'] })
    },
  })

  const cancelMut = useMutation({
    mutationFn: async (jobId: string) => {
      const token = await getToken()
      return api.insights.cancelImportJob(token!, jobId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['import-jobs'] }),
  })

  const handleFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    importCsvMut.reset()
    startPdfMut.reset()
    if (isPdf) {
      setActiveJobId(null)
      startPdfMut.mutate(file)
    } else {
      setActiveJobId(null)
      importCsvMut.mutate(file)
    }
  }

  // Upload is a two-step flow, and each step gets exactly one indicator:
  //   1. uploading  — the file is being sent (fast; the PDF POST returns as soon
  //                    as the background job is created, the CSV as soon as parsed)
  //   2. processing — the background read is running (can take a couple of minutes)
  // `pdfProcessing` optimistically holds the processing state from the moment the
  // job id is known until the poll confirms it, so the UI never flickers back to an
  // idle "Upload" button in the gap between the POST resolving and the first poll.
  const uploading = startPdfMut.isPending || importCsvMut.isPending
  const pdfProcessing =
    activeJobId !== null && (activeJob === undefined || activeJob.status === 'processing')
  const csvDone = importCsvMut.isSuccess && !!importCsvMut.data
  const jobDone = activeJob?.status === 'completed' && !!activeJob.result
  const hasResult = jobDone || csvDone
  const busy = uploading || pdfProcessing

  const connections = groupByConnection(accounts)
  const bankGroups = connections.filter((g) => !isUpload(g))
  const uploadGroups = connections.filter(isUpload)
  const hasAccounts = accounts.length > 0
  const isDisconnecting = disconnectMutation.isPending

  const allUploadsSelected =
    uploadGroups.length > 0 && selectedUploads.size === uploadGroups.length
  const toggleUpload = (id: string) =>
    setSelectedUploads((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const toggleAllUploads = () =>
    setSelectedUploads(allUploadsSelected ? new Set() : new Set(uploadGroups.map((g) => g.id)))
  const confirmUploads = () => {
    const ids = [...selectedUploads]
    setConfirm({
      kind: 'uploads',
      ids,
      label: ids.length === 1 ? 'this statement' : `${ids.length} statements`,
      accountCount: ids.length,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <PageTitle>Bank connections</PageTitle>
          <p className="mt-1 text-sm text-content-secondary">Connect your bank account to strengthen your Trust Profile.</p>
        </div>
        {hasAccounts && (
          <Button variant="secondary" onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}>
            {!syncMutation.isPending && <RefreshCw className="h-4 w-4" />}
            {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
          </Button>
        )}
      </div>

      {/* Status banners */}
      {bankConnected && (
        <div className="flex items-center gap-3 rounded-panel bg-success-soft px-4 py-3 text-sm text-success-strong">
          <CheckCircle className="h-4 w-4 shrink-0 text-success-strong" />
          Bank connected successfully — your transactions are being imported.
        </div>
      )}
      {bankError && (
        <div className="flex items-center gap-3 rounded-panel bg-danger-soft px-4 py-3 text-sm text-danger-strong">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger-strong" />
          Something went wrong connecting your bank. Please try again.
        </div>
      )}
      {disconnectMutation.isError && (
        <div className="flex items-center gap-3 rounded-panel bg-danger-soft px-4 py-3 text-sm text-danger-strong">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger-strong" />
          We couldn&apos;t disconnect that bank. Please try again.
        </div>
      )}

      {/* Connections, grouped by bank */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-card bg-surface-hover" />
          ))}
        </div>
      ) : hasAccounts ? (
        <div className="space-y-5">
          {/* Real bank connections — one card per bank */}
          {bankGroups.map((connection) => {
            const isConfirming = confirm?.kind === 'bank' && confirm.ids[0] === connection.id
            return (
              <Card
                key={connection.id}
                padding="none"
                className="overflow-hidden"
              >
                {/* Bank header */}
                <div className="flex items-center gap-4 border-b border-line-subtle px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-900">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-content">{connection.label}</p>
                    <p className="text-xs text-content-muted">
                      {connection.accounts.length}{' '}
                      {connection.accounts.length === 1 ? 'account' : 'accounts'} · Last synced:{' '}
                      {formatDate(connection.lastSyncedAt)}
                    </p>
                  </div>
                  <StatusPill
                    status={connection.connectionStatus === 'active' ? 'success' : 'warning'}
                    label={connection.connectionStatus}
                  />
                  {!isConfirming && (
                    <button
                      onClick={() =>
                        setConfirm({
                          kind: 'bank',
                          ids: [connection.id],
                          label: connection.label,
                          accountCount: connection.accounts.length,
                        })
                      }
                      disabled={isDisconnecting}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-content-muted transition-colors hover:bg-danger-soft hover:text-danger-strong disabled:opacity-50"
                    >
                      <Unlink className="h-4 w-4" />
                      Disconnect
                    </button>
                  )}
                </div>

                {isConfirming && (
                  <DisconnectConfirm
                    title={`Disconnect ${connection.label}?`}
                    body={`This withdraws EquiScore's access to your bank and permanently deletes ${connection.accounts.length} ${connection.accounts.length === 1 ? 'account' : 'accounts'} and their transaction history. Your assessment will be recalculated without this data.`}
                    impact={impact}
                    impactLoading={impactLoading}
                    isDisconnecting={isDisconnecting}
                    onConfirm={() => disconnectMutation.mutate(confirm!.ids)}
                    onCancel={() => setConfirm(null)}
                  />
                )}

                {/* Accounts within this bank */}
                <div className="divide-y divide-line-subtle">
                  {connection.accounts.map((account) => {
                    const Icon = ACCOUNT_TYPE_ICONS[account.accountType]
                    return (
                      <Link
                        key={account.id}
                        href={`/dashboard/connections/${account.id}`}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-900">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-content">{account.accountName}</p>
                          <p className="text-sm text-content-secondary">
                            {ACCOUNT_TYPE_LABELS[account.accountType]}
                          </p>
                        </div>
                        <p className="text-lg font-semibold tabular-nums text-content">
                          {formatBalance(account.currentBalance, account.currency)}
                        </p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
                      </Link>
                    )
                  })}
                </div>
              </Card>
            )
          })}

          {/* Uploaded statements — all grouped under one header, multi-select disconnect */}
          {uploadGroups.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-line-subtle px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-900">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-content">Uploaded statements</p>
                  <p className="text-xs text-content-muted">
                    {uploadGroups.length} {uploadGroups.length === 1 ? 'statement' : 'statements'}
                  </p>
                </div>
                {uploadGroups.length > 1 && (
                  <button
                    onClick={toggleAllUploads}
                    className="text-xs font-medium text-content-secondary transition-colors hover:text-brand-900"
                  >
                    {allUploadsSelected ? 'Clear selection' : 'Select all'}
                  </button>
                )}
                <button
                  onClick={confirmUploads}
                  disabled={selectedUploads.size === 0 || isDisconnecting}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-content-muted transition-colors enabled:hover:bg-danger-soft enabled:hover:text-danger-strong disabled:opacity-40"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect{selectedUploads.size > 0 ? ` (${selectedUploads.size})` : ''}
                </button>
              </div>

              {confirm?.kind === 'uploads' && (
                <DisconnectConfirm
                  title={`Disconnect ${confirm.label}?`}
                  body={`This permanently deletes ${confirm.accountCount} uploaded ${confirm.accountCount === 1 ? 'statement' : 'statements'} and ${confirm.accountCount === 1 ? 'its' : 'their'} transaction history. Your assessment will be recalculated without this data.`}
                  impact={impact}
                  impactLoading={impactLoading}
                  isDisconnecting={isDisconnecting}
                  onConfirm={() => disconnectMutation.mutate(confirm.ids)}
                  onCancel={() => setConfirm(null)}
                />
              )}

              <div className="divide-y divide-line-subtle">
                {uploadGroups.map((group) => {
                  const account = group.accounts[0]!
                  const selected = selectedUploads.has(group.id)
                  return (
                    <div
                      key={group.id}
                      className={cn(
                        'flex items-center gap-3 px-5 py-4 transition-colors',
                        selected ? 'bg-danger-soft/50' : 'hover:bg-surface-hover'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleUpload(group.id)}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-brand"
                        aria-label={`Select statement uploaded ${formatDate(group.lastSyncedAt)}`}
                      />
                      <Link
                        href={`/dashboard/connections/${account.id}`}
                        className="flex min-w-0 flex-1 items-center gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-content">{account.accountName}</p>
                          <p className="text-sm text-content-secondary">
                            {ACCOUNT_TYPE_LABELS[account.accountType]} · Uploaded{' '}
                            {formatDate(group.lastSyncedAt)}
                          </p>
                        </div>
                        <p className="text-lg font-semibold tabular-nums text-content">
                          {formatBalance(account.currentBalance, account.currency)}
                        </p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface-card py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-card bg-brand-50 text-brand-900">
            <Landmark className="h-8 w-8" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-content">No bank connected yet</p>
            <p className="mt-1 text-sm text-content-secondary">
              Linking your bank adds income and spending signals to your trust score.
            </p>
          </div>
        </div>
      )}

      {/* Connect button */}
      <div className={cn(hasAccounts && 'pt-2')}>
        <Button size="lg" onClick={() => connectMutation.mutate()} loading={connectMutation.isPending}>
          {!connectMutation.isPending && <Landmark className="h-4 w-4" />}
          {connectMutation.isPending
            ? 'Redirecting…'
            : hasAccounts
              ? 'Connect another bank'
              : 'Connect your bank'}
        </Button>
        <p className="mt-2 text-xs text-content-muted">
          Powered by TrueLayer · Secure Open Banking · Read-only access
        </p>
        <div className="mt-3">
          <EnableBankingConnect />
        </div>
      </div>

      {/* Upload a statement — the no-open-banking path */}
      <div className="rounded-card border border-dashed border-line bg-surface-inset p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-900">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-content">Can&apos;t connect a bank? Upload a statement</p>
            <p className="mt-0.5 text-sm text-content-secondary">
              Upload a <strong>PDF</strong> bank statement (a download or a photo works), or a{' '}
              <strong>CSV</strong> export from your banking app — we&apos;ll read it and build your
              profile. Nothing is shared without your say-so.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,application/pdf,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            {/* One phase, one indicator. Step 1 uploads the file; step 2 reads it. */}

            {/* Step 1 — the file is being sent. */}
            {uploading && (
              <div className="mt-3 flex items-center gap-2.5 rounded-panel border border-line bg-surface-card px-3.5 py-2.5 text-sm font-medium text-content-secondary">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-900" />
                {startPdfMut.isPending ? 'Uploading your statement…' : 'Reading your statement…'}
              </div>
            )}

            {/* Step 2 — the background read is running. The user is free to leave. */}
            {!uploading && pdfProcessing && (
              <div className="mt-3 rounded-panel border border-line bg-surface-card px-3.5 py-2.5 text-sm text-content-secondary">
                <p className="flex items-center gap-2 font-medium text-content">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-900" />
                  Statement uploaded — reading it now
                </p>
                <p className="mt-1 text-xs text-content-muted">
                  This can take a couple of minutes. You can leave this page or close the tab, and
                  we&apos;ll confirm up top when it&apos;s done.
                </p>
                <button
                  onClick={() => activeJobId && cancelMut.mutate(activeJobId)}
                  disabled={cancelMut.isPending}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-content-muted transition-colors hover:text-danger-strong disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  {cancelMut.isPending ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            )}

            {/* Terminal states */}
            {jobDone && <ImportSummary data={activeJob!.result!} />}
            {csvDone && <ImportSummary data={importCsvMut.data!} />}
            {activeJob?.status === 'failed' && (
              <div className="mt-3 rounded-panel bg-danger-soft px-3.5 py-2.5 text-sm text-danger-strong">
                {activeJob.error || "We couldn't read that statement. Try a clearer copy or a CSV export."}
              </div>
            )}
            {activeJob?.status === 'cancelled' && (
              <div className="mt-3 rounded-panel border border-line bg-surface-card px-3.5 py-2.5 text-sm text-content-secondary">
                Import cancelled. Nothing was saved — you can upload again whenever you&apos;re ready.
              </div>
            )}
            {(startPdfMut.isError || importCsvMut.isError) && (
              <div className="mt-3 rounded-panel bg-danger-soft px-3.5 py-2.5 text-sm text-danger-strong">
                {((startPdfMut.error ?? importCsvMut.error) as Error)?.message ||
                  "We couldn't read that file. Make sure it's a CSV export or a clear PDF."}
              </div>
            )}

            {/* Action — hidden while a file is uploading or being read. */}
            {!busy && (
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {hasResult ? 'Upload another statement' : 'Upload a statement (PDF or CSV)'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type ImpactPreview = {
  current: { overallScore: number; overallTier: string }
  projected: { overallScore: number; overallTier: string }
  delta: number
}

/** Shared disconnect confirmation: warning copy + dry-run score impact + actions. */
function DisconnectConfirm({
  title,
  body,
  impact,
  impactLoading,
  isDisconnecting,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  impact: ImpactPreview | undefined
  impactLoading: boolean
  isDisconnecting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="border-b border-line-subtle bg-danger-soft px-5 py-4">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-strong" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger-strong">{title}</p>
          <p className="mt-1 text-sm text-danger-strong">{body}</p>

          {/* Concrete, dry-run score impact */}
          <div className="mt-3 rounded-panel border border-line bg-surface-card px-3 py-2 text-sm">
            {impactLoading || !impact ? (
              <span className="text-content-secondary">Calculating score impact…</span>
            ) : impact.delta < 0 ? (
              <span className="text-content">
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
              <span className="text-content">
                Your score would stay at{' '}
                <strong>
                  {impact.projected.overallTier} / {impact.projected.overallScore}
                </strong>
                .
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={onConfirm}
              disabled={isDisconnecting}
              loading={isDisconnecting}
            >
              {isDisconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={isDisconnecting}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Shared success summary for a completed import (PDF job result or CSV result). */
function ImportSummary({ data }: { data: StatementImportResult }) {
  return (
    <div className="mt-3 rounded-panel bg-success-soft px-3.5 py-2.5 text-sm text-success-strong">
      Imported <strong>{data.imported}</strong> transactions
      {data.imported > 0 && (
        <>
          {' '}
          ({formatDate(data.coverageStart)} – {formatDate(data.coverageEnd)})
        </>
      )}
      . Your score is now{' '}
      <strong>
        {data.overallTier} / {data.overallScore}
      </strong>
      .{' '}
      <Link
        href="/dashboard/trust-profile/financial-profile"
        className="font-semibold underline underline-offset-2 hover:opacity-80"
      >
        View profile
      </Link>
      {data.ledgerVerified && (
        <span className="mt-1 flex items-center gap-1.5 text-xs text-success-strong">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          Statement ledger verified — every balance reconciles.
        </span>
      )}
      {data.skipped > 0 && (
        <span className="mt-1 block text-xs text-success-strong">
          {data.skipped} rows couldn&apos;t be read and were skipped.
        </span>
      )}
    </div>
  )
}
