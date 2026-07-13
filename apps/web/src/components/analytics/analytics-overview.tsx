'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Card, PageTitle, Section } from '@/components/ui'
import { MonthlyFlowChart } from './monthly-flow-chart'
import { InsightProfileView } from './insight-profile-view'
import { BreakdownDrawer, type DrawerSpec } from './breakdown-drawer'

interface MonthlyPoint {
  month: string
  income: number
  spend: number
  essentialSpend: number
  net: number
  surplusAfterEssentials: number
}

interface Profile {
  period: { transactionCount: number; months: number }
  income: { averageMonthlyIncome: number }
  expenses: { averageMonthlySpend: number; essentialShare: number }
  monthly: MonthlyPoint[]
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card padding="none" className="p-5">
      <p className="text-sm text-content-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-content">{value}</p>
      {sub && <p className="mt-1 text-sm text-content-muted">{sub}</p>}
    </Card>
  )
}

/** Section heading moved inside the panel: header · divider · content. */
function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-4 border-b border-line-subtle px-5 py-4">
        <h3 className="text-base font-semibold text-content">{title}</h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

export function AnalyticsOverview() {
  const { getToken } = useAuth()
  const [monthDrawer, setMonthDrawer] = useState<DrawerSpec | null>(null)

  // Shares the ['insight-profile'] cache with InsightProfileView, so the monthly
  // trends come from the same deterministic engine as everything above — one
  // source of truth, no second fetch.
  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['insight-profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.insights.getProfile(token!) as Promise<Profile | null>
    },
    staleTime: 5 * 60 * 1000,
  })

  const hasData = (profile?.period.transactionCount ?? 0) > 0
  const monthly = profile?.monthly ?? []
  const latest = monthly[monthly.length - 1]

  const avgIncome = profile?.income.averageMonthlyIncome ?? 0
  const avgSpend = profile?.expenses.averageMonthlySpend ?? 0
  const avgSurplus = avgIncome - avgSpend
  const surplusPct = avgIncome > 0 ? Math.round((avgSurplus / avgIncome) * 100) : 0
  const avgSurplusAfterEssentials = avgIncome - avgSpend * (profile?.expenses.essentialShare ?? 0)

  const rankedByNet = [...monthly].sort((a, b) => b.net - a.net)
  const best = rankedByNet[0]
  const tightest = rankedByNet.length > 1 ? rankedByNet[rankedByNet.length - 1] : undefined

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Financial Profile</PageTitle>
        <p className="mt-1 max-w-2xl text-sm text-content-secondary">
          The financial facts and behaviours EquiScore found in your evidence, and how they support your assessment.
        </p>
      </div>

      {/* Deterministic insight profile — the primary, explainable view */}
      <InsightProfileView />

      {hasData && (
        <>
          {/* ── Monthly trends ──────────────────────────────────────────── */}
          <Section title="Monthly trends">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label={`Latest month${latest ? ` · ${monthLabel(latest.month)}` : ''}`}
                value={`${latest && latest.net >= 0 ? '+' : ''}${formatCurrency(latest?.net ?? 0)}`}
                sub={
                  latest
                    ? `In ${formatCurrency(latest.income)} · Out ${formatCurrency(latest.spend)}`
                    : undefined
                }
              />
              <StatCard
                label="Average monthly surplus"
                value={`${avgSurplus >= 0 ? '+' : ''}${formatCurrency(avgSurplus)}`}
                sub={`${surplusPct}% of income · ${formatCurrency(avgIncome)} in, ${formatCurrency(avgSpend)} out`}
              />
              <StatCard
                label="Surplus after essentials"
                value={`${avgSurplusAfterEssentials >= 0 ? '+' : ''}${formatCurrency(avgSurplusAfterEssentials)}`}
                sub="Income minus essential costs, per month"
              />
            </div>

            {/* Best / tightest month */}
            {best && tightest && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card padding="none" className="flex items-center gap-3 p-4">
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-success-strong" />
                  <div>
                    <p className="text-xs text-content-muted">Strongest surplus month</p>
                    <p className="text-sm font-semibold tabular-nums text-content">
                      {monthLabel(best.month)} · {best.net >= 0 ? '+' : ''}
                      {formatCurrency(best.net)}
                    </p>
                  </div>
                </Card>
                <Card padding="none" className="flex items-center gap-3 p-4">
                  <ArrowDownRight className="h-5 w-5 shrink-0 text-danger-strong" />
                  <div>
                    <p className="text-xs text-content-muted">Tightest month</p>
                    <p className="text-sm font-semibold tabular-nums text-content">
                      {monthLabel(tightest.month)} · {tightest.net >= 0 ? '+' : ''}
                      {formatCurrency(tightest.net)}
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* Income vs expenses */}
            <Panel
              title="Income vs expenses"
              action={<span className="text-sm text-content-muted">Tap a month for detail</span>}
            >
              <MonthlyFlowChart
                data={monthly.map((m) => ({ month: m.month, income: m.income, expenses: m.spend, net: m.net }))}
                onSelectMonth={(m) =>
                  setMonthDrawer({ type: 'month', key: m, title: monthLabel(m), subtitle: 'Cashflow for this month' })
                }
              />
            </Panel>
          </Section>
        </>
      )}

      {!hasData && !profile && (
        <Card padding="none" className="border-dashed p-10 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-content-muted" />
          <p className="mt-3 text-sm font-medium text-content">No transaction data yet</p>
          <p className="mt-1 text-xs text-content-muted">
            Connect a bank account or upload a statement to see your trends.
          </p>
        </Card>
      )}

      <BreakdownDrawer spec={monthDrawer} onClose={() => setMonthDrawer(null)} />
    </div>
  )
}
