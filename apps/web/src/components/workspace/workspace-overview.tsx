'use client'

import Link from 'next/link'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ClipboardList, FileClock, Gauge, Lock, WalletCards } from 'lucide-react'
import { workspaceApi } from '@/lib/workspace-api'
import {
  Button,
  Card,
  Metric,
  MetricGroup,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
} from '@/components/ui'
import { EmptyWorkspaceState } from './workspace-table'

export function WorkspaceOverview({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspace-overview', organisationSlug],
    queryFn: async () => workspaceApi.organisations.overview((await getToken())!, organisationSlug),
  })

  if (isLoading) {
    return (
      <PageLayout width="wide">
        <div className="bg-surface-hover h-8 w-64 animate-pulse rounded" />
        <div className="rounded-card bg-surface-hover h-48 animate-pulse" />
      </PageLayout>
    )
  }

  if (isError) {
    return (
      <PageLayout width="wide">
        <PageHeader
          title="Partner workspace access required"
          description={`partners.equiscore.app/o/${organisationSlug}`}
        />
        <Card padding="lg">
          <div className="bg-surface-inset text-brand mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full">
            <Lock className="h-5 w-5" />
          </div>
          <EmptyWorkspaceState
            title="This account is not authorised for this organisation"
            body={`You are signed in as ${
              user?.primaryEmailAddress?.emailAddress ?? 'this account'
            }. Ask an EquiScore admin or your organisation owner to invite the correct email address.`}
          />
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void signOut({ redirectUrl: '/sign-in' })}
            >
              Switch account
            </Button>
          </div>
        </Card>
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
            className="bg-brand inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
          >
            Open cases
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="text-brand h-4 w-4" />
          <h2 className="text-content text-lg font-semibold">Workspace overview</h2>
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
              title="Applicant intake"
              body="Request applicant assessments or import existing consumer share links."
            />
          </div>
        </Section>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <WalletCards className="text-brand h-4 w-4" />
            <h2 className="text-content font-semibold">Usage</h2>
          </div>
          <p className="text-content-secondary text-sm">
            {metrics.usedCredits} assessment credits used against an allowance of{' '}
            {organisation.monthlyAssessmentAllowance}.
          </p>
          <Link
            href={`/workspace/o/${organisation.slug}/usage`}
            className="text-brand mt-4 inline-flex items-center gap-2 text-sm font-medium"
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
    <Link
      href={href}
      className="border-line bg-surface-card hover:bg-surface-hover rounded-xl border p-4 transition-colors"
    >
      <Icon className="text-brand h-5 w-5" />
      <p className="text-content mt-3 font-medium">{title}</p>
      <p className="text-content-secondary mt-1 text-sm">{body}</p>
    </Link>
  )
}
