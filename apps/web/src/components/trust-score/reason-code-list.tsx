import { CheckCircle2, XCircle, Info } from 'lucide-react'
import { DIMENSION_LABELS } from '@/lib/utils'

interface ReasonCode {
  code: string
  dimension: string
  sentiment: string
  message: string
  weight: number
}

export function ReasonCodeList({ reasonCodes }: { reasonCodes: ReasonCode[] }) {
  const positive = reasonCodes.filter((r) => r.sentiment === 'positive')
  const negative = reasonCodes.filter((r) => r.sentiment === 'negative')
  const neutral = reasonCodes.filter((r) => r.sentiment === 'neutral')

  return (
    <div className="space-y-6">
      {positive.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-emerald-700">What&apos;s working well</h3>
          <div className="space-y-2">
            {positive.map((rc) => (
              <ReasonCodeRow key={rc.code} rc={rc} />
            ))}
          </div>
        </div>
      )}

      {neutral.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-blue-700">
            Areas where more evidence would help
          </h3>
          <div className="space-y-2">
            {neutral.map((rc) => (
              <ReasonCodeRow key={rc.code} rc={rc} />
            ))}
          </div>
        </div>
      )}

      {negative.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-red-700">Signals that reduced confidence</h3>
          <div className="space-y-2">
            {negative.map((rc) => (
              <ReasonCodeRow key={rc.code} rc={rc} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReasonCodeRow({ rc }: { rc: ReasonCode }) {
  const dimLabel = DIMENSION_LABELS[rc.dimension] ?? rc.dimension

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
      {rc.sentiment === 'positive' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
      ) : rc.sentiment === 'negative' ? (
        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700">{rc.message}</p>
        <p className="mt-0.5 text-xs text-gray-400">{dimLabel}</p>
      </div>
    </div>
  )
}
