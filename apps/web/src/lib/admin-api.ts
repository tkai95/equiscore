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
  }
  recentOrganisations: AdminOrganisation[]
  recentAuditEvents: AdminAuditEvent[]
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

export const adminApi = {
  me: (token: string) => adminFetch('/admin/me', {}, token),
  overview: (token: string) => adminFetch<AdminOverview>('/admin/overview', {}, token),
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
  },
  usage: (token: string) => adminFetch<AdminUsageEvent[]>('/admin/usage-events', {}, token),
  activity: (token: string) => adminFetch<AdminActivity>('/admin/activity', {}, token),
  audit: (token: string) => adminFetch<AdminAuditEvent[]>('/admin/audit-events', {}, token),
}
