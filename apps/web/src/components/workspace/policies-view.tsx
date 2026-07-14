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

export function PoliciesView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['workspace-policies', organisationSlug],
    queryFn: async () => workspaceApi.organisations.policies((await getToken())!, organisationSlug),
  })

  return (
    <PageLayout width="wide">
      <PageHeader title="Policies" />
      <Card>
        {isLoading ? (
          <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
        ) : policies.length === 0 ? (
          <EmptyWorkspaceState
            title="No policies yet"
            body="The first policy engine slice will create a default rental affordability policy, then add versioned editing."
          />
        ) : (
          <WorkspaceTable
            columns={['Policy', 'Type', 'Status', 'Latest version', 'Owner', 'Updated']}
          >
            {policies.map((policy) => (
              <tr key={policy.id}>
                <Cell>
                  <p className="font-medium">{policy.name}</p>
                  <p className="text-content-muted text-xs">
                    {policy.versionCount} version{policy.versionCount === 1 ? '' : 's'}
                  </p>
                </Cell>
                <Cell>{label(policy.assessmentType)}</Cell>
                <Cell>
                  <StatusPill
                    status={policy.status === 'active' ? 'success' : 'neutral'}
                    label={label(policy.status)}
                  />
                </Cell>
                <Cell muted>
                  {policy.latestVersion
                    ? `v${policy.latestVersion.versionNumber} · ${label(policy.latestVersion.status)}`
                    : 'None'}
                </Cell>
                <Cell muted>{policy.createdBy?.name ?? 'System'}</Cell>
                <Cell muted>{formatMaybeDate(policy.updatedAt)}</Cell>
              </tr>
            ))}
          </WorkspaceTable>
        )}
      </Card>
    </PageLayout>
  )
}
