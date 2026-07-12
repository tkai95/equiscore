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
    return <p className="text-sm text-content-muted">No signals available yet.</p>
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
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-content-muted">{empty}</p>
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
  positive: { accent: 'border-l-success-strong bg-success-soft', Icon: ArrowUpRight, icon: 'text-success-strong' },
  negative: { accent: 'border-l-danger-strong bg-danger-soft', Icon: ArrowDownRight, icon: 'text-danger-strong' },
  neutral: { accent: 'border-l-warning-strong bg-warning-soft', Icon: Minus, icon: 'text-warning-strong' },
} as const

function ReasonCodeRow({ rc }: { rc: ReasonCode }) {
  const dimLabel = DIMENSION_LABELS[rc.dimension] ?? rc.dimension
  const tone = TONE[(rc.sentiment as keyof typeof TONE) ?? 'neutral'] ?? TONE.neutral
  const Icon = tone.Icon

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-l-4 border-line-subtle ${tone.accent} p-3`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-content-secondary">{rc.message}</p>
        <p className="mt-1 inline-block rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-content-secondary ring-1 ring-line">
          {dimLabel}
        </p>
      </div>
    </div>
  )
}
