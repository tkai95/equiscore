'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/admin-api'
import { Card, PageHeader, PageLayout, Section } from '@/components/ui'
import { AdminTable, Cell, EmptyAdminState, formatMaybeDate, label } from './admin-table'

export function AdminAudit() {
  const { getToken } = useAuth()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => adminApi.audit((await getToken())!),
  })

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Admin audit"
        description="Audit trail for internal admin actions across partner setup and access management."
      />

      <Card padding="lg">
        <Section title="Recent admin actions">
          {isLoading ? (
            <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
          ) : events.length === 0 ? (
            <EmptyAdminState
              title="No admin actions yet"
              body="Organisation creation and partner invites will be recorded here."
            />
          ) : (
            <AdminTable columns={['Action', 'Target', 'Partner', 'Actor', 'Time']}>
              {events.map((event) => (
                <tr key={event.id}>
                  <Cell>{label(event.action)}</Cell>
                  <Cell muted>{label(event.targetType)}</Cell>
                  <Cell>
                    {event.organisation ? (
                      <Link
                        className="text-brand hover:underline"
                        href={`/admin/organisations/${event.organisation.slug}`}
                      >
                        {event.organisation.name}
                      </Link>
                    ) : (
                      <span className="text-content-muted">Platform</span>
                    )}
                  </Cell>
                  <Cell muted>{event.actorEmail ?? 'System'}</Cell>
                  <Cell muted>{formatMaybeDate(event.createdAt)}</Cell>
                </tr>
              ))}
            </AdminTable>
          )}
        </Section>
      </Card>
    </PageLayout>
  )
}
