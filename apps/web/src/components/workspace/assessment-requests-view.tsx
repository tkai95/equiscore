'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { workspaceApi } from '@/lib/workspace-api'
import { Card, PageHeader, PageLayout, StatusPill } from '@/components/ui'
import { Cell, EmptyWorkspaceState, WorkspaceTable, formatMaybeDate, label } from './workspace-table'

export function AssessmentRequestsView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['workspace-requests', organisationSlug],
    queryFn: async () => workspaceApi.organisations.requests((await getToken())!, organisationSlug),
  })

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Assessment requests"
        description="Company-initiated invitations before they become delivered assessment cases."
      />
      <Card>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-hover" />
        ) : requests.length === 0 ? (
          <EmptyWorkspaceState
            title="No assessment requests yet"
            body="The next build slice will add request creation and applicant consent completion."
          />
        ) : (
          <WorkspaceTable columns={['Applicant', 'Type', 'Status', 'Reference', 'Commitment', 'Deadline', 'Created']}>
            {requests.map((request) => (
              <tr key={request.id}>
                <Cell>
                  <p className="font-medium">{request.applicant.name}</p>
                  <p className="text-xs text-content-muted">{request.applicant.email}</p>
                </Cell>
                <Cell>{label(request.assessmentType)}</Cell>
                <Cell>
                  <StatusPill status="neutral" label={label(request.status)} />
                </Cell>
                <Cell muted>{request.reference ?? 'None'}</Cell>
                <Cell muted>{request.proposedCommitment ? `£${request.proposedCommitment.toLocaleString('en-GB')}` : 'Not set'}</Cell>
                <Cell muted>{formatMaybeDate(request.deadline)}</Cell>
                <Cell muted>{formatMaybeDate(request.createdAt)}</Cell>
              </tr>
            ))}
          </WorkspaceTable>
        )}
      </Card>
    </PageLayout>
  )
}
