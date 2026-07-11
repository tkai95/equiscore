'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ClipboardList, FileClock, Gauge, WalletCards } from 'lucide-react'
import { workspaceApi } from '@/lib/workspace-api'
import { Card, Metric, MetricGroup, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'

export function WorkspaceOverview({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['workspace-overview', organisationSlug],
    queryFn: async () => workspaceApi.organisations.overview((await getToken())!, organisationSlug),
  })

  if (isLoading) {
    return (
      <PageLayout width="wide">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-hover" />
        <div className="h-48 animate-pulse rounded-card bg-surface-hover" />
      </PageLayout>
    )
  }

  if (!data) return null

  const { organisation, member, metrics } = data

  return (
    <PageLayout width="wide">
      <PageHeader
        title={organisation.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>partners.equiscore.app/o/{organisation.slug}</span>
            <StatusPill status="neutral" label={member.role.replace('_', ' ')} />
          </span>
        }
        actions={
          <Link
            href={`/workspace/o/${organisation.slug}/assessments`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white"
          >
            Open cases
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-brand" />
          <h2 className="text-lg font-semibold text-content">Workspace overview</h2>
        </div>
        <MetricGroup>
          <Metric label="Open cases" value={metrics.openCases} />
          <Metric label="Awaiting review" value={metrics.awaitingReview} />
          <Metric label="Pending requests" value={metrics.pendingRequests} />
          <Metric label="Credits remaining" value={metrics.remainingCredits} />
        </MetricGroup>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Primary workflows" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkflowLink
              href={`/workspace/o/${organisation.slug}/assessments`}
              icon={ClipboardList}
              title="Assessment cases"
              body="Review delivered snapshots, criterion results, notes and decisions."
            />
            <WorkflowLink
              href={`/workspace/o/${organisation.slug}/requests`}
              icon={FileClock}
              title="Assessment requests"
              body="Create invitations and track applicant completion before delivery."
            />
          </div>
        </Section>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-brand" />
            <h2 className="font-semibold text-content">Usage</h2>
          </div>
          <p className="text-sm text-content-secondary">
            {metrics.usedCredits} assessment credits used against an allowance of{' '}
            {organisation.monthlyAssessmentAllowance}.
          </p>
          <Link
            href={`/workspace/o/${organisation.slug}/usage`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand"
          >
            View usage ledger
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </PageLayout>
  )
}

function WorkflowLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <Link href={href} className="rounded-xl border border-line bg-surface-card p-4 transition-colors hover:bg-surface-hover">
      <Icon className="h-5 w-5 text-brand" />
      <p className="mt-3 font-medium text-content">{title}</p>
      <p className="mt-1 text-sm text-content-secondary">{body}</p>
    </Link>
  )
}
