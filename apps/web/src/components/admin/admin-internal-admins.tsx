'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MailPlus, RefreshCw, UserCog, XCircle } from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { absoluteAdminUrl } from '@/lib/app-urls'
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

const ROLES = ['support', 'readonly', 'admin', 'billing', 'compliance', 'owner']

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
    return `Invite created for ${invitation.email}, but email was not sent: ${invitation.emailDelivery.reason}. Use Copy to send the link manually.`
  }

  return `Invite created for ${invitation.email}. Access is claimed when they sign in with that email.`
}

export function AdminInternalAdmins() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('support')
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-internal-admins'],
    queryFn: async () => adminApi.internalAdmins.list((await getToken())!),
  })

  const metrics = useMemo(() => {
    const activeAdmins = data?.admins.filter((admin) => admin.status === 'active') ?? []
    const pendingInvites =
      data?.invitations.filter((invitation) => invitation.status === 'pending') ?? []
    return {
      activeAdmins: activeAdmins.length,
      owners: activeAdmins.filter((admin) => admin.role === 'owner').length,
      supportAdmins: activeAdmins.filter((admin) => admin.role === 'support').length,
      pendingInvites: pendingInvites.length,
    }
  }, [data])

  const invite = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return adminApi.internalAdmins.invite(token!, { email, role })
    },
    onSuccess: () => {
      setEmail('')
      setRole('support')
      void queryClient.invalidateQueries({ queryKey: ['admin-internal-admins'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const resend = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return adminApi.internalAdmins.resend(token!, invitationId)
    },
    onSuccess: (invitation) => {
      setActionNotice(deliveryMessage(invitation))
      void queryClient.invalidateQueries({ queryKey: ['admin-internal-admins'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const revoke = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return adminApi.internalAdmins.revoke(token!, invitationId)
    },
    onSuccess: (invitation) => {
      setActionNotice(`Invite revoked for ${invitation.email}.`)
      void queryClient.invalidateQueries({ queryKey: ['admin-internal-admins'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (email.trim()) invite.mutate()
  }

  const copyInviteLink = async (invitationId: string) => {
    await navigator.clipboard.writeText(absoluteAdminUrl('/admin'))
    setCopiedInvitationId(invitationId)
    setTimeout(() => setCopiedInvitationId(null), 1800)
  }

  const actionError = (resend.error ?? revoke.error) as Error | null

  return (
    <PageLayout width="wide">
      <PageHeader title="Internal admins" />

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
                  <UserCog className="text-brand h-4 w-4" />
                  Access snapshot
                </span>
              }
            >
              <MetricGroup>
                <Metric label="Active admins" value={metrics.activeAdmins} />
                <Metric label="Owners" value={metrics.owners} />
                <Metric label="Support admins" value={metrics.supportAdmins} />
                <Metric label="Pending invites" value={metrics.pendingInvites} />
              </MetricGroup>
            </Section>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card padding="lg">
              <Section title="Current access">
                {data.admins.length === 0 ? (
                  <EmptyAdminState
                    title="No internal admins yet"
                    body="Bootstrap access comes from the admin email environment setting."
                  />
                ) : (
                  <AdminTable
                    columns={['Admin', 'Role', 'Status', 'Source', 'Granted by', 'Since']}
                  >
                    {data.admins.map((admin) => (
                      <tr key={admin.id}>
                        <Cell>
                          <div className="font-medium">{admin.user.name}</div>
                          <div className="text-content-muted text-xs">{admin.user.email}</div>
                        </Cell>
                        <Cell muted>{label(admin.role)}</Cell>
                        <Cell>
                          <StatusPill
                            status={accessStatusTone(admin.status)}
                            label={label(admin.status)}
                          />
                        </Cell>
                        <Cell muted>{label(admin.source)}</Cell>
                        <Cell muted>{admin.grantedBy?.email ?? 'System'}</Cell>
                        <Cell muted>{formatMaybeDate(admin.grantedAt)}</Cell>
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
                    Invite admin
                  </span>
                }
              >
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label
                      className="text-content block text-sm font-medium"
                      htmlFor="internal-admin-email"
                    >
                      Email
                    </label>
                    <input
                      id="internal-admin-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      placeholder="teammate@equiscore.app"
                    />
                  </div>
                  <div>
                    <label
                      className="text-content block text-sm font-medium"
                      htmlFor="internal-admin-role"
                    >
                      Role
                    </label>
                    <select
                      id="internal-admin-role"
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
                      {deliveryMessage(invite.data)}
                    </div>
                  )}
                  <Button type="submit" loading={invite.isPending} disabled={!email.trim()}>
                    {!invite.isPending && <MailPlus className="h-4 w-4" />}
                    {invite.isPending ? 'Inviting...' : 'Invite admin'}
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
                  title="No internal admin invitations"
                  body="Invitations created from this view will appear here."
                />
              ) : (
                <AdminTable
                  columns={[
                    'Email',
                    'Role',
                    'Status',
                    'Invited by',
                    'Accepted by',
                    'Expires',
                    'Actions',
                  ]}
                >
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
                              onClick={() => copyInviteLink(invitation.id)}
                              disabled={!canCopy}
                              title="Copy admin portal invite link"
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
