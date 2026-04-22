import { cn, DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from '@/lib/utils'

interface SubScores {
  profileCompletenessScore: number
  verificationStrengthScore: number
  identityConfidenceScore: number
  incomeStabilityScore: number
  affordabilityScore: number
  rentalReliabilityScore: number
  financialStabilityScore: number
}

export function SubScoreGrid({ score }: { score: SubScores }) {
  const dimensions: Array<{ key: keyof SubScores }> = [
    { key: 'profileCompletenessScore' },
    { key: 'verificationStrengthScore' },
    { key: 'identityConfidenceScore' },
    { key: 'incomeStabilityScore' },
    { key: 'affordabilityScore' },
    { key: 'rentalReliabilityScore' },
    { key: 'financialStabilityScore' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {dimensions.map(({ key }) => {
        const rawKey = key.replace('Score', '')
        const value = Math.round(score[key])
        const label = DIMENSION_LABELS[rawKey] ?? rawKey
        const desc = DIMENSION_DESCRIPTIONS[rawKey] ?? ''
        const color =
          value >= 70
            ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
            : value >= 50
              ? 'text-blue-600 bg-blue-50 border-blue-200'
              : value >= 30
                ? 'text-amber-600 bg-amber-50 border-amber-200'
                : 'text-red-600 bg-red-50 border-red-200'
        const barColor =
          value >= 70
            ? 'bg-emerald-500'
            : value >= 50
              ? 'bg-blue-500'
              : value >= 30
                ? 'bg-amber-500'
                : 'bg-red-400'

        return (
          <div key={key} className={cn('rounded-xl border p-4', color)}>
            <div className="mb-1 flex items-start justify-between">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xl font-bold">{value}</span>
            </div>
            <p className="mb-3 text-xs opacity-75">{desc}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className={cn('h-full rounded-full', barColor)}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
