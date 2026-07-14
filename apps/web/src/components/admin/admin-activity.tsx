'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/admin-api'
import { Card, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'
import { AdminTable, Cell, EmptyAdminState, formatMaybeDate, label } from './admin-table'

export function AdminActivity() {
  const { getToken } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => adminApi.activity((await getToken())!),
  })

  return (
    <PageLayout width="wide">
      <PageHeader title="Partner activity" />

      {isLoading ? (
        <div className="rounded-card bg-surface-hover h-40 animate-pulse" />
      ) : data ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card padding="lg">
            <Section title="Recent active members">
              {data.members.length === 0 ? (
                <EmptyAdminState
                  title="No partner activity yet"
                  body="Partner members will appear here after they open the workspace."
                />
              ) : (
                <AdminTable columns={['User', 'Partner', 'Role', 'Last active']}>
                  {data.members.map((member) => (
                    <tr key={member.id}>
                      <Cell>
                        <div className="font-medium">{member.user.name}</div>
                        <div className="text-content-muted text-xs">{member.user.email}</div>
                      </Cell>
                      <Cell>
                        <Link
                          className="text-brand hover:underline"
                          href={`/admin/organisations/${member.organisation.slug}`}
                        >
                          {member.organisation.name}
                        </Link>
                      </Cell>
                      <Cell muted>{label(member.role)}</Cell>
                      <Cell muted>{formatMaybeDate(member.lastActiveAt)}</Cell>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </Section>
          </Card>

          <Card padding="lg">
            <Section title="Recent invitations">
              {data.invitations.length === 0 ? (
                <EmptyAdminState
                  title="No invitations yet"
                  body="Partner invitations created from admin will appear here."
                />
              ) : (
                <AdminTable columns={['Email', 'Partner', 'Role', 'Status', 'Created']}>
                  {data.invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <Cell>{invitation.email}</Cell>
                      <Cell>
                        <Link
                          className="text-brand hover:underline"
                          href={`/admin/organisations/${invitation.organisation.slug}`}
                        >
                          {invitation.organisation.name}
                        </Link>
                      </Cell>
                      <Cell muted>{label(invitation.role)}</Cell>
                      <Cell>
                        <StatusPill
                          status={
                            invitation.status === 'accepted'
                              ? 'success'
                              : invitation.status === 'pending'
                                ? 'info'
                                : 'neutral'
                          }
                          label={label(invitation.status)}
                        />
                      </Cell>
                      <Cell muted>{formatMaybeDate(invitation.createdAt)}</Cell>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </Section>
          </Card>
        </div>
      ) : null}
    </PageLayout>
  )
}
