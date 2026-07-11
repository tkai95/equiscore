'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { workspaceApi } from '@/lib/workspace-api'
import { Card, PageHeader, PageLayout, StatusPill } from '@/components/ui'
import { Cell, EmptyWorkspaceState, WorkspaceTable, formatMaybeDate, label } from './workspace-table'

export function AssessmentCasesView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['workspace-cases', organisationSlug],
    queryFn: async () => workspaceApi.organisations.cases((await getToken())!, organisationSlug),
  })

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Assessment cases"
        description="Delivered company assessment snapshots, policy outcomes, reviewer state and decisions."
      />
      <Card>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-hover" />
        ) : cases.length === 0 ? (
          <EmptyWorkspaceState
            title="No assessment cases yet"
            body="Cases will appear here after a company accepts a shared profile or an applicant completes a company request."
          />
        ) : (
          <WorkspaceTable columns={['Applicant', 'Type', 'Outcome', 'Status', 'Policy', 'Reviewer', 'Assessed']}>
            {cases.map((item) => (
              <tr key={item.id}>
                <Cell>
                  <p className="font-medium">{item.applicant.name}</p>
                  <p className="text-xs text-content-muted">{item.applicant.email}</p>
                </Cell>
                <Cell>{label(item.assessmentType)}</Cell>
                <Cell>
                  <StatusPill status={item.assessmentOutcome === 'meets_criteria' ? 'success' : 'neutral'} label={label(item.assessmentOutcome)} />
                </Cell>
                <Cell muted>{label(item.status)}</Cell>
                <Cell muted>{item.policy ? `${item.policy.name} v${item.policy.versionNumber}` : 'No policy'}</Cell>
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
