'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ScoreRing } from './score-ring'
import { TierBadge } from './tier-badge'
import { ReasonCodeList } from './reason-code-list'
import { SubScoreGrid } from './sub-score-grid'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { formatDate, TIER_COLORS } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TIER_LABELS } from '@equiscore/shared'
import { cn } from '@/lib/utils'

interface TrustScoreData {
  id: string
  overallScore: number
  overallTier: TrustTier
  profileCompletenessScore: number
  verificationStrengthScore: number
  identityConfidenceScore: number
  incomeStabilityScore: number
  affordabilityScore: number
  rentalReliabilityScore: number
  financialStabilityScore: number
  fraudRisk: string
  reasonCodes: Array<{ code: string; dimension: string; sentiment: string; message: string; weight: number }>
  computedAt: string
}

export function TrustScoreView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const { data: score, isLoading } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!, 'general') as Promise<TrustScoreData | null>
    },
  })

  const recompute = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return api.scores.recompute(token!, 'general')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['score'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Trust Score</h1>
          {score && (
            <p className="text-sm text-gray-500">Last updated {formatDate(score.computedAt)}</p>
          )}
        </div>
        <button
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface hover:bg-brand-dark disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', recompute.isPending && 'animate-spin')} />
          {score ? 'Refresh score' : 'Generate score'}
        </button>
      </div>

      {!score && !recompute.isPending && (
        <div className="rounded-2xl border border-[#D8D6C9] bg-cream p-8 text-center">
          <p className="mb-4 text-gray-700">
            You don&apos;t have a trust score yet. Click &quot;Generate score&quot; to create your
            first profile assessment.
          </p>
          <p className="text-sm text-gray-500">
            The more information you&apos;ve added, the more accurate and confident your score will
            be.
          </p>
        </div>
      )}

      {score && (
        <>
          {/* Hero */}
          <div className={cn('rounded-2xl border-2 p-8', TIER_COLORS[score.overallTier])}>
            <div className="flex flex-col items-center gap-6 lg:flex-row">
              <ScoreRing score={score.overallScore} tier={score.overallTier} size={160} />
              <div className="flex-1 text-center lg:text-left">
                <div className="mb-3 flex justify-center lg:justify-start">
                  <TierBadge tier={score.overallTier} size="lg" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                  {TIER_LABELS[score.overallTier]}
                </h2>
                <p className="text-gray-600">
                  Your trust profile has been assessed across 7 dimensions. The score reflects the
                  strength and consistency of your verified evidence — not a moral judgment.
                </p>
                {score.fraudRisk !== 'pass' && (
                  <div className="mt-4 flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Some signals require additional review</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sub-scores */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-2 font-semibold text-gray-900">Score breakdown</h2>
            <p className="mb-6 text-sm text-gray-500">
              Each dimension is scored separately so you know exactly what&apos;s strong and what
              needs improvement.
            </p>
            <SubScoreGrid score={score} />
          </div>

          {/* Reason codes */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-2 font-semibold text-gray-900">What shaped your score</h2>
            <p className="mb-6 text-sm text-gray-500">
              Every signal is explainable. Here&apos;s what we found in your data.
            </p>
            <ReasonCodeList reasonCodes={score.reasonCodes} />
          </div>
        </>
      )}
    </div>
  )
}
