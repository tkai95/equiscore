'use client'

interface MerchantData {
  name: string
  totalAmount: number
  transactionCount: number
  category: string
  label: string
}

function formatGBP(value: number) {
  return `£${Math.abs(value).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

export function TopMerchants({ data }: { data: MerchantData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        No merchant data available
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 8)
  const max = sorted[0]?.totalAmount ?? 1

  return (
    <div className="space-y-3">
      {sorted.map((merchant) => (
        <div key={merchant.name} className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold uppercase text-gray-500">
            {merchant.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-gray-800">{merchant.name}</span>
              <span className="shrink-0 text-sm font-medium text-gray-900">
                {formatGBP(merchant.totalAmount)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-rose-400"
                  style={{ width: `${(merchant.totalAmount / max) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-gray-400">
                {merchant.transactionCount} txns
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
