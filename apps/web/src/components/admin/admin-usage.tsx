'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/admin-api'
import { Card, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'
import { AdminTable, Cell, EmptyAdminState, formatMaybeDate, label } from './admin-table'

export function AdminUsage() {
  const { getToken } = useAuth()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-usage'],
    queryFn: async () => adminApi.usage((await getToken())!),
  })

  return (
    <PageLayout width="wide">
      <PageHeader title="Platform usage" description="Platform-wide usage event ledger across partner organisations." />

      <Card padding="lg">
        <Section title="Recent usage events">
          {isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-surface-hover" />
          ) : events.length === 0 ? (
            <EmptyAdminState title="No usage events yet" body="Delivered assessments and manual credits will appear here." />
          ) : (
            <AdminTable columns={['Partner', 'Event', 'Applicant', 'Case', 'Quantity', 'Billing', 'Occurred']}>
              {events.map((event) => (
                <tr key={event.id}>
                  <Cell>
                    {event.organisation ? (
                      <Link className="font-medium text-brand hover:underline" href={`/admin/organisations/${event.organisation.slug}`}>
                        {event.organisation.name}
                      </Link>
                    ) : (
                      'Unknown'
                    )}
                  </Cell>
                  <Cell>{label(event.eventType)}</Cell>
                  <Cell muted>{event.applicant?.email ?? 'None'}</Cell>
                  <Cell muted>{event.assessmentCase?.reference ?? event.assessmentCase?.assessmentType ?? 'None'}</Cell>
                  <Cell muted>{event.quantity}</Cell>
                  <Cell>
                    <StatusPill status={event.includedOrOverage === 'overage' ? 'warning' : 'neutral'} label={label(event.includedOrOverage)} />
                  </Cell>
                  <Cell muted>{formatMaybeDate(event.occurredAt)}</Cell>
                </tr>
              ))}
            </AdminTable>
          )}
        </Section>
      </Card>
    </PageLayout>
  )
}
