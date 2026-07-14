'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { workspaceApi } from '@/lib/workspace-api'
import { Card, PageHeader, PageLayout } from '@/components/ui'
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

export function AuditView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['workspace-audit', organisationSlug],
    queryFn: async () => workspaceApi.organisations.audit((await getToken())!, organisationSlug),
  })

  return (
    <PageLayout width="wide">
      <PageHeader title="Audit log" />
      <Card>
        {isLoading ? (
          <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
        ) : events.length === 0 ? (
          <EmptyWorkspaceState
            title="No audit events yet"
            body="Audit events will appear as company users create requests, accept shares, record decisions and consume credits."
          />
        ) : (
          <WorkspaceTable columns={['Action', 'Actor', 'Target', 'Case', 'Time']}>
            {events.map((event) => (
              <tr key={event.id}>
                <Cell>{label(event.action)}</Cell>
                <Cell muted>
                  {event.actorType}
                  {event.actorId ? ` · ${event.actorId}` : ''}
                </Cell>
                <Cell muted>
                  {label(event.targetType)}
                  {event.targetId ? ` · ${event.targetId}` : ''}
                </Cell>
                <Cell muted>{event.assessmentCaseId ?? 'None'}</Cell>
                <Cell muted>{formatMaybeDate(event.createdAt)}</Cell>
              </tr>
            ))}
          </WorkspaceTable>
        )}
      </Card>
    </PageLayout>
  )
}
