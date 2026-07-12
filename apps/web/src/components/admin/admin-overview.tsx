'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import {
  Card,
  Metric,
  MetricGroup,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
} from '@/components/ui'
import { AdminTable, Cell, EmptyAdminState, formatMaybeDate, label } from './admin-table'

export function AdminOverview() {
  const { getToken } = useAuth()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => adminApi.overview((await getToken())!),
  })

  return (
    <PageLayout width="wide">
      <PageHeader
        title="EquiScore admin"
        description="Create partner organisations, monitor usage and keep operational access separate from partner workspaces."
      />

      {isError && (
        <Card padding="lg">
          <EmptyAdminState title="Admin access unavailable" body={(error as Error).message} />
        </Card>
      )}

      {isLoading ? (
        <div className="rounded-card bg-surface-hover h-40 animate-pulse" />
      ) : data ? (
        <>
          <Card padding="lg">
            <Section
              title={
                <span className="flex items-center gap-2">
                  <ShieldCheck className="text-brand h-4 w-4" />
                  Platform snapshot
                </span>
              }
            >
              <MetricGroup>
                <Metric label="Partners" value={data.metrics.totalOrganisations} />
                <Metric label="Active partners" value={data.metrics.activeOrganisations} />
                <Metric label="Usage this month" value={data.metrics.usageThisMonth} />
                <Metric label="Active members 30d" value={data.metrics.activePartnerMembers30d} />
                <Metric label="Consumers" value={data.metrics.totalConsumers} />
                <Metric label="Consumer sign-ups" value={data.metrics.consumerSignupsThisMonth} />
              </MetricGroup>
            </Section>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card padding="lg">
              <Section title="Recent partner organisations">
                {data.recentOrganisations.length === 0 ? (
                  <EmptyAdminState
                    title="No partners yet"
                    body="Create the first partner organisation from the organisations view."
                  />
                ) : (
                  <div className="divide-line-subtle divide-y">
                    {data.recentOrganisations.map((organisation) => (
                      <Link
                        key={organisation.id}
                        href={`/admin/organisations/${organisation.slug}`}
                        className="hover:bg-surface-hover flex items-center justify-between gap-4 rounded-lg py-4 transition-colors sm:px-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-content font-medium">{organisation.name}</p>
                            <StatusPill
                              status={organisation.status === 'active' ? 'success' : 'warning'}
                              label={label(organisation.status)}
                            />
                          </div>
                          <p className="text-content-muted mt-1 text-sm">
                            {organisation.metrics.activeMembers} active members ·{' '}
                            {organisation.metrics.usageThisMonth} credits this month
                          </p>
                        </div>
                        <ArrowRight className="text-content-muted h-4 w-4 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </Section>
            </Card>

            <Card padding="lg">
              <Section title="Recent admin actions">
                {data.recentAuditEvents.length === 0 ? (
                  <EmptyAdminState
                    title="No admin audit yet"
                    body="Admin actions will appear here as organisations and invites are managed."
                  />
                ) : (
                  <AdminTable columns={['Action', 'Partner', 'Actor', 'Time']}>
                    {data.recentAuditEvents.map((event) => (
                      <tr key={event.id}>
                        <Cell>{label(event.action)}</Cell>
                        <Cell muted>{event.organisation?.name ?? 'Platform'}</Cell>
                        <Cell muted>{event.actorEmail ?? 'System'}</Cell>
                        <Cell muted>{formatMaybeDate(event.createdAt)}</Cell>
                      </tr>
                    ))}
                  </AdminTable>
                )}
              </Section>
            </Card>
          </div>
        </>
      ) : null}
    </PageLayout>
  )
}
