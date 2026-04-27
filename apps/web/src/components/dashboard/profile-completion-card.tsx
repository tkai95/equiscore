'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'

interface Props {
  score: { profileCompletenessScore: number } | null | undefined
  profileStage: string | null
  isLoading: boolean
}

const STAGE_ORDER = [
  'created',
  'onboarding',
  'profile_building',
  'banking_connected',
  'documents_uploaded',
  'scored',
  'complete',
]

const STEPS = [
  { key: 'profile', label: 'Complete your profile', href: '/dashboard/profile', doneFrom: 'profile_building' },
  { key: 'bank', label: 'Connect a bank account', href: '/dashboard/connections', doneFrom: 'banking_connected' },
  { key: 'documents', label: 'Upload supporting documents', href: '/dashboard/documents', doneFrom: 'documents_uploaded' },
  { key: 'score', label: 'Generate your trust score', href: '/dashboard/trust-score', doneFrom: 'scored' },
  { key: 'share', label: 'Share your profile', href: '/dashboard/share', doneFrom: 'complete' },
]

function stageIndex(stage: string | null): number {
  return STAGE_ORDER.indexOf(stage ?? 'created')
}

export function ProfileCompletionCard({ score, profileStage, isLoading }: Props) {
  if (isLoading) {
    return <div className="h-full animate-pulse rounded-2xl bg-gray-100" />
  }

  const currentStageIdx = stageIndex(profileStage)
  const stepsDone = STEPS.filter((s) => currentStageIdx >= stageIndex(s.doneFrom)).length
  const completionPct = Math.round((stepsDone / STEPS.length) * 100)

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Profile completion</h2>
        <span className="text-2xl font-bold text-brand">{completionPct}%</span>
      </div>

      <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      <div className="space-y-3">
        {STEPS.map((step) => {
          const done = currentStageIdx >= stageIndex(step.doneFrom)
          return (
            <div key={step.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300" />
                )}
                <span className={done ? 'text-sm text-gray-400 line-through' : 'text-sm text-gray-700'}>
                  {step.label}
                </span>
              </div>
              {!done && (
                <Link
                  href={step.href}
                  className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark"
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
