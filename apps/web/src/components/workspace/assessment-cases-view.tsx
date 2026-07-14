'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Inbox,
  LinkIcon,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { workspaceApi, type WorkspaceAssessmentCase } from '@/lib/workspace-api'
import {
  buttonClasses,
  Card,
  Metric,
  MetricGroup,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
  type StatusTone,
} from '@/components/ui'
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

type PipelineBucket =
  | 'all'
  | 'new'
  | 'information_requested'
  | 'applicant_responded'
  | 'under_review'
  | 'decision_recorded'

const PIPELINE_BUCKETS: Array<{
  id: PipelineBucket
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    id: 'all',
    label: 'All',
    description: 'Every active assessment case',
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    id: 'new',
    label: 'New',
    description: 'Delivered cases not yet picked up',
    icon: <Inbox className="h-4 w-4" />,
  },
  {
    id: 'information_requested',
    label: 'Information requested',
    description: 'Waiting on the applicant',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'applicant_responded',
    label: 'Applicant responded',
    description: 'Ready for partner review',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    id: 'under_review',
    label: 'Under review',
    description: 'Being assessed by your team',
    icon: <Eye className="h-4 w-4" />,
  },
  {
    id: 'decision_recorded',
    label: 'Decision recorded',
    description: 'Company outcome captured',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
]

const STATUS_TONES: Record<string, StatusTone> = {
  assessment_ready: 'success',
  ready_for_assessment: 'success',
  information_requested: 'warning',
  applicant_responded: 'info',
  under_review: 'info',
  company_decision_recorded: 'success',
  review_complete: 'success',
  meets_criteria: 'success',
  review_required: 'warning',
  information_required: 'warning',
  approved: 'success',
  approved_with_conditions: 'success',
  additional_information_required: 'warning',
  guarantor_or_alternative_route_required: 'warning',
  referred_for_manual_review: 'info',
  declined: 'danger',
  expired_without_decision: 'danger',
  cancelled: 'danger',
  expired: 'neutral',
}

function statusTone(value: string | null | undefined): StatusTone {
  return value ? (STATUS_TONES[value] ?? 'neutral') : 'neutral'
}

function bucketForCase(item: WorkspaceAssessmentCase): PipelineBucket {
  if (item.status === 'information_requested') return 'information_requested'
  if (item.status === 'applicant_responded') return 'applicant_responded'
  if (item.status === 'under_review') return 'under_review'
  if (item.status === 'company_decision_recorded' || item.companyDecision) {
    return 'decision_recorded'
  }
  if (item.status === 'assessment_ready' || item.status === 'ready_for_assessment') return 'new'
  return 'under_review'
}

function matchesBucket(item: WorkspaceAssessmentCase, bucket: PipelineBucket): boolean {
  if (bucket === 'all') return true
  return bucketForCase(item) === bucket
}

function urgencyRank(item: WorkspaceAssessmentCase): number {
  const bucket = bucketForCase(item)
  if (bucket === 'applicant_responded') return 0
  if (bucket === 'new') return 1
  if (bucket === 'under_review') return 2
  if (bucket === 'information_requested') return 3
  if (bucket === 'decision_recorded') return 4
  return 5
}

function searchText(item: WorkspaceAssessmentCase): string {
  return [
    item.applicant.name,
    item.applicant.email,
    item.assessmentType,
    item.status,
    item.assessmentOutcome,
    item.assessmentConfidence,
    item.companyDecision,
    item.reference,
    item.reviewer?.name,
    item.policy?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function countForBucket(items: WorkspaceAssessmentCase[], bucket: PipelineBucket): number {
  return items.filter((item) => matchesBucket(item, bucket)).length
}

function daysSince(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  return Math.floor((Date.now() - timestamp) / 86_400_000)
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  return Math.ceil((timestamp - Date.now()) / 86_400_000)
}

function qualitySignals(item: WorkspaceAssessmentCase): string[] {
  const signals: string[] = []
  const evidenceAge = daysSince(item.snapshot.dataPeriodEnd ?? item.snapshot.createdAt)
  const expiresIn = daysUntil(item.expiresAt)

  if (item.status === 'applicant_responded') signals.push('Applicant responded')
  if (item.status === 'information_requested') signals.push('Waiting on applicant')
  if (item.assessmentConfidence === 'low') signals.push('Low confidence')
  if (
    item.assessmentOutcome === 'information_required' ||
    item.assessmentOutcome === 'unable_to_assess'
  ) {
    signals.push('More evidence needed')
  }
  if (item.snapshot.sourceFreshness === 'profile_only') signals.push('Profile-only')
  if (evidenceAge !== null && evidenceAge > 90) signals.push('Stale evidence')
  if (expiresIn !== null && expiresIn < 0) signals.push('Expired')
  else if (expiresIn !== null && expiresIn <= 7) {
    signals.push(expiresIn === 0 ? 'Expires today' : `Expires in ${expiresIn}d`)
  }
  if (!item.policy) signals.push('No active policy')
  if (signals.length === 0 && item.assessmentOutcome === 'meets_criteria')
    signals.push('Strong profile')

  return signals.slice(0, 3)
}

function qualityTone(item: WorkspaceAssessmentCase): StatusTone {
  const signals = qualitySignals(item)
  if (signals.some((signal) => signal === 'Expired')) return 'danger'
  if (item.status === 'applicant_responded') return 'info'
  if (
    signals.some((signal) =>
      [
        'Low confidence',
        'More evidence needed',
        'Profile-only',
        'Stale evidence',
        'No active policy',
      ].includes(signal)
    )
  ) {
    return 'warning'
  }
  if (signals.includes('Strong profile')) return 'success'
  return 'neutral'
}

function primaryAction(item: WorkspaceAssessmentCase): string {
  const bucket = bucketForCase(item)
  if (bucket === 'applicant_responded') return 'Review response'
  if (bucket === 'information_requested') return 'Awaiting applicant'
  if (bucket === 'decision_recorded') return 'View decision'
  if (bucket === 'new') return 'Review now'
  return 'Continue review'
}

export function AssessmentCasesView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const [activeBucket, setActiveBucket] = useState<PipelineBucket>('all')
  const [search, setSearch] = useState('')
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['workspace-cases', organisationSlug],
    queryFn: async () => workspaceApi.organisations.cases((await getToken())!, organisationSlug),
  })

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase()
    return cases
      .filter((item) => matchesBucket(item, activeBucket))
      .filter((item) => (query ? searchText(item).includes(query) : true))
      .slice()
      .sort((a, b) => {
        const rank = urgencyRank(a) - urgencyRank(b)
        if (rank !== 0) return rank
        const aDate = new Date(a.updatedAt ?? a.assessedAt ?? a.createdAt).getTime()
        const bDate = new Date(b.updatedAt ?? b.assessedAt ?? b.createdAt).getTime()
        return bDate - aDate
      })
  }, [activeBucket, cases, search])

  const needsReviewCount =
    countForBucket(cases, 'new') + countForBucket(cases, 'applicant_responded')
  const qualityIssueCount = cases.filter((item) => qualityTone(item) === 'warning').length
  const expiringSoonCount = cases.filter((item) => {
    const expiresIn = daysUntil(item.expiresAt)
    return expiresIn !== null && expiresIn >= 0 && expiresIn <= 7
  }).length
  const decidedCount = countForBucket(cases, 'decision_recorded')

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Assessments"
        actions={
          <>
            <Link
              href={`/workspace/o/${organisationSlug}/shared`}
              className={buttonClasses('secondary', 'md')}
            >
              <LinkIcon className="h-4 w-4" />
              Import shared link
            </Link>
            <Link
              href={`/workspace/o/${organisationSlug}/requests`}
              className={buttonClasses('primary', 'md')}
            >
              <Plus className="h-4 w-4" />
              Request assessment
            </Link>
          </>
        }
      />

      <Card padding="lg">
        {isLoading ? (
          <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
        ) : cases.length === 0 ? (
          <EmptyWorkspaceState
            title="No assessment cases yet"
            body="Cases will appear here after a company accepts a shared profile or an applicant completes a company request."
          />
        ) : (
          <Section title="Assessment pipeline">
            <MetricGroup className="mb-2 sm:grid-cols-5">
              <Metric label="Total cases" value={cases.length} />
              <Metric label="Needs review" value={needsReviewCount} tone="negative" />
              <Metric label="Quality flags" value={qualityIssueCount} />
              <Metric label="Expiring soon" value={expiringSoonCount} />
              <Metric label="Decision recorded" value={decidedCount} tone="positive" />
            </MetricGroup>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {PIPELINE_BUCKETS.map((bucket) => {
                  const isActive = activeBucket === bucket.id
                  return (
                    <button
                      key={bucket.id}
                      type="button"
                      onClick={() => setActiveBucket(bucket.id)}
                      className={cn(
                        'border-line text-content hover:bg-surface-hover flex min-h-20 items-start gap-3 rounded-lg border bg-white p-3 text-left transition-colors',
                        isActive && 'border-brand bg-brand-50 ring-brand-100 ring-1'
                      )}
                    >
                      <span className="text-brand mt-0.5 shrink-0">{bucket.icon}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{bucket.label}</span>
                          <span className="bg-surface-inset text-content-secondary inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                            {countForBucket(cases, bucket.id)}
                          </span>
                        </span>
                        <span className="text-content-muted mt-1 block text-xs">
                          {bucket.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <label className="block">
                <span className="text-content-muted text-xs font-semibold uppercase tracking-wide">
                  Search queue
                </span>
                <span className="border-line focus-within:border-brand mt-1 flex h-10 items-center gap-2 rounded-lg border bg-white px-3">
                  <Search className="text-content-muted h-4 w-4 shrink-0" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="text-content placeholder:text-content-muted h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                    placeholder="Name, email, reference"
                  />
                </span>
              </label>
            </div>

            {filteredCases.length === 0 ? (
              <EmptyWorkspaceState
                title="No cases in this view"
                body="Try another pipeline stage or clear the search term."
              />
            ) : (
              <WorkspaceTable
                columns={[
                  'Applicant',
                  'Stage',
                  'Quality',
                  'Outcome',
                  'Information',
                  'Decision',
                  'Updated',
                  'Actions',
                ]}
              >
                {filteredCases.map((item) => (
                  <tr key={item.id}>
                    <Cell>
                      <p className="font-medium">{item.applicant.name}</p>
                      <p className="text-content-muted text-xs">{item.applicant.email}</p>
                      <p className="text-content-muted mt-1 text-xs">
                        {label(item.assessmentType)}
                        {item.reference ? ` · ${item.reference}` : ''}
                      </p>
                    </Cell>
                    <Cell>
                      <StatusPill status={statusTone(item.status)} label={label(item.status)} />
                    </Cell>
                    <Cell>
                      <div className="flex max-w-56 flex-wrap gap-1.5">
                        {qualitySignals(item).map((signal) => (
                          <StatusPill
                            key={signal}
                            status={qualityTone(item)}
                            label={signal}
                            icon={
                              signal === 'Strong profile' ? (
                                <CheckCircle2 />
                              ) : signal.startsWith('Expires') ? (
                                <Clock3 />
                              ) : (
                                <AlertTriangle />
                              )
                            }
                          />
                        ))}
                      </div>
                    </Cell>
                    <Cell>
                      <div className="space-y-1">
                        <StatusPill
                          status={statusTone(item.assessmentOutcome)}
                          label={label(item.assessmentOutcome)}
                        />
                        <p className="text-content-muted text-xs">
                          {label(item.assessmentConfidence)} confidence
                        </p>
                      </div>
                    </Cell>
                    <Cell>
                      {item.counts.informationRequests > 0 ? (
                        <StatusPill
                          status={item.status === 'applicant_responded' ? 'info' : 'warning'}
                          label={`${item.counts.informationRequests} request${
                            item.counts.informationRequests === 1 ? '' : 's'
                          }`}
                        />
                      ) : (
                        <span className="text-content-muted">None</span>
                      )}
                    </Cell>
                    <Cell>
                      <StatusPill
                        status={statusTone(item.companyDecision)}
                        label={label(item.companyDecision)}
                      />
                    </Cell>
                    <Cell>
                      <p className="text-content-secondary text-sm">
                        {formatMaybeDate(item.updatedAt ?? item.assessedAt ?? item.createdAt)}
                      </p>
                      <p className="text-content-muted text-xs">
                        {item.reviewer?.name ?? 'Unassigned'}
                      </p>
                    </Cell>
                    <Cell>
                      <Link
                        href={`/workspace/o/${organisationSlug}/assessments/${item.id}`}
                        className={buttonClasses(
                          bucketForCase(item) === 'applicant_responded' ||
                            bucketForCase(item) === 'new'
                            ? 'primary'
                            : 'secondary',
                          'sm'
                        )}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {primaryAction(item)}
                      </Link>
                    </Cell>
                  </tr>
                ))}
              </WorkspaceTable>
            )}
          </Section>
        )}
      </Card>
    </PageLayout>
  )
}
