import { API_URL } from './api-base'

async function adminFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((error as { message?: string }).message ?? 'API error')
  }
  return res.json() as Promise<T>
}

export interface AdminPerson {
  id: string
  name: string
  email: string
}

export interface AdminOrganisation {
  id: string
  name: string
  slug: string
  status: string
  planName: string | null
  monthlyAssessmentAllowance: number
  overageUnitPrice: number | null
  currency: string
  createdAt: string
  updatedAt: string
  owner: AdminPerson | null
  metrics: {
    members: number
    activeMembers: number
    pendingInvitations: number
    assessmentCases: number
    assessmentRequests: number
    usageEvents: number
    usageThisMonth: number
  }
}

export interface AdminInvitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  emailDelivery?: InvitationEmailDelivery
}

export interface AdminOrganisationDetail extends Omit<AdminOrganisation, 'owner' | 'metrics'> {
  metrics: AdminOrganisation['metrics'] & {
    policies: number
    auditEvents: number
    totalUsage: number
  }
  members: Array<{
    id: string
    role: string
    status: string
    invitedAt: string | null
    joinedAt: string | null
    lastActiveAt: string | null
    user: AdminPerson
  }>
  invitations: AdminInvitation[]
  recentUsageEvents: AdminUsageEvent[]
  recentAuditEvents: AdminOrganisationAuditEvent[]
}

export interface AdminOverview {
  metrics: {
    totalOrganisations: number
    activeOrganisations: number
    deliveredAssessments: number
    usageThisMonth: number
    activePartnerMembers30d: number
    totalConsumers: number
    consumerSignupsThisMonth: number
  }
  recentOrganisations: AdminOrganisation[]
  recentAuditEvents: AdminAuditEvent[]
}

export interface AdminConsumer {
  id: string
  email: string
  status: string
  compassEnabled: boolean
  createdAt: string
  updatedAt: string
  profile: {
    fullName: string | null
    profileStage: string
    employmentType: string | null
  } | null
  latestScore: {
    overallScore: number
    overallTier: string
    computedAt: string
    validUntil: string | null
  } | null
  latestActivity: { eventType: string; createdAt: string } | null
  internalAdmin: { role: string; status: string } | null
  partnerMemberships: Array<{
    role: string
    status: string
    organisation: { id: string; name: string; slug: string }
  }>
  counts: {
    bankConnections: number
    documents: number
    trustScores: number
    sharedProfiles: number
    applicantAssessmentCases: number
    auditEvents: number
  }
}

export interface AdminConsumers {
  metrics: {
    totalConsumers: number
    signupsThisMonth: number
    activeConsumers30d: number
    scoredConsumers: number
    bankConnectedConsumers: number
  }
  users: AdminConsumer[]
}

export interface InternalAdminAccess {
  id: string
  user: AdminPerson
  role: string
  status: string
  source: string
  grantedBy: AdminPerson | null
  grantedAt: string
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InternalAdminInvitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  invitedBy: AdminPerson | null
  acceptedBy: AdminPerson | null
  emailDelivery?: InvitationEmailDelivery
}

export interface InvitationEmailDelivery {
  attempted: boolean
  sent: boolean
  provider: string
  reason?: string
  messageId?: string
}

export interface InternalAdmins {
  admins: InternalAdminAccess[]
  invitations: InternalAdminInvitation[]
}

export interface AdminUsageEvent {
  id: string
  organisation?: { id: string; name: string; slug: string }
  eventType: string
  source: string | null
  quantity: number
  unit: string
  occurredAt: string
  includedOrOverage?: string | null
  unitPrice?: number | null
  currency?: string
  assessmentCase: { id: string; reference: string | null; assessmentType: string } | null
  applicant: AdminPerson | null
  initiatedBy?: AdminPerson | null
}

export interface AdminActivity {
  members: Array<{
    id: string
    organisation: { id: string; name: string; slug: string }
    user: AdminPerson
    role: string
    status: string
    lastActiveAt: string | null
    joinedAt: string | null
  }>
  invitations: Array<AdminInvitation & { organisation: { id: string; name: string; slug: string } }>
}

export interface AdminAuditEvent {
  id: string
  actorUserId: string | null
  actorEmail: string | null
  actorRole: string | null
  action: string
  targetType: string
  targetId: string | null
  organisationId: string | null
  organisation: { name: string; slug: string } | null
  metadata: unknown
  ipAddress: string | null
  createdAt: string
}

export interface AdminOrganisationAuditEvent {
  id: string
  actorType: string
  actorId: string | null
  action: string
  targetType: string
  targetId: string | null
  metadata: unknown
  createdAt: string
}

export interface AdminMe {
  userId: string
  email: string
  role: string
  permissions: string[]
  source: string
}

export const adminApi = {
  me: (token: string) => adminFetch<AdminMe>('/admin/me', {}, token),
  overview: (token: string) => adminFetch<AdminOverview>('/admin/overview', {}, token),
  consumers: (token: string, query?: string) =>
    adminFetch<AdminConsumers>(
      `/admin/consumers${query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`,
      {},
      token
    ),
  internalAdmins: {
    list: (token: string) => adminFetch<InternalAdmins>('/admin/internal-admins', {}, token),
    invite: (token: string, data: { email: string; role?: string }) =>
      adminFetch<InternalAdminInvitation>(
        '/admin/internal-admins/invitations',
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    resend: (token: string, invitationId: string) =>
      adminFetch<InternalAdminInvitation>(
        `/admin/internal-admins/invitations/${encodeURIComponent(invitationId)}/resend`,
        { method: 'POST' },
        token
      ),
    revoke: (token: string, invitationId: string) =>
      adminFetch<InternalAdminInvitation>(
        `/admin/internal-admins/invitations/${encodeURIComponent(invitationId)}/revoke`,
        { method: 'POST' },
        token
      ),
  },
  organisations: {
    list: (token: string) => adminFetch<AdminOrganisation[]>('/admin/organisations', {}, token),
    create: (
      token: string,
      data: {
        name: string
        slug?: string
        planName?: string
        monthlyAssessmentAllowance?: number
        overageUnitPrice?: number | null
        currency?: string
        ownerEmail?: string
        ownerRole?: string
      }
    ) =>
      adminFetch<{ organisation: AdminOrganisation; invitation: AdminInvitation | null }>(
        '/admin/organisations',
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    detail: (token: string, organisationSlug: string) =>
      adminFetch<AdminOrganisationDetail>(
        `/admin/organisations/${encodeURIComponent(organisationSlug)}`,
        {},
        token
      ),
    invite: (token: string, organisationSlug: string, data: { email: string; role?: string }) =>
      adminFetch<AdminInvitation>(
        `/admin/organisations/${encodeURIComponent(organisationSlug)}/invitations`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    resendInvitation: (token: string, organisationSlug: string, invitationId: string) =>
      adminFetch<AdminInvitation>(
        `/admin/organisations/${encodeURIComponent(
          organisationSlug
        )}/invitations/${encodeURIComponent(invitationId)}/resend`,
        { method: 'POST' },
        token
      ),
    revokeInvitation: (token: string, organisationSlug: string, invitationId: string) =>
      adminFetch<AdminInvitation>(
        `/admin/organisations/${encodeURIComponent(
          organisationSlug
        )}/invitations/${encodeURIComponent(invitationId)}/revoke`,
        { method: 'POST' },
        token
      ),
  },
  usage: (token: string) => adminFetch<AdminUsageEvent[]>('/admin/usage-events', {}, token),
  activity: (token: string) => adminFetch<AdminActivity>('/admin/activity', {}, token),
  audit: (token: string) => adminFetch<AdminAuditEvent[]>('/admin/audit-events', {}, token),
}
