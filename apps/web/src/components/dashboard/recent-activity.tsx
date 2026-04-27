import { CheckCircle, AlertCircle, Info } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'

interface Props {
  score: {
    reasonCodes: Array<{ sentiment: string; message: string }>
    computedAt: string
  } | null | undefined
}

export function RecentActivity({ score }: Props) {
  if (!score) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 font-semibold text-gray-900">Recent signals</h2>
        <p className="text-sm text-gray-500">
          Generate your trust score to see what signals were detected.
        </p>
      </div>
    )
  }

  const positive = score.reasonCodes.filter((r) => r.sentiment === 'positive').slice(0, 3)
  const negative = score.reasonCodes.filter((r) => r.sentiment === 'negative').slice(0, 2)
  const neutral = score.reasonCodes.filter((r) => r.sentiment === 'neutral').slice(0, 1)

  const items = [...positive, ...negative, ...neutral]

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Key signals</h2>
        <span className="text-xs text-gray-400">Updated {formatDate(score.computedAt)}</span>
      </div>
      <div className="space-y-3">
        {items.map((rc, i) => (
          <div key={i} className="flex items-start gap-2.5">
            {rc.sentiment === 'positive' ? (
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            ) : rc.sentiment === 'negative' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage" />
            )}
            <span className="text-sm text-gray-700">{rc.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
