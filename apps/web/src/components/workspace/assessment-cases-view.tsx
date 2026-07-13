'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { LinkIcon, Plus } from 'lucide-react'
import { workspaceApi } from '@/lib/workspace-api'
import { buttonClasses, Card, PageHeader, PageLayout, StatusPill } from '@/components/ui'
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

export function AssessmentCasesView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['workspace-cases', organisationSlug],
    queryFn: async () => workspaceApi.organisations.cases((await getToken())!, organisationSlug),
  })

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Assessments"
        description="Work through applicant assessments, delivered snapshots, policy outcomes, reviewer state and decisions."
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
      <Card>
        {isLoading ? (
          <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
        ) : cases.length === 0 ? (
          <EmptyWorkspaceState
            title="No assessment cases yet"
            body="Cases will appear here after a company accepts a shared profile or an applicant completes a company request."
          />
        ) : (
          <WorkspaceTable
            columns={['Applicant', 'Type', 'Outcome', 'Status', 'Policy', 'Reviewer', 'Assessed']}
          >
            {cases.map((item) => (
              <tr key={item.id}>
                <Cell>
                  <p className="font-medium">{item.applicant.name}</p>
                  <p className="text-content-muted text-xs">{item.applicant.email}</p>
                </Cell>
                <Cell>{label(item.assessmentType)}</Cell>
                <Cell>
                  <StatusPill
                    status={item.assessmentOutcome === 'meets_criteria' ? 'success' : 'neutral'}
                    label={label(item.assessmentOutcome)}
                  />
                </Cell>
                <Cell muted>{label(item.status)}</Cell>
                <Cell muted>
                  {item.policy ? `${item.policy.name} v${item.policy.versionNumber}` : 'No policy'}
                </Cell>
                <Cell muted>{item.reviewer?.name ?? 'Unassigned'}</Cell>
                <Cell muted>{formatMaybeDate(item.assessedAt ?? item.createdAt)}</Cell>
              </tr>
            ))}
          </WorkspaceTable>
        )}
      </Card>
    </PageLayout>
  )
}
