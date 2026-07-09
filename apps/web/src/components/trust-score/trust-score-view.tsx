'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ScoreImprovements } from '@/lib/api'
import { ScoreRing } from './score-ring'
import { ReasonCodeList } from './reason-code-list'
import { SubScoreGrid } from './sub-score-grid'
import Link from 'next/link'
import { RefreshCw, AlertTriangle, Clock, Landmark, Upload, ArrowUpRight, ArrowRight } from 'lucide-react'
import { formatDate, TIER_COLORS } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TIER_LABELS } from '@equiscore/shared'
import { cn } from '@/lib/utils'

type ScoreDisplayStatus =
  | 'current'
  | 'expiring_soon'
  | 'expired'
  | 'evidence_withdrawn'
  | 'insufficient_evidence'

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
  status?: ScoreDisplayStatus
  isCurrent?: boolean
  financialDataAsOf?: string | null
  validUntil?: string | null
}

/** Action-oriented copy for the applicant (recipients get more neutral wording). */
const APPLICANT_STATUS: Record<
  Exclude<ScoreDisplayStatus, 'current'>,
  { tone: 'amber' | 'gray'; title: string; body: string }
> = {
  expiring_soon: {
    tone: 'amber',
    title: 'Your score is expiring soon',
    body: 'Sync your bank or upload a newer statement to keep it current for anyone you share it with.',
  },
  expired: {
    tone: 'gray',
    title: 'Your score has expired',
    body: 'It was based on financial evidence that is now more than three months old. Refresh your bank data or upload a newer statement to make it current again.',
  },
  evidence_withdrawn: {
    tone: 'gray',
    title: 'Your score is no longer backed by active evidence',
    body: 'Reconnect a bank account or upload a statement to restore a current, verifiable score.',
  },
  insufficient_evidence: {
    tone: 'gray',
    title: 'Add financial evidence to verify your score',
    body: 'Connect a bank account or upload a bank statement so your score is backed by real financial data.',
  },
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

  const { data: improvements } = useQuery<ScoreImprovements>({
    queryKey: ['score-improvements'],
    enabled: !!score,
    queryFn: async () => {
      const token = await getToken()
      return api.scores.improvements(token!, 'general')
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
            <p className="text-sm text-gray-500">
              Last updated {formatDate(score.computedAt)}
              {score.isCurrent && score.validUntil && (
                <> · Current until {formatDate(score.validUntil)}</>
              )}
            </p>
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

      {/* Freshness — the applicant's own view of what recipients will see */}
      {score && score.status && score.status !== 'current' && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-2xl px-5 py-4 ring-1',
            APPLICANT_STATUS[score.status].tone === 'amber'
              ? 'bg-amber-50 text-amber-900 ring-amber-200'
              : 'bg-gray-100 text-gray-700 ring-gray-300'
          )}
        >
          <Clock
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              APPLICANT_STATUS[score.status].tone === 'amber' ? 'text-amber-600' : 'text-gray-500'
            )}
          />
          <div>
            <p className="font-semibold">{APPLICANT_STATUS[score.status].title}</p>
            <p className="mt-1 text-sm opacity-90">{APPLICANT_STATUS[score.status].body}</p>
            {score.financialDataAsOf && (
              <p className="mt-1 text-sm opacity-75">
                Based on financial evidence up to {formatDate(score.financialDataAsOf)}.
              </p>
            )}
          </div>
        </div>
      )}

      {!score && !recompute.isPending && (
        <div className="rounded-2xl border border-[#D8D6C9] bg-cream p-8 text-center">
          <p className="mb-1 font-semibold text-gray-900">Add your financial data to get a score</p>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-600">
            Your Trust Score is built from real financial evidence. Connect a bank via open banking,
            or upload a bank statement — then generate your score.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/connections"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-cream-surface shadow-sm transition-colors hover:bg-brand-dark"
            >
              <Landmark className="h-4 w-4" />
              Connect a bank
            </Link>
            <Link
              href="/dashboard/connections"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Upload a statement
            </Link>
          </div>
        </div>
      )}

      {score && (
        <>
          {/* Hero */}
          <div className={cn('rounded-2xl border-2 p-8', TIER_COLORS[score.overallTier])}>
            <div className="flex flex-col items-center gap-6 lg:flex-row">
              <ScoreRing score={score.overallScore} tier={score.overallTier} size={160} />
              <div className="flex-1 text-center lg:text-left">
                <p className="text-3xl font-bold text-gray-900">Trust Profile: {score.overallTier}</p>
                <p className="mt-1 text-lg font-medium text-gray-500">
                  Score{' '}
                  <span className="font-semibold tabular-nums text-gray-900">{score.overallScore}</span> /
                  100
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">
                  {TIER_LABELS[score.overallTier]}
                </h2>
                {score.fraudRisk !== 'pass' && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-amber-700 lg:justify-start">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Some signals require additional review</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* How to raise your score — the action layer */}
          {improvements && improvements.improvements.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-1 flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-brand" />
                <h2 className="font-semibold text-gray-900">How to raise your score</h2>
              </div>
              <p className="mb-5 text-sm text-gray-500">
                The highest-impact steps for your profile, with the points each would add.
              </p>
              <div className="space-y-3">
                {improvements.improvements.map((imp) => (
                  <Link
                    key={imp.id}
                    href={imp.href}
                    className="group flex items-center gap-4 rounded-xl border border-gray-200 p-4 transition-colors hover:border-brand/40 hover:bg-cream/40"
                  >
                    {imp.estimatedGain !== null && (
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <span className="text-lg font-bold leading-none">+{imp.estimatedGain}</span>
                        <span className="text-[10px] font-medium uppercase">points</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{imp.title}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{imp.detail}</p>
                      {imp.reachesTier && imp.reachesTier !== score.overallTier && (
                        <p className="mt-1 text-xs font-medium text-emerald-600">
                          Would reach Trust Profile: {imp.reachesTier}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sub-scores */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-2 font-semibold text-gray-900">What makes up your score</h2>
            <p className="mb-6 text-sm text-gray-500">
              Seven dimensions, scored separately, so you know exactly what is strong and what needs
              work.
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
