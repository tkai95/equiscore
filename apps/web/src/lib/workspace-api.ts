import { API_URL } from './api-base'

async function workspaceFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
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

export interface WorkspaceOrganisation {
  id: string
  name: string
  slug: string
  status: string
  planName: string | null
  monthlyAssessmentAllowance: number
  overageUnitPrice: number | null
  currency: string
  member: {
    id: string
    role: string
    permissions: string[]
  }
}

export interface WorkspaceOverview {
  organisation: Omit<WorkspaceOrganisation, 'member' | 'status'>
  member: WorkspaceOrganisation['member']
  metrics: {
    openCases: number
    awaitingReview: number
    pendingRequests: number
    usedCredits: number
    remainingCredits: number
  }
}

interface PersonRef {
  id: string | null
  name: string
  email: string
}

export interface WorkspaceAssessmentCase {
  id: string
  applicant: PersonRef
  assessmentType: string
  source: string
  status: string
  assessmentOutcome: string | null
  assessmentConfidence: string | null
  companyDecision: string | null
  reference: string | null
  proposedCommitment: number | null
  creditConsumed: boolean
  assessedAt: string | null
  expiresAt: string | null
  createdAt: string
  reviewer: PersonRef | null
  policy: { id: string; name: string; versionNumber: number } | null
  snapshot: { id: string; version: number; dataPeriodEnd: string | null; createdAt: string }
  counts: { criterionResults: number; notes: number; informationRequests: number }
}

export interface WorkspaceAssessmentRequest {
  id: string
  applicant: PersonRef
  assessmentType: string
  status: string
  proposedCommitment: number | null
  reference: string | null
  deadline: string | null
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdBy: PersonRef
  policy: { id: string; name: string; versionNumber: number } | null
  counts: { cases: number; consents: number }
}

export interface WorkspacePolicy {
  id: string
  name: string
  assessmentType: string
  status: string
  createdAt: string
  updatedAt: string
  createdBy: PersonRef | null
  latestVersion: { id: string; versionNumber: number; status: string; effectiveFrom: string | null; approvedAt: string | null } | null
  versionCount: number
}

export interface WorkspaceUsageEvent {
  id: string
  eventType: string
  source: string | null
  quantity: number
  unit: string
  occurredAt: string
  includedOrOverage: string | null
  unitPrice: number | null
  currency: string
  assessmentCase: { id: string; reference: string | null; assessmentType: string } | null
  applicant: PersonRef | null
  initiatedBy: PersonRef | null
}

export interface WorkspaceAuditEvent {
  id: string
  assessmentCaseId: string | null
  actorType: string
  actorId: string | null
  action: string
  targetType: string
  targetId: string | null
  beforeStateReference: string | null
  afterStateReference: string | null
  metadata: unknown
  createdAt: string
}

export const workspaceApi = {
  organisations: {
    list: (token: string) => workspaceFetch<WorkspaceOrganisation[]>('/organisations', {}, token),
    create: (token: string, data: { name: string; slug?: string }) =>
      workspaceFetch<WorkspaceOrganisation>('/organisations', { method: 'POST', body: JSON.stringify(data) }, token),
    overview: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceOverview>(`/organisations/${encodeURIComponent(organisationSlug)}/overview`, {}, token),
    cases: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceAssessmentCase[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/assessment-cases`,
        {},
        token
      ),
    requests: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceAssessmentRequest[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/assessment-requests`,
        {},
        token
      ),
    policies: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspacePolicy[]>(`/organisations/${encodeURIComponent(organisationSlug)}/policies`, {}, token),
    usage: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceUsageEvent[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/usage-events`,
        {},
        token
      ),
    audit: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceAuditEvent[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/audit-events`,
        {},
        token
      ),
  },
}
