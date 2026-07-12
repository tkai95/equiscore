'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MailPlus, RefreshCw, Users, XCircle } from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { absolutePartnerUrl } from '@/lib/app-urls'
import {
  Button,
  Card,
  Metric,
  MetricGroup,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
  buttonClasses,
} from '@/components/ui'
import { AdminTable, Cell, EmptyAdminState, formatMaybeDate, label } from './admin-table'

const ROLES = ['owner', 'admin', 'policy_admin', 'reviewer', 'manager', 'billing_admin', 'auditor']

export function AdminOrganisationDetail({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-organisation', organisationSlug],
    queryFn: async () => adminApi.organisations.detail((await getToken())!, organisationSlug),
  })

  const invite = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return adminApi.organisations.invite(token!, organisationSlug, { email, role })
    },
    onSuccess: () => {
      setEmail('')
      setRole('admin')
      void queryClient.invalidateQueries({ queryKey: ['admin-organisation', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return adminApi.organisations.resendInvitation(token!, organisationSlug, invitationId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-organisation', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return adminApi.organisations.revokeInvitation(token!, organisationSlug, invitationId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-organisation', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (email.trim()) invite.mutate()
  }

  const copyInviteLink = async (invitationId: string, slug: string) => {
    await navigator.clipboard.writeText(absolutePartnerUrl(`/o/${slug}`))
    setCopiedInvitationId(invitationId)
    setTimeout(() => setCopiedInvitationId(null), 1800)
  }

  const actionError = (resendInvitation.error ?? revokeInvitation.error) as Error | null

  return (
    <PageLayout width="wide">
      <PageHeader
        title={data?.name ?? 'Partner organisation'}
        description={
          data
            ? `/${data.slug} · ${label(data.status)} · ${data.metrics.usageThisMonth} credits this month`
            : undefined
        }
      />

      {isError && (
        <Card padding="lg">
          <EmptyAdminState title="Organisation unavailable" body={(error as Error).message} />
        </Card>
      )}

      {isLoading ? (
        <div className="rounded-card bg-surface-hover h-48 animate-pulse" />
      ) : data ? (
        <>
          <Card padding="lg">
            <Section title="Partner snapshot">
              <MetricGroup>
                <Metric
                  label="Members"
                  value={data.members.filter((member) => member.status === 'active').length}
                />
                <Metric
                  label="Pending invites"
                  value={data.invitations.filter((item) => item.status === 'pending').length}
                />
                <Metric label="Assessment cases" value={data.metrics.assessmentCases} />
                <Metric label="Usage this month" value={data.metrics.usageThisMonth} />
              </MetricGroup>
            </Section>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card padding="lg">
              <Section
                title={
                  <span className="flex items-center gap-2">
                    <Users className="text-brand h-4 w-4" />
                    Members
                  </span>
                }
              >
                {data.members.length === 0 ? (
                  <EmptyAdminState
                    title="No members yet"
                    body="Invite the first partner owner or admin."
                  />
                ) : (
                  <AdminTable columns={['User', 'Role', 'Status', 'Joined', 'Last active']}>
                    {data.members.map((member) => (
                      <tr key={member.id}>
                        <Cell>
                          <div className="font-medium">{member.user.name}</div>
                          <div className="text-content-muted text-xs">{member.user.email}</div>
                        </Cell>
                        <Cell muted>{label(member.role)}</Cell>
                        <Cell>
                          <StatusPill
                            status={member.status === 'active' ? 'success' : 'warning'}
                            label={label(member.status)}
                          />
                        </Cell>
                        <Cell muted>{formatMaybeDate(member.joinedAt)}</Cell>
                        <Cell muted>{formatMaybeDate(member.lastActiveAt)}</Cell>
                      </tr>
                    ))}
                  </AdminTable>
                )}
              </Section>
            </Card>

            <Card padding="lg" className="self-start">
              <Section
                title={
                  <span className="flex items-center gap-2">
                    <MailPlus className="text-brand h-4 w-4" />
                    Invite partner user
                  </span>
                }
              >
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label
                      className="text-content block text-sm font-medium"
                      htmlFor="invite-email"
                    >
                      Email
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-content block text-sm font-medium" htmlFor="invite-role">
                      Role
                    </label>
                    <select
                      id="invite-role"
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    >
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {label(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {invite.isError && (
                    <p className="text-danger-strong text-sm">{(invite.error as Error).message}</p>
                  )}
                  {invite.data && (
                    <div className="bg-surface-inset text-content-secondary rounded-lg p-3 text-sm">
                      Invite created for {invite.data.email}. It will be claimed when that user
                      signs in.
                    </div>
                  )}
                  <Button type="submit" loading={invite.isPending} disabled={!email.trim()}>
                    {!invite.isPending && <MailPlus className="h-4 w-4" />}
                    {invite.isPending ? 'Inviting...' : 'Invite user'}
                  </Button>
                </form>
              </Section>
            </Card>
          </div>

          <Card padding="lg">
            <Section title="Pending and recent invitations">
              {actionError && (
                <p className="text-danger-strong mb-4 text-sm">{actionError.message}</p>
              )}
              {data.invitations.length === 0 ? (
                <EmptyAdminState
                  title="No invitations"
                  body="Invites created from admin will appear here."
                />
              ) : (
                <AdminTable columns={['Email', 'Role', 'Status', 'Expires', 'Created', 'Actions']}>
                  {data.invitations.map((invitation) => {
                    const canCopy = invitation.status === 'pending'
                    const canManage =
                      invitation.status === 'pending' || invitation.status === 'expired'
                    return (
                      <tr key={invitation.id}>
                        <Cell>{invitation.email}</Cell>
                        <Cell muted>{label(invitation.role)}</Cell>
                        <Cell>
                          <StatusPill
                            status={
                              invitation.status === 'pending'
                                ? 'info'
                                : invitation.status === 'accepted'
                                  ? 'success'
                                  : invitation.status === 'revoked'
                                    ? 'danger'
                                    : 'neutral'
                            }
                            label={label(invitation.status)}
                          />
                        </Cell>
                        <Cell muted>{formatMaybeDate(invitation.expiresAt)}</Cell>
                        <Cell muted>{formatMaybeDate(invitation.createdAt)}</Cell>
                        <Cell className="min-w-[260px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className={buttonClasses('secondary', 'sm')}
                              onClick={() => copyInviteLink(invitation.id, data.slug)}
                              disabled={!canCopy}
                              title="Copy partner workspace invite link"
                            >
                              {copiedInvitationId === invitation.id ? (
                                <Check className="text-success-strong h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              {copiedInvitationId === invitation.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              className={buttonClasses('secondary', 'sm')}
                              onClick={() => resendInvitation.mutate(invitation.id)}
                              disabled={
                                !canManage ||
                                resendInvitation.isPending ||
                                revokeInvitation.isPending
                              }
                              title="Refresh this invitation"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Resend
                            </button>
                            <button
                              type="button"
                              className={buttonClasses('destructive', 'sm')}
                              onClick={() => revokeInvitation.mutate(invitation.id)}
                              disabled={
                                !canManage ||
                                resendInvitation.isPending ||
                                revokeInvitation.isPending
                              }
                              title="Revoke this invitation"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Revoke
                            </button>
                          </div>
                        </Cell>
                      </tr>
                    )
                  })}
                </AdminTable>
              )}
            </Section>
          </Card>
        </>
      ) : null}
    </PageLayout>
  )
}
