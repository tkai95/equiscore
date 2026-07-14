'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { adminApi, type AdminConsumer } from '@/lib/admin-api'
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
import { AdminTable, Cell, EmptyAdminState, formatMaybeDate, label } from './admin-table'

function consumerStatusTone(status: string) {
  if (status === 'active') return 'success' as const
  if (status === 'suspended') return 'warning' as const
  if (status === 'deleted') return 'danger' as const
  return 'neutral' as const
}

function scoreLabel(user: AdminConsumer): string {
  if (!user.latestScore) return 'Not scored'
  return `${Math.round(user.latestScore.overallScore)} / 100 · ${label(user.latestScore.overallTier)}`
}

function accessLabel(user: AdminConsumer): string {
  const parts = []
  if (user.internalAdmin) parts.push(`Admin: ${label(user.internalAdmin.role)}`)
  if (user.partnerMemberships.length > 0) {
    parts.push(
      user.partnerMemberships
        .map((membership) => `${membership.organisation.name} (${label(membership.role)})`)
        .join(', ')
    )
  }

  return parts.length > 0 ? parts.join(' · ') : 'Consumer only'
}

export function AdminConsumers() {
  const { getToken } = useAuth()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-consumers', query],
    queryFn: async () => adminApi.consumers((await getToken())!, query),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setQuery(search.trim())
  }

  return (
    <PageLayout width="wide">
      <PageHeader title="Consumer support" />

      {isError && (
        <Card padding="lg">
          <EmptyAdminState title="Consumer view unavailable" body={(error as Error).message} />
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
                  <Users className="text-brand h-4 w-4" />
                  Consumer snapshot
                </span>
              }
            >
              <MetricGroup>
                <Metric label="Consumers" value={data.metrics.totalConsumers} />
                <Metric label="Sign-ups this month" value={data.metrics.signupsThisMonth} />
                <Metric label="Active consumers 30d" value={data.metrics.activeConsumers30d} />
                <Metric label="Scored consumers" value={data.metrics.scoredConsumers} />
                <Metric label="Bank connected" value={data.metrics.bankConnectedConsumers} />
              </MetricGroup>
            </Section>
          </Card>

          <Card padding="lg">
            <Section title="Consumer accounts">
              <form onSubmit={submit} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label
                    className="text-content block text-sm font-medium"
                    htmlFor="consumer-search"
                  >
                    Search by name or email
                  </label>
                  <div className="relative mt-1">
                    <Search className="text-content-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <input
                      id="consumer-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="border-line focus:border-brand w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none"
                      placeholder="mohammed@example.com"
                    />
                  </div>
                </div>
                <Button type="submit">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </form>

              {data.users.length === 0 ? (
                <EmptyAdminState
                  title="No consumers found"
                  body="Try another name or email address."
                />
              ) : (
                <AdminTable
                  columns={[
                    'Consumer',
                    'Status',
                    'Profile',
                    'Score',
                    'Evidence',
                    'Access',
                    'Latest activity',
                    'Created',
                  ]}
                >
                  {data.users.map((user) => (
                    <tr key={user.id}>
                      <Cell>
                        <div className="font-medium">{user.profile?.fullName ?? user.email}</div>
                        <div className="text-content-muted text-xs">{user.email}</div>
                      </Cell>
                      <Cell>
                        <StatusPill
                          status={consumerStatusTone(user.status)}
                          label={label(user.status)}
                        />
                      </Cell>
                      <Cell muted>{label(user.profile?.profileStage)}</Cell>
                      <Cell muted>{scoreLabel(user)}</Cell>
                      <Cell muted>
                        {user.counts.bankConnections} bank · {user.counts.documents} docs
                      </Cell>
                      <Cell muted className="max-w-[300px] truncate">
                        {accessLabel(user)}
                      </Cell>
                      <Cell muted>
                        {user.latestActivity
                          ? `${label(user.latestActivity.eventType)} · ${formatMaybeDate(
                              user.latestActivity.createdAt
                            )}`
                          : 'No activity'}
                      </Cell>
                      <Cell muted>{formatMaybeDate(user.createdAt)}</Cell>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </Section>
          </Card>
        </>
      ) : null}
    </PageLayout>
  )
}
