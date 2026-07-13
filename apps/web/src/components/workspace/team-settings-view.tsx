'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MailPlus, RefreshCw, Trash2, UserCog } from 'lucide-react'
import { workspaceApi, type WorkspaceTeamInvitation } from '@/lib/workspace-api'
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
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

const ROLES = ['owner', 'admin', 'policy_admin', 'reviewer', 'manager', 'billing_admin', 'auditor']

function statusTone(status: string) {
  if (status === 'active' || status === 'accepted') return 'success' as const
  if (status === 'pending') return 'info' as const
  if (status === 'suspended' || status === 'expired') return 'warning' as const
  if (status === 'removed' || status === 'revoked') return 'danger' as const
  return 'neutral' as const
}

function deliveryMessage(invitation: WorkspaceTeamInvitation) {
  if (invitation.emailDelivery?.sent) return `Invite email sent to ${invitation.email}.`
  if (invitation.emailDelivery?.reason) {
    return `Invite created for ${invitation.email}, but email was not sent: ${invitation.emailDelivery.reason}. Use Copy to send the link manually.`
  }
  return `Invite created for ${invitation.email}. It will be claimed when that user signs in.`
}

export function TeamSettingsView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('reviewer')
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)
  const [roleEdits, setRoleEdits] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['workspace-team', organisationSlug],
    queryFn: async () => workspaceApi.organisations.team((await getToken())!, organisationSlug),
  })

  const canManage = Boolean(data?.member.permissions.includes('members:manage'))

  const invite = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.organisations.inviteMember(token!, organisationSlug, { email, role })
    },
    onSuccess: (invitation) => {
      setEmail('')
      setRole('reviewer')
      setNotice(deliveryMessage(invitation))
      void queryClient.invalidateQueries({ queryKey: ['workspace-team', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-audit', organisationSlug] })
    },
  })

  const resend = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return workspaceApi.organisations.resendInvitation(token!, organisationSlug, invitationId)
    },
    onSuccess: (invitation) => {
      setNotice(deliveryMessage(invitation))
      void queryClient.invalidateQueries({ queryKey: ['workspace-team', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-audit', organisationSlug] })
    },
  })

  const revoke = useMutation({
    mutationFn: async (invitationId: string) => {
      const token = await getToken()
      return workspaceApi.organisations.revokeInvitation(token!, organisationSlug, invitationId)
    },
    onSuccess: (invitation) => {
      setNotice(`Invite revoked for ${invitation.email}.`)
      void queryClient.invalidateQueries({ queryKey: ['workspace-team', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-audit', organisationSlug] })
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ memberId, nextRole }: { memberId: string; nextRole: string }) => {
      const token = await getToken()
      return workspaceApi.organisations.updateMemberRole(
        token!,
        organisationSlug,
        memberId,
        nextRole
      )
    },
    onSuccess: (member) => {
      setRoleEdits((current) => {
        const next = { ...current }
        delete next[member.id]
        return next
      })
      setNotice(`${member.user.email} is now ${label(member.role)}.`)
      void queryClient.invalidateQueries({ queryKey: ['workspace-team', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-audit', organisationSlug] })
    },
  })

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const token = await getToken()
      return workspaceApi.organisations.removeMember(token!, organisationSlug, memberId)
    },
    onSuccess: (member) => {
      setNotice(`${member.user.email} has been removed.`)
      void queryClient.invalidateQueries({ queryKey: ['workspace-team', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-audit', organisationSlug] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (email.trim()) invite.mutate()
  }

  const copyInviteLink = async (invitationId: string) => {
    await navigator.clipboard.writeText(absolutePartnerUrl(`/o/${organisationSlug}`))
    setCopiedInvitationId(invitationId)
    setTimeout(() => setCopiedInvitationId(null), 1800)
  }

  const actionError = (invite.error ??
    resend.error ??
    revoke.error ??
    updateRole.error ??
    removeMember.error) as Error | null

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Team"
        description={
          data
            ? `${data.organisation.name} · partners.equiscore.app/o/${data.organisation.slug}`
            : 'Manage company members, roles and organisation-level access.'
        }
      />

      {isError && (
        <Card padding="lg">
          <EmptyWorkspaceState title="Team settings unavailable" body={(error as Error).message} />
        </Card>
      )}

      {isLoading ? (
        <div className="rounded-card bg-surface-hover h-48 animate-pulse" />
      ) : data ? (
        <>
          <Card padding="lg">
            <Section title="Access snapshot">
              <MetricGroup>
                <Metric
                  label="Active members"
                  value={data.members.filter((member) => member.status === 'active').length}
                />
                <Metric
                  label="Owners"
                  value={
                    data.members.filter(
                      (member) => member.status === 'active' && member.role === 'owner'
                    ).length
                  }
                />
                <Metric
                  label="Pending invites"
                  value={data.invitations.filter((item) => item.status === 'pending').length}
                />
                <Metric label="Your role" value={label(data.member.role)} />
              </MetricGroup>
            </Section>
          </Card>

          {notice && (
            <Card padding="md">
              <p className="text-content-secondary text-sm">{notice}</p>
            </Card>
          )}

          {actionError && (
            <Card padding="md">
              <p className="text-danger-strong text-sm">{actionError.message}</p>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card padding="lg">
              <Section
                title={
                  <span className="flex items-center gap-2">
                    <UserCog className="text-brand h-4 w-4" />
                    Members
                  </span>
                }
              >
                <WorkspaceTable
                  columns={['Member', 'Role', 'Status', 'Joined', 'Last active', 'Actions']}
                >
                  {data.members.map((member) => {
                    const selectedRole = roleEdits[member.id] ?? member.role
                    const isCurrentMember = member.id === data.member.id
                    const canEditMember =
                      canManage && !isCurrentMember && member.status === 'active'
                    return (
                      <tr key={member.id}>
                        <Cell>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-content-muted text-xs">{member.user.email}</p>
                        </Cell>
                        <Cell>
                          <select
                            value={selectedRole}
                            onChange={(event) =>
                              setRoleEdits((current) => ({
                                ...current,
                                [member.id]: event.target.value,
                              }))
                            }
                            disabled={!canEditMember}
                            className="border-line focus:border-brand disabled:bg-surface-hover disabled:text-content-muted w-40 rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                          >
                            {ROLES.map((item) => (
                              <option key={item} value={item}>
                                {label(item)}
                              </option>
                            ))}
                          </select>
                        </Cell>
                        <Cell>
                          <StatusPill
                            status={statusTone(member.status)}
                            label={label(member.status)}
                          />
                        </Cell>
                        <Cell muted>{formatMaybeDate(member.joinedAt)}</Cell>
                        <Cell muted>{formatMaybeDate(member.lastActiveAt)}</Cell>
                        <Cell className="min-w-[220px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className={buttonClasses('secondary', 'sm')}
                              onClick={() =>
                                updateRole.mutate({ memberId: member.id, nextRole: selectedRole })
                              }
                              disabled={
                                !canEditMember ||
                                selectedRole === member.role ||
                                updateRole.isPending ||
                                removeMember.isPending
                              }
                            >
                              Save role
                            </button>
                            <button
                              type="button"
                              className={buttonClasses('destructive', 'sm')}
                              onClick={() => removeMember.mutate(member.id)}
                              disabled={
                                !canEditMember || updateRole.isPending || removeMember.isPending
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                        </Cell>
                      </tr>
                    )
                  })}
                </WorkspaceTable>
              </Section>
            </Card>

            <Card padding="lg" className="self-start">
              <Section
                title={
                  <span className="flex items-center gap-2">
                    <MailPlus className="text-brand h-4 w-4" />
                    Invite member
                  </span>
                }
              >
                {canManage ? (
                  <form onSubmit={submit} className="space-y-4">
                    <div>
                      <label
                        className="text-content block text-sm font-medium"
                        htmlFor="team-email"
                      >
                        Email
                      </label>
                      <input
                        id="team-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        placeholder="teammate@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-content block text-sm font-medium" htmlFor="team-role">
                        Role
                      </label>
                      <select
                        id="team-role"
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
                    <Button type="submit" loading={invite.isPending} disabled={!email.trim()}>
                      {!invite.isPending && <MailPlus className="h-4 w-4" />}
                      {invite.isPending ? 'Inviting...' : 'Invite member'}
                    </Button>
                  </form>
                ) : (
                  <EmptyWorkspaceState
                    title="Read-only access"
                    body="Your role can view this workspace, but cannot manage team access."
                  />
                )}
              </Section>
            </Card>
          </div>

          <Card padding="lg">
            <Section title="Invitations">
              {data.invitations.length === 0 ? (
                <EmptyWorkspaceState
                  title="No invitations"
                  body="Team invitations created for this organisation will appear here."
                />
              ) : (
                <WorkspaceTable
                  columns={['Email', 'Role', 'Status', 'Expires', 'Created', 'Actions']}
                >
                  {data.invitations.map((invitation) => {
                    const canManageInvitation =
                      canManage &&
                      (invitation.status === 'pending' || invitation.status === 'expired')
                    return (
                      <tr key={invitation.id}>
                        <Cell>{invitation.email}</Cell>
                        <Cell muted>{label(invitation.role)}</Cell>
                        <Cell>
                          <StatusPill
                            status={statusTone(invitation.status)}
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
                              onClick={() => copyInviteLink(invitation.id)}
                              disabled={invitation.status !== 'pending'}
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
                              disabled={
                                !canManageInvitation || resend.isPending || revoke.isPending
                              }
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Resend
                            </button>
                            <button
                              type="button"
                              className={buttonClasses('destructive', 'sm')}
                              onClick={() => revoke.mutate(invitation.id)}
                              disabled={
                                !canManageInvitation || resend.isPending || revoke.isPending
                              }
                            >
                              Revoke
                            </button>
                          </div>
                        </Cell>
                      </tr>
                    )
                  })}
                </WorkspaceTable>
              )}
            </Section>
          </Card>
        </>
      ) : null}
    </PageLayout>
  )
}
