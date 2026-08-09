'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  LayoutGrid,
  CircleDollarSign,
  CalendarDays,
  Sparkles,
  Gauge,
  Lock,
  Wallet,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { CompassPayload } from '@/lib/compass-types'
import { useMe } from '@/lib/use-me'
import { useCompassActions } from '@/lib/use-compass'
import { cn } from '@/lib/utils'
import { buttonClasses } from '@/components/ui'
import { useImportProcessing } from '@/lib/use-import-state'
import { ImportProcessingNotice } from '@/components/banking/import-processing-notice'
import { BreakdownDrawer, type DrawerSpec } from '@/components/analytics/breakdown-drawer'
import { Card, EmptyState } from './compass-ui'
import {
  BillsSection,
  IncomeSection,
  MoneyMapSection,
  OverviewSection,
  ResilienceSection,
  SavingsSection,
  SpendingSection,
} from './compass-sections'
import { CalendarSection } from './compass-calendar'

type TabId =
  | 'overview'
  | 'income-spending'
  | 'bills-calendar'
  | 'savings-resilience'

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'income-spending', label: 'Income & spending', icon: CircleDollarSign },
  { id: 'bills-calendar', label: 'Bills & calendar', icon: CalendarDays },
  { id: 'savings-resilience', label: 'Savings & resilience', icon: Gauge },
]

const FRESHNESS_LABEL: Record<string, string> = {
  current: 'Up to date',
  expiring_soon: 'Refresh soon',
  expired: 'Out of date',
  evidence_withdrawn: 'Evidence changed',
  insufficient_evidence: 'Limited evidence',
}

export function CompassView() {
  const { getToken } = useAuth()
  const { data: me, isLoading: meLoading } = useMe()
  const actions = useCompassActions()
  const [tab, setTab] = useState<TabId>('overview')
  const [drawer, setDrawer] = useState<DrawerSpec | null>(null)

  const entitled = !!me?.compassEnabled

  const { data, isLoading, isError } = useQuery<CompassPayload>({
    queryKey: ['compass'],
    enabled: entitled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => api.compass.get((await getToken())!),
  })

  if (meLoading) return <Skeleton />
  if (!entitled) return <Upsell />

  return (
    <div className="space-y-6">
      <Header status={data?.status ?? null} asOf={data?.asOf ?? null} months={data?.monthsOfHistory ?? 0} />

      {/* Section tabs */}
      <div className="-mx-1 overflow-x-auto">
        <div className="flex gap-1 px-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-brand-900 text-white' : 'text-content-secondary hover:bg-surface-hover hover:text-content',
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <Skeleton bare />
      ) : isError || !data ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="We couldn't load My Money"
          body="Please refresh the page. If this keeps happening, your evidence may still be processing."
        />
      ) : !data.hasData ? (
        <NoData />
      ) : (
        <div>
          {tab === 'overview' && (
            <div className="space-y-6">
              <OverviewSection data={data} onDrill={setDrawer} actions={actions} />
              <MoneyMapSection data={data} />
            </div>
          )}
          {tab === 'income-spending' && (
            <div className="space-y-6">
              <IncomeSection data={data} onDrill={setDrawer} />
              <SpendingSection data={data} onDrill={setDrawer} />
            </div>
          )}
          {tab === 'bills-calendar' && (
            <div className="space-y-6">
              <CalendarSection data={data} />
              <BillsSection data={data} onDrill={setDrawer} actions={actions} />
            </div>
          )}
          {tab === 'savings-resilience' && (
            <div className="space-y-6">
              <ResilienceSection data={data} />
              <SavingsSection data={data} actions={actions} />
            </div>
          )}
        </div>
      )}

      <BreakdownDrawer spec={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}

function Header({ status, asOf, months }: { status: string | null; asOf: string | null; months: number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2.5 text-[28px] font-semibold text-content">
          <Wallet className="h-7 w-7 text-brand-900" />
          My Money
        </h1>
        <p className="mt-1 text-sm text-content-secondary">
          Understand what comes in, where it goes, what is coming up, and how resilient your position looks.
        </p>
      </div>
      {status && (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-card px-3 py-2 text-xs text-content-secondary">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              status === 'current' ? 'bg-success-strong' : status === 'expiring_soon' ? 'bg-warning-bar' : 'bg-content-muted',
            )}
          />
          {FRESHNESS_LABEL[status] ?? 'Status'}
          {months > 0 && <span className="text-content-muted">· {months} mo of history</span>}
        </div>
      )}
    </div>
  )
}

function Upsell() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-card border border-line bg-surface-card">
        <div className="bg-brand-900 px-8 py-10 text-cream-surface">
          <Wallet className="mb-3 h-8 w-8" />
          <h1 className="text-2xl font-semibold">My Money</h1>
          <p className="mt-2 max-w-lg text-sm text-cream-surface/80">
            The financial clarity layer of EquiScore. Understand your income, spending, bills, resilience, and the
            money patterns that support your Trust Profile.
          </p>
        </div>
        <div className="px-8 py-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ['Money Map', 'See income, transfers and savings flow, with own-account movement never double counted.'],
              ['Income & spending', 'Genuine income separated from transfers, plus where every pound goes.'],
              ['Bills & reliability', 'Your recurring commitments and how consistently you meet them.'],
              ['Resilience & savings', 'Your buffer, surplus and practical ways to save.'],
            ].map(([t, d]) => (
              <li key={t} className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-900" />
                <span>
                  <span className="block text-sm font-medium text-content">{t}</span>
                  <span className="block text-sm text-content-secondary">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-surface-inset px-3 py-2 text-sm text-content-secondary">
              <Lock className="h-4 w-4" />
              My Money is part of a subscription plan
            </div>
            <Link
              href="/dashboard"
              className="rounded-lg border border-line bg-surface-card px-4 py-2 text-sm font-medium text-content hover:bg-surface-hover"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function NoData() {
  const isImporting = useImportProcessing()
  return (
    <EmptyState
      icon={<Wallet className="h-8 w-8" />}
      title="My Money needs some financial evidence first"
      body="Upload a bank statement to map your income, spending, bills and savings."
      action={
        isImporting ? (
          <ImportProcessingNotice />
        ) : (
          <Link href="/dashboard/connections" className={buttonClasses('primary')}>
            Upload a statement
          </Link>
        )
      }
    />
  )
}

function Skeleton({ bare }: { bare?: boolean }) {
  const body = (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-hover" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-hover" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-card bg-surface-hover" />
    </div>
  )
  if (bare) return <Card>{body}</Card>
  return <div className="space-y-6">{body}</div>
}
