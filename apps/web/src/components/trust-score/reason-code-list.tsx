import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { DIMENSION_LABELS } from '@/lib/utils'

interface ReasonCode {
  code: string
  dimension: string
  sentiment: string
  message: string
  weight: number
}

const byWeight = (a: ReasonCode, b: ReasonCode) => (b.weight ?? 0) - (a.weight ?? 0)

export function ReasonCodeList({ reasonCodes }: { reasonCodes: ReasonCode[] }) {
  const helping = reasonCodes.filter((r) => r.sentiment === 'positive').sort(byWeight)
  // Negatives first (they hurt most), then neutrals (evidence gaps).
  const holding = reasonCodes
    .filter((r) => r.sentiment !== 'positive')
    .sort((a, b) => {
      if (a.sentiment !== b.sentiment) return a.sentiment === 'negative' ? -1 : 1
      return byWeight(a, b)
    })

  if (reasonCodes.length === 0) {
    return <p className="text-sm text-gray-400">No signals available yet.</p>
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Column
        title="What&apos;s helping"
        empty="Add financial evidence to build positive signals."
        items={helping}
      />
      <Column
        title="What could be stronger"
        empty="Nothing is materially weighing your score down."
        items={holding}
      />
    </div>
  )
}

function Column({ title, empty, items }: { title: string; empty: string; items: ReasonCode[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((rc) => (
            <ReasonCodeRow key={rc.code} rc={rc} />
          ))}
        </div>
      )}
    </div>
  )
}

const TONE = {
  positive: { accent: 'border-l-emerald-400 bg-emerald-50/40', Icon: ArrowUpRight, icon: 'text-emerald-500' },
  negative: { accent: 'border-l-rose-400 bg-rose-50/40', Icon: ArrowDownRight, icon: 'text-rose-500' },
  neutral: { accent: 'border-l-amber-300 bg-amber-50/40', Icon: Minus, icon: 'text-amber-500' },
} as const

function ReasonCodeRow({ rc }: { rc: ReasonCode }) {
  const dimLabel = DIMENSION_LABELS[rc.dimension] ?? rc.dimension
  const tone = TONE[(rc.sentiment as keyof typeof TONE) ?? 'neutral'] ?? TONE.neutral
  const Icon = tone.Icon

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-l-4 border-gray-100 ${tone.accent} p-3`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700">{rc.message}</p>
        <p className="mt-1 inline-block rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-gray-100">
          {dimLabel}
        </p>
      </div>
    </div>
  )
}
