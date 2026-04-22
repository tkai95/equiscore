'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TierBadge } from '@/components/trust-score/tier-badge'
import { ScoreRing } from '@/components/trust-score/score-ring'
import { ProfileCompletionCard } from './profile-completion-card'
import { QuickActions } from './quick-actions'
import { RecentActivity } from './recent-activity'
import type { TrustTier } from '@equiscore/shared'
import { TIER_LABELS } from '@equiscore/shared'
import { cn } from '@/lib/utils'

export function DashboardOverview() {
  const { getToken } = useAuth()

  const { data: score, isLoading } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!, 'general') as Promise<{
        overallScore: number
        overallTier: TrustTier
        profileCompletenessScore: number
        verificationStrengthScore: number
        incomeStabilityScore: number
        affordabilityScore: number
        rentalReliabilityScore: number
        reasonCodes: Array<{ sentiment: string; message: string }>
        computedAt: string
      } | null>
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your dashboard</h1>
        <p className="text-gray-600">Track your trust profile and see how to improve it.</p>
      </div>

      {/* Hero row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trust tier card */}
        <div className="col-span-1 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <p className="mb-2 text-sm font-medium text-gray-500">Overall trust tier</p>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
          ) : score ? (
            <div className="flex flex-col items-center gap-4">
              <ScoreRing score={score.overallScore} tier={score.overallTier} size={120} />
              <TierBadge tier={score.overallTier} />
              <p className="text-center text-sm text-gray-600">
                {TIER_LABELS[score.overallTier]}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-gray-100">
                <span className="text-3xl font-bold text-gray-300">—</span>
              </div>
              <p className="text-center text-sm text-gray-500">
                Complete your profile to generate your trust score
              </p>
            </div>
          )}
        </div>

        {/* Profile completion */}
        <div className="col-span-2">
          <ProfileCompletionCard score={score} isLoading={isLoading} />
        </div>
      </div>

      {/* Dimension breakdown */}
      {score && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-semibold text-gray-900">Score breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Verification', value: score.verificationStrengthScore },
              { label: 'Income Stability', value: score.incomeStabilityScore },
              { label: 'Affordability', value: score.affordabilityScore },
              { label: 'Rental Reliability', value: score.rentalReliabilityScore },
              { label: 'Profile Completeness', value: score.profileCompletenessScore },
            ].map(({ label, value }) => (
              <ScoreDimensionBar key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <QuickActions hasScore={!!score} />
        <RecentActivity score={score} />
      </div>
    </div>
  )
}

function ScoreDimensionBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value)
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400'

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900">{pct}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
