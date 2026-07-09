'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation } from '@tanstack/react-query'
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { MonthlyFlowChart } from './monthly-flow-chart'
import { TopMerchants } from './top-merchants'
import { InsightsCard } from './insights-card'
import { InsightProfileView } from './insight-profile-view'

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

interface MerchantData {
  name: string
  totalAmount: number
  transactionCount: number
  category: string
  label: string
}

interface AnalyticsSummary {
  topMerchants: MerchantData[]
}

interface Insight {
  type: 'positive' | 'warning' | 'info'
  title: string
  body: string
}

interface InsightsResponse {
  insights: Insight[]
  generatedAt: string
  unavailable?: boolean
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export function AnalyticsOverview() {
  const { getToken } = useAuth()

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

  const summaryQuery = useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const token = await getToken()
      return api.analytics.summary(token!) as Promise<AnalyticsSummary>
    },
    staleTime: 5 * 60 * 1000,
  })

  const insightsMutation = useMutation<InsightsResponse>({
    mutationFn: async () => {
      const token = await getToken()
      return api.analytics.insights(token!) as Promise<InsightsResponse>
    },
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
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="mt-1 text-sm text-gray-500">
          What your bank data says about your income, spending, and reliability, from Open Banking or
          an uploaded statement.
        </p>
      </div>

      {/* Deterministic insight profile — the primary, explainable view */}
      <InsightProfileView />

      {hasData && (
        <>
          {/* ── Monthly trends ──────────────────────────────────────────── */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Monthly trends
            </h2>
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
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-xs text-gray-500">Strongest surplus month</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {monthLabel(best.month)} · {best.net >= 0 ? '+' : ''}
                      {formatCurrency(best.net)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                  <ArrowDownRight className="h-5 w-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="text-xs text-gray-500">Tightest month</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {monthLabel(tightest.month)} · {tightest.net >= 0 ? '+' : ''}
                      {formatCurrency(tightest.net)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Income vs expenses */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Income vs expenses</h3>
              <MonthlyFlowChart
                data={monthly.map((m) => ({ month: m.month, income: m.income, expenses: m.spend, net: m.net }))}
              />
            </div>
          </div>

          {/* Top merchants */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Top merchants</h2>
            <TopMerchants data={summaryQuery.data?.topMerchants ?? []} />
          </div>

          {/* Optional AI narrative — supplementary to the deterministic profile above */}
          <InsightsCard
            insights={insightsMutation.data?.insights ?? []}
            isLoading={insightsMutation.isPending}
            unavailable={insightsMutation.data?.unavailable}
            hasData
            onGenerate={() => insightsMutation.mutate()}
          />
        </>
      )}

      {!hasData && !profile && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No transaction data yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Connect a bank account or upload a statement to see your trends.
          </p>
        </div>
      )}
    </div>
  )
}
