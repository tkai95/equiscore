'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthSummary {
  month: string
  income: number
  expenses: number
  net: number
}

function formatMonthKey(key: string): string {
  const parts = key.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1]) - 1
  return new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function formatGBP(value: number) {
  return `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const income = payload.find((p) => p.name === 'Income')?.value ?? 0
  const expenses = payload.find((p) => p.name === 'Expenses')?.value ?? 0
  const net = income - expenses

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-gray-500">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Income
          </span>
          <span className="font-medium text-gray-900">{formatGBP(income)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Expenses
          </span>
          <span className="font-medium text-gray-900">{formatGBP(expenses)}</span>
        </div>
        <div className="mt-1 border-t border-gray-100 pt-1 flex items-center justify-between gap-6">
          <span className="text-gray-500">Net</span>
          <span className={`font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {net >= 0 ? '+' : ''}
            {formatGBP(net)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function MonthlyFlowChart({ data }: { data: MonthSummary[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No monthly data available
      </div>
    )
  }

  const chartData = data.map((d) => ({
    month: formatMonthKey(d.month),
    Income: d.income,
    Expenses: d.expenses,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `£${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
        />
        <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
