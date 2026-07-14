'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { workspaceApi } from '@/lib/workspace-api'
import { Card, PageHeader, PageLayout, StatusPill } from '@/components/ui'
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

export function UsageView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['workspace-usage', organisationSlug],
    queryFn: async () => workspaceApi.organisations.usage((await getToken())!, organisationSlug),
  })

  return (
    <PageLayout width="wide">
      <PageHeader title="Usage" />
      <Card>
        {isLoading ? (
          <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
        ) : events.length === 0 ? (
          <EmptyWorkspaceState
            title="No usage events yet"
            body="Credits will be recorded only after successful assessment delivery, refresh, API delivery, or manual adjustment."
          />
        ) : (
          <WorkspaceTable
            columns={['Event', 'Applicant', 'Case', 'Quantity', 'Billing', 'Occurred']}
          >
            {events.map((event) => (
              <tr key={event.id}>
                <Cell>
                  <p className="font-medium">{label(event.eventType)}</p>
                  <p className="text-content-muted text-xs">{label(event.source)}</p>
                </Cell>
                <Cell muted>{event.applicant?.name ?? 'None'}</Cell>
                <Cell muted>
                  {event.assessmentCase?.reference ?? event.assessmentCase?.id ?? 'None'}
                </Cell>
                <Cell>
                  {event.quantity} {label(event.unit)}
                </Cell>
                <Cell>
                  <StatusPill
                    status={event.includedOrOverage === 'overage' ? 'warning' : 'neutral'}
                    label={label(event.includedOrOverage)}
                  />
                </Cell>
                <Cell muted>{formatMaybeDate(event.occurredAt)}</Cell>
              </tr>
            ))}
          </WorkspaceTable>
        )}
      </Card>
    </PageLayout>
  )
}
