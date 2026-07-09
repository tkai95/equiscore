'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { MonthlyFlowChart } from './monthly-flow-chart'
import { CategoryBreakdown } from './category-breakdown'
import { TopMerchants } from './top-merchants'
import { InsightsCard } from './insights-card'
import { InsightProfileView } from './insight-profile-view'

interface Stats {
  avgMonthlyIncome: number
  avgMonthlyExpenses: number
  currentMonthIncome: number
  currentMonthExpenses: number
  currentMonthNet: number
  totalTransactions: number
  monthsOfData: number
  savingsRate: number
}

interface MonthSummary {
  month: string
  income: number
  expenses: number
  net: number
}

interface CategoryData {
  category: string
  label: string
  totalAmount: number
  transactionCount: number
  type: 'income' | 'expense'
  percentage: number
}

interface MerchantData {
  name: string
  totalAmount: number
  transactionCount: number
  category: string
  label: string
}

interface AnalyticsSummary {
  monthlySummary: MonthSummary[]
  categoryBreakdown: CategoryData[]
  topMerchants: MerchantData[]
  stats: Stats
  monthOverMonth: { incomeChangePct: number; expensesChangePct: number }
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

function StatCard({
  label,
  value,
  sub,
  changePct,
}: {
  label: string
  value: string
  sub?: string
  changePct?: number
}) {
  const hasChange = changePct !== undefined
  const up = hasChange && changePct > 0
  const down = hasChange && changePct < 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {hasChange && (
          <>
            {up && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
            {down && <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />}
            {!up && !down && <Minus className="h-3.5 w-3.5 text-gray-400" />}
            <span
              className={`text-xs font-medium ${
                up ? 'text-emerald-600' : down ? 'text-rose-600' : 'text-gray-400'
              }`}
            >
              {changePct > 0 ? '+' : ''}
              {changePct}% vs last month
            </span>
          </>
        )}
        {sub && !hasChange && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  )
}

export function AnalyticsOverview() {
  const { getToken } = useAuth()

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

  const summary = summaryQuery.data
  const { stats, monthOverMonth } = summary ?? {}

  const noData = !summaryQuery.isLoading && summary?.stats.totalTransactions === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="mt-1 text-sm text-gray-500">
          What your bank data says about your income, spending, and reliability — from open banking
          or an uploaded statement.
        </p>
      </div>

      {/* Deterministic insight profile — the primary, explainable view */}
      <InsightProfileView />

      {/* Stats row */}
      {summaryQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : noData ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No transaction data yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Connect a bank account to see your analytics
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Avg Monthly Income"
              value={formatCurrency(stats?.avgMonthlyIncome ?? 0)}
              changePct={monthOverMonth?.incomeChangePct}
            />
            <StatCard
              label="Avg Monthly Expenses"
              value={formatCurrency(stats?.avgMonthlyExpenses ?? 0)}
              changePct={monthOverMonth?.expensesChangePct}
            />
            <StatCard
              label="Savings Rate"
              value={`${stats?.savingsRate ?? 0}%`}
              sub="of monthly income"
            />
            <StatCard
              label="Transactions"
              value={(stats?.totalTransactions ?? 0).toLocaleString()}
              sub={`across ${stats?.monthsOfData ?? 0} months`}
            />
          </div>

          {/* Monthly chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Income vs Expenses</h2>
            <MonthlyFlowChart data={summary?.monthlySummary ?? []} />
          </div>

          {/* Category + Merchants side by side */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Spending by Category</h2>
              <CategoryBreakdown
                data={(summary?.categoryBreakdown ?? []).filter((c) => c.type === 'expense')}
              />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Top Merchants</h2>
              <TopMerchants data={summary?.topMerchants ?? []} />
            </div>
          </div>

          {/* Net flow indicator */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">This Month Net</p>
                <p
                  className={`mt-1 text-xl font-semibold ${
                    (stats?.currentMonthNet ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {(stats?.currentMonthNet ?? 0) >= 0 ? '+' : ''}
                  {formatCurrency(stats?.currentMonthNet ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>
                    In:{' '}
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(stats?.currentMonthIncome ?? 0)}
                    </span>
                  </span>
                  <span>
                    Out:{' '}
                    <span className="font-medium text-rose-600">
                      {formatCurrency(stats?.currentMonthExpenses ?? 0)}
                    </span>
                  </span>
                </div>
              </div>
              {(stats?.currentMonthNet ?? 0) >= 0 ? (
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              ) : (
                <TrendingDown className="h-8 w-8 text-rose-400" />
              )}
            </div>
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
    </div>
  )
}
