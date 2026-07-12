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

// Brand-derived chart palette (resolved hex of the design tokens).
// Income = chart-2 (deep green), expenses = warning-bar (amber). One tonal family.
const INCOME_COLOUR = '#3d6658'
const EXPENSE_COLOUR = '#ad781a'
const GRID_COLOUR = '#e9ece8'
const AXIS_COLOUR = '#707b76'
const CURSOR_COLOUR = '#f2f4f1'

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
    <div className="rounded-panel border border-line bg-surface-card px-4 py-3 shadow-card">
      <p className="mb-2 text-xs font-semibold text-content-muted">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-content-secondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INCOME_COLOUR }} />
            Income
          </span>
          <span className="font-medium tabular-nums text-content">{formatGBP(income)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-content-secondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXPENSE_COLOUR }} />
            Expenses
          </span>
          <span className="font-medium tabular-nums text-content">{formatGBP(expenses)}</span>
        </div>
        <div className="mt-1 border-t border-line-subtle pt-1 flex items-center justify-between gap-6">
          <span className="text-content-muted">Net</span>
          <span
            className={`font-semibold tabular-nums ${net >= 0 ? 'text-success-strong' : 'text-danger-strong'}`}
          >
            {net >= 0 ? '+' : ''}
            {formatGBP(net)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function MonthlyFlowChart({
  data,
  onSelectMonth,
}: {
  data: MonthSummary[]
  onSelectMonth?: (monthKey: string) => void
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-content-muted">
        No monthly data available
      </div>
    )
  }

  const chartData = data.map((d) => ({
    key: d.month,
    month: formatMonthKey(d.month),
    Income: d.income,
    Expenses: d.expenses,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        barCategoryGap="30%"
        barGap={4}
        onClick={(state) => {
          const key = (state as { activePayload?: Array<{ payload?: { key?: string } }> })
            ?.activePayload?.[0]?.payload?.key
          if (key && onSelectMonth) onSelectMonth(key)
        }}
        className={onSelectMonth ? 'cursor-pointer' : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOUR} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: AXIS_COLOUR }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `£${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          tick={{ fontSize: 11, fill: AXIS_COLOUR }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: CURSOR_COLOUR }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
        />
        <Bar dataKey="Income" fill={INCOME_COLOUR} radius={[3, 3, 0, 0]} />
        <Bar dataKey="Expenses" fill={EXPENSE_COLOUR} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
