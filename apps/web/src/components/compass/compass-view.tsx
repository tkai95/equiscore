'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Compass as CompassIcon,
  LayoutGrid,
  Waypoints,
  CircleDollarSign,
  ShoppingBag,
  CalendarClock,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Gauge,
  Lock,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { CompassPayload } from '@/lib/compass-types'
import { useMe } from '@/lib/use-me'
import { useCompassActions } from '@/lib/use-compass'
import { cn } from '@/lib/utils'
import { BreakdownDrawer, type DrawerSpec } from '@/components/analytics/breakdown-drawer'
import { Card, EmptyState } from './compass-ui'
import {
  BillsSection,
  ImpactSection,
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
  | 'calendar'
  | 'money-map'
  | 'income'
  | 'spending'
  | 'bills'
  | 'resilience'
  | 'savings'
  | 'impact'

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'money-map', label: 'Money Map', icon: Waypoints },
  { id: 'income', label: 'Income', icon: CircleDollarSign },
  { id: 'spending', label: 'Spending', icon: ShoppingBag },
  { id: 'bills', label: 'Bills', icon: CalendarClock },
  { id: 'resilience', label: 'Resilience', icon: Gauge },
  { id: 'savings', label: 'Savings', icon: Sparkles },
  { id: 'impact', label: 'Score impact', icon: ShieldCheck },
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
    <div className="mx-auto max-w-6xl space-y-6">
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
                  active ? 'bg-brand text-cream-surface' : 'text-charcoal-mid hover:bg-brand-50 hover:text-charcoal',
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
          icon={<CompassIcon className="h-8 w-8" />}
          title="We couldn't load Compass"
          body="Please refresh the page. If this keeps happening, your evidence may still be processing."
        />
      ) : !data.hasData ? (
        <NoData />
      ) : (
        <div>
          {tab === 'overview' && <OverviewSection data={data} onDrill={setDrawer} actions={actions} />}
          {tab === 'calendar' && <CalendarSection data={data} />}
          {tab === 'money-map' && <MoneyMapSection data={data} />}
          {tab === 'income' && <IncomeSection data={data} onDrill={setDrawer} />}
          {tab === 'spending' && <SpendingSection data={data} onDrill={setDrawer} />}
          {tab === 'bills' && <BillsSection data={data} onDrill={setDrawer} actions={actions} />}
          {tab === 'resilience' && <ResilienceSection data={data} />}
          {tab === 'savings' && <SavingsSection data={data} actions={actions} />}
          {tab === 'impact' && <ImpactSection data={data} />}
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
        <h1 className="flex items-center gap-2.5 text-[28px] font-semibold text-gray-900">
          <CompassIcon className="h-7 w-7 text-brand" />
          Compass
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your money, explained. What you earn, where it goes, and how to strengthen your position.
        </p>
      </div>
      {status && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              status === 'current' ? 'bg-emerald-500' : status === 'expiring_soon' ? 'bg-amber-400' : 'bg-gray-300',
            )}
          />
          {FRESHNESS_LABEL[status] ?? 'Status'}
          {months > 0 && <span className="text-gray-400">· {months} mo of history</span>}
        </div>
      )}
    </div>
  )
}

function Upsell() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="bg-brand px-8 py-10 text-cream-surface">
          <CompassIcon className="mb-3 h-8 w-8" />
          <h1 className="text-2xl font-semibold">EquiScore Compass</h1>
          <p className="mt-2 max-w-lg text-sm text-cream-surface/80">
            The financial clarity layer of EquiScore. Understand your income, control your spending, review your
            recurring bills, and see exactly how your money strengthens your Trust Portfolio.
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
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{t}</span>
                  <span className="block text-sm text-gray-500">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
              <Lock className="h-4 w-4" />
              Compass is part of a subscription plan
            </div>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
  return (
    <EmptyState
      icon={<CompassIcon className="h-8 w-8" />}
      title="Compass needs some financial evidence first"
      body="Connect a bank account or upload a statement, and Compass will map your income, spending, bills and savings."
    />
  )
}

function Skeleton({ bare }: { bare?: boolean }) {
  const body = (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
    </div>
  )
  if (bare) return <Card>{body}</Card>
  return <div className="mx-auto max-w-6xl space-y-6">{body}</div>
}
