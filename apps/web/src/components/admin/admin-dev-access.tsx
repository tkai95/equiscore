'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MailPlus, RefreshCw, UserPlus, XCircle } from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
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

function accessStatusTone(status: string) {
  if (status === 'active') return 'success' as const
  if (status === 'suspended') return 'warning' as const
  if (status === 'revoked') return 'danger' as const
  return 'neutral' as const
}

function invitationStatusTone(status: string) {
  if (status === 'accepted') return 'success' as const
  if (status === 'pending') return 'info' as const
  if (status === 'revoked' || status === 'expired') return 'warning' as const
  return 'neutral' as const
}

function deliveryMessage(invitation: {
  email: string
  emailDelivery?: { sent: boolean; reason?: string }
}) {
  if (invitation.emailDelivery?.sent) {
    return `Invite email sent to ${invitation.email}.`
  }
  if (invitation.emailDelivery?.reason) {
    return `Invite created for ${invitation.email}, but email was not sent: ${invitation.emailDelivery.reason}. Use Copy link to send it manually.`
  }
  return `Invite created for ${invitation.email}. Share the sign-up link so they can create a profile.`
}

export function AdminDevAccess() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-dev-access'],
    queryFn: async () => adminApi.devAccess.list((await getToken())!),
  })

  const activeAccess = data?.access.filter((grant) => grant.status === 'active') ?? []
  const pendingInvites =
    data?.invitations.filter((invitation) => invitation.status === 'pending') ?? []

  const invite = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return adminApi.devAccess.invite(token!, { email, note: note || undefined })
    },
    onSuccess: () => {
      setEmail('')
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin-dev-access'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const resend = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return adminApi.devAccess.resend(token!, invitationId)
    },
    onSuccess: (invitation) => {
      setActionNotice(deliveryMessage(invitation))
      void queryClient.invalidateQueries({ queryKey: ['admin-dev-access'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const revoke = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return adminApi.devAccess.revoke(token!, invitationId)
    },
    onSuccess: (invitation) => {
      setActionNotice(`Invite revoked for ${invitation.email}.`)
      void queryClient.invalidateQueries({ queryKey: ['admin-dev-access'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (email.trim()) invite.mutate()
  }

  const copyInviteLink = async (invitationId: string, inviteUrl: string) => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedInvitationId(invitationId)
    setTimeout(() => setCopiedInvitationId(null), 1800)
  }

  const actionError = (resend.error ?? revoke.error) as Error | null

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Dev access"
        description="Invite people to the dev site (dev.equiscore.app). Only invited emails can create a profile there."
      />

      {isError && (
        <Card padding="lg">
          <EmptyAdminState title="Dev access unavailable" body={(error as Error).message} />
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
                  <UserPlus className="text-brand h-4 w-4" />
                  Access snapshot
                </span>
              }
            >
              <MetricGroup>
                <Metric label="Active users" value={activeAccess.length} />
                <Metric label="Pending invites" value={pendingInvites.length} />
              </MetricGroup>
            </Section>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card padding="lg">
              <Section title="People with access">
                {data.access.length === 0 ? (
                  <EmptyAdminState
                    title="No dev users yet"
                    body="Invite someone using the form on the right."
                  />
                ) : (
                  <AdminTable columns={['User', 'Status', 'Granted by', 'Since']}>
                    {data.access.map((grant) => (
                      <tr key={grant.id}>
                        <Cell>
                          <div className="font-medium">{grant.user.name}</div>
                          <div className="text-content-muted text-xs">{grant.user.email}</div>
                        </Cell>
                        <Cell>
                          <StatusPill
                            status={accessStatusTone(grant.status)}
                            label={label(grant.status)}
                          />
                        </Cell>
                        <Cell muted>{grant.grantedBy?.email ?? 'System'}</Cell>
                        <Cell muted>{formatMaybeDate(grant.grantedAt)}</Cell>
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
                    Invite to dev
                  </span>
                }
              >
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label
                      className="text-content block text-sm font-medium"
                      htmlFor="dev-access-email"
                    >
                      Email
                    </label>
                    <input
                      id="dev-access-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      placeholder="tester@example.com"
                    />
                  </div>
                  <div>
                    <label
                      className="text-content block text-sm font-medium"
                      htmlFor="dev-access-note"
                    >
                      Note (optional)
                    </label>
                    <input
                      id="dev-access-note"
                      type="text"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      placeholder="e.g. Design review"
                    />
                  </div>
                  {invite.isError && (
                    <p className="text-danger-strong text-sm">{(invite.error as Error).message}</p>
                  )}
                  {invite.data && (
                    <div className="bg-surface-inset text-content-secondary rounded-lg p-3 text-sm">
                      {deliveryMessage(invite.data)}
                    </div>
                  )}
                  <Button type="submit" loading={invite.isPending} disabled={!email.trim()}>
                    {!invite.isPending && <MailPlus className="h-4 w-4" />}
                    {invite.isPending ? 'Inviting...' : 'Send invite'}
                  </Button>
                </form>
              </Section>
            </Card>
          </div>

          <Card padding="lg">
            <Section title="Invitations">
              {actionError && (
                <p className="text-danger-strong mb-4 text-sm">{actionError.message}</p>
              )}
              {actionNotice && (
                <p className="bg-surface-inset text-content-secondary mb-4 rounded-lg p-3 text-sm">
                  {actionNotice}
                </p>
              )}
              {data.invitations.length === 0 ? (
                <EmptyAdminState
                  title="No dev access invitations"
                  body="Invitations created from this view will appear here."
                />
              ) : (
                <AdminTable
                  columns={['Email', 'Status', 'Invited by', 'Accepted by', 'Expires', 'Actions']}
                >
                  {data.invitations.map((invitation) => {
                    const canCopy = invitation.status === 'pending'
                    const canManage =
                      invitation.status === 'pending' || invitation.status === 'expired'
                    return (
                      <tr key={invitation.id}>
                        <Cell>
                          {invitation.email}
                          {invitation.note && (
                            <div className="text-content-muted text-xs">{invitation.note}</div>
                          )}
                        </Cell>
                        <Cell>
                          <StatusPill
                            status={invitationStatusTone(invitation.status)}
                            label={label(invitation.status)}
                          />
                        </Cell>
                        <Cell muted>{invitation.invitedBy?.email ?? 'System'}</Cell>
                        <Cell muted>{invitation.acceptedBy?.email ?? 'Not accepted'}</Cell>
                        <Cell muted>{formatMaybeDate(invitation.expiresAt)}</Cell>
                        <Cell className="min-w-[260px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className={buttonClasses('secondary', 'sm')}
                              onClick={() => copyInviteLink(invitation.id, invitation.inviteUrl)}
                              disabled={!canCopy}
                              title="Copy the dev sign-up link"
                            >
                              {copiedInvitationId === invitation.id ? (
                                <Check className="text-success-strong h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              {copiedInvitationId === invitation.id ? 'Copied' : 'Copy link'}
                            </button>
                            <button
                              type="button"
                              className={buttonClasses('secondary', 'sm')}
                              onClick={() => resend.mutate(invitation.id)}
                              disabled={!canManage || resend.isPending || revoke.isPending}
                              title="Refresh this invitation"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Resend
                            </button>
                            <button
                              type="button"
                              className={buttonClasses('destructive', 'sm')}
                              onClick={() => revoke.mutate(invitation.id)}
                              disabled={!canManage || resend.isPending || revoke.isPending}
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
