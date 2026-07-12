'use client'

interface CategoryData {
  category: string
  label: string
  totalAmount: number
  transactionCount: number
  type: 'income' | 'expense'
  percentage: number
}

function formatGBP(value: number) {
  return `£${Math.abs(value).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

// One tonal family — the brand-derived chart palette. No rainbow.
const CATEGORY_COLOURS: Record<string, string> = {
  housing: 'bg-chart-1',
  transport: 'bg-chart-2',
  groceries: 'bg-chart-3',
  eating_out: 'bg-chart-4',
  entertainment: 'bg-chart-5',
  utilities: 'bg-chart-6',
  healthcare: 'bg-chart-7',
  shopping: 'bg-chart-3',
  subscriptions: 'bg-chart-2',
  savings: 'bg-chart-1',
  transfers: 'bg-chart-4',
}

function barColour(category: string) {
  return CATEGORY_COLOURS[category] ?? 'bg-chart-4'
}

export function CategoryBreakdown({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-content-muted">
        No spending data available
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 8)

  return (
    <div className="space-y-3">
      {sorted.map((item) => (
        <div key={item.category}>
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${barColour(item.category)}`} />
              <span className="text-sm text-content-secondary">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-content-muted">{item.transactionCount} txns</span>
              <span className="w-16 text-right text-sm font-medium tabular-nums text-content">
                {formatGBP(item.totalAmount)}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className={`h-full rounded-full ${barColour(item.category)}`}
              style={{ width: `${Math.min(item.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
