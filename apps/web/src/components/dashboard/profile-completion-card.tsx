'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import type { TrustTier } from '@equiscore/shared'

interface Props {
  score: { profileCompletenessScore: number } | null | undefined
  isLoading: boolean
}

const STEPS = [
  { key: 'profile', label: 'Complete your profile', href: '/dashboard/profile' },
  { key: 'bank', label: 'Connect a bank account', href: '/dashboard/connections' },
  { key: 'documents', label: 'Upload supporting documents', href: '/dashboard/documents' },
  { key: 'score', label: 'Generate your trust score', href: '/dashboard/trust-score' },
  { key: 'share', label: 'Share your profile', href: '/dashboard/share' },
]

export function ProfileCompletionCard({ score, isLoading }: Props) {
  const completionPct = score ? Math.round(score.profileCompletenessScore) : 0

  if (isLoading) {
    return <div className="h-full animate-pulse rounded-2xl bg-gray-100" />
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Profile completion</h2>
        <span className="text-2xl font-bold text-blue-600">{completionPct}%</span>
      </div>

      <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const done = completionPct > (i / STEPS.length) * 100
          return (
            <div key={step.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300" />
                )}
                <span className={done ? 'text-sm text-gray-500 line-through' : 'text-sm text-gray-700'}>
                  {step.label}
                </span>
              </div>
              {!done && (
                <Link
                  href={step.href}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Start <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
