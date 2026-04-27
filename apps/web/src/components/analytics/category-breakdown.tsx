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

const CATEGORY_COLOURS: Record<string, string> = {
  housing: 'bg-brand',
  transport: 'bg-violet-500',
  groceries: 'bg-emerald-500',
  eating_out: 'bg-orange-500',
  entertainment: 'bg-pink-500',
  utilities: 'bg-cyan-500',
  healthcare: 'bg-red-500',
  shopping: 'bg-amber-500',
  subscriptions: 'bg-brand-mid',
  savings: 'bg-teal-500',
  transfers: 'bg-gray-400',
}

function barColour(category: string) {
  return CATEGORY_COLOURS[category] ?? 'bg-gray-400'
}

export function CategoryBreakdown({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
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
              <span className="text-sm text-gray-700">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{item.transactionCount} txns</span>
              <span className="w-16 text-right text-sm font-medium text-gray-900">
                {formatGBP(item.totalAmount)}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
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
