import { API_URL } from './api-base'

async function workspaceFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
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

export interface WorkspaceTeamMember {
  id: string
  role: string
  status: string
  invitedAt: string | null
  joinedAt: string | null
  lastActiveAt: string | null
  user: {
    id: string
    name: string
    email: string
  }
}

export interface WorkspaceInvitationEmailDelivery {
  attempted: boolean
  sent: boolean
  provider: string
  reason?: string
  messageId?: string
}

export interface WorkspaceTeamInvitation {
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
  emailDelivery?: WorkspaceInvitationEmailDelivery
}

export interface WorkspaceTeamSettings {
  organisation: Omit<WorkspaceOrganisation, 'member'>
  member: WorkspaceOrganisation['member']
  members: WorkspaceTeamMember[]
  invitations: WorkspaceTeamInvitation[]
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

export interface WorkspaceAssessmentCaseDetail {
  id: string
  applicant: PersonRef
  assessmentType: string
  source: string
  status: string
  assessmentOutcome: string | null
  assessmentConfidence: string | null
  companyDecision: string | null
  decisionRationale: string | null
  reference: string | null
  proposedCommitment: number | null
  creditConsumed: boolean
  assessedAt: string | null
  expiresAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  reviewer: PersonRef | null
  request: {
    id: string
    applicantEmail: string
    applicantName: string | null
    status: string
    requestToken: string | null
    requestUrl: string | null
    deadline: string | null
    createdAt: string
    sentAt: string | null
    completedAt: string | null
  } | null
  policy: {
    id: string
    versionNumber: number
    status: string
    effectiveFrom: string | null
    approvedAt: string | null
    policy: { id: string; name: string; assessmentType: string; status: string }
  } | null
  consent: {
    id: string
    status: string
    purpose: string | null
    permittedDataScope: unknown
    consentTextVersion: string
    grantedAt: string | null
    expiresAt: string | null
    revokedAt: string | null
    companyReference: string | null
    createdAt: string
  }
  snapshot: {
    id: string
    version: number
    dataPeriodStart: string | null
    dataPeriodEnd: string | null
    sourceFreshness: string | null
    permittedDataScope: unknown
    trustScoreSummary: unknown
    insightSummary: unknown
    incomeSummary: unknown
    affordabilitySummary: unknown
    commitmentsSummary: unknown
    verificationSummary: unknown
    evidenceManifest: unknown
    evidenceReferences: unknown
    integrityHash: string
    createdAt: string
  }
  criterionResults: Array<{
    id: string
    result: string
    observedValue: unknown
    thresholdValue: unknown
    confidence: string | null
    evidenceReferences: unknown
    assumptions: unknown
    missingInformation: unknown
    createdAt: string
    policyRule: {
      id: string
      name: string
      description: string | null
      inputField: string
      operator: string
      threshold: unknown
      missingDataBehaviour: string
      priority: number
    } | null
  }>
  notes: Array<{
    id: string
    visibility: string
    body: string
    createdAt: string
    updatedAt: string
    author: PersonRef
  }>
  informationRequests: Array<{
    id: string
    requestType: string
    message: string
    requestedFields: unknown
    status: string
    dueAt: string | null
    createdById: string
    applicantResponse: string | null
    createdAt: string
    respondedAt: string | null
    resolvedAt: string | null
  }>
  decisions: Array<{
    id: string
    decision: string
    conditions: unknown
    rationale: string
    assessmentOutcomeAtDecision: string | null
    overrideFlag: boolean
    overrideReason: string | null
    createdAt: string
    decisionMaker: PersonRef
  }>
  usageEvents: Array<{
    id: string
    eventType: string
    quantity: number
    unit: string
    occurredAt: string
    includedOrOverage: string | null
    currency: string
  }>
  auditEvents: Array<{
    id: string
    actorType: string
    actorId: string | null
    action: string
    targetType: string
    targetId: string | null
    beforeStateReference: string | null
    afterStateReference: string | null
    metadata: unknown
    createdAt: string
  }>
}

export interface WorkspaceAssessmentRequest {
  id: string
  applicant: PersonRef
  assessmentType: string
  status: string
  proposedCommitment: number | null
  reference: string | null
  requestToken: string | null
  requestUrl: string | null
  deadline: string | null
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdBy: PersonRef
  policy: { id: string; name: string; versionNumber: number } | null
  counts: { cases: number; consents: number }
}

export interface CreateWorkspaceAssessmentRequestInput {
  applicantEmail: string
  applicantName?: string
  assessmentType: 'rental' | 'telecom' | 'utilities' | 'lending' | 'other'
  proposedCommitment?: number
  reference?: string
  deadline?: string
}

export interface RecordWorkspaceCaseDecisionInput {
  decision:
    | 'approved'
    | 'approved_with_conditions'
    | 'additional_information_required'
    | 'guarantor_or_alternative_route_required'
    | 'referred_for_manual_review'
    | 'declined'
    | 'withdrawn'
    | 'expired_without_decision'
  rationale: string
  conditions?: string
  overrideReason?: string
}

export interface RequestWorkspaceCaseInformationInput {
  requestType?: string
  message: string
  requestedFields?: string
  dueAt?: string
}

export interface UpdateWorkspaceInformationRequestStatusInput {
  status: 'open' | 'resolved' | 'cancelled'
}

export interface WorkspaceSharedProfile {
  id: string
  status: string
  source: string
  notes: string | null
  importedAt: string
  updatedAt: string
  acceptedAt: string | null
  declinedAt: string | null
  assessedAt: string | null
  applicant: PersonRef
  importedBy: PersonRef
  share: {
    id: string
    path: string
    tokenPreview: string
    targetType: string | null
    targetName: string | null
    expiresAt: string
    createdAt: string
    revokedAt: string | null
    viewCount: number
    lastViewedAt: string | null
  }
  trustScore: {
    id: string
    overallScore: number
    overallTier: string
    computedAt: string
    financialDataAsOf: string | null
    validUntil: string | null
  }
}

export interface PublicAssessmentRequest {
  id: string
  organisation: { id: string; name: string; slug: string }
  applicant: { name: string | null; email: string }
  assessmentType: string
  status: string
  proposedCommitment: number | null
  reference: string | null
  deadline: string | null
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  policy: { id: string; name: string; versionNumber: number } | null
  isCompletable: boolean
  case: {
    id: string
    status: string
    assessmentOutcome: string | null
    assessmentConfidence: string | null
    companyDecision: string | null
    decisionRationale: string | null
    reference: string | null
    assessedAt: string | null
    expiresAt: string | null
    createdAt: string
  } | null
  informationRequests: Array<{
    id: string
    requestType: string
    message: string
    requestedFields: unknown
    status: string
    dueAt: string | null
    applicantResponse: string | null
    createdAt: string
    respondedAt: string | null
    resolvedAt: string | null
  }>
  canRespondToInformationRequests: boolean
}

export interface CompletedAssessmentRequest {
  requestId: string
  status: string
  case: {
    id: string
    status: string
    assessmentOutcome: string | null
    assessmentConfidence: string | null
    reference: string | null
    assessedAt: string | null
    expiresAt: string | null
  }
}

export interface WorkspacePolicy {
  id: string
  name: string
  assessmentType: string
  status: string
  createdAt: string
  updatedAt: string
  createdBy: PersonRef | null
  latestVersion: {
    id: string
    versionNumber: number
    status: string
    effectiveFrom: string | null
    approvedAt: string | null
  } | null
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
      workspaceFetch<WorkspaceOrganisation>(
        '/organisations',
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    overview: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceOverview>(
        `/organisations/${encodeURIComponent(organisationSlug)}/overview`,
        {},
        token
      ),
    team: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceTeamSettings>(
        `/organisations/${encodeURIComponent(organisationSlug)}/team`,
        {},
        token
      ),
    inviteMember: (
      token: string,
      organisationSlug: string,
      data: { email: string; role?: string }
    ) =>
      workspaceFetch<WorkspaceTeamInvitation>(
        `/organisations/${encodeURIComponent(organisationSlug)}/invitations`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    resendInvitation: (token: string, organisationSlug: string, invitationId: string) =>
      workspaceFetch<WorkspaceTeamInvitation>(
        `/organisations/${encodeURIComponent(
          organisationSlug
        )}/invitations/${encodeURIComponent(invitationId)}/resend`,
        { method: 'POST' },
        token
      ),
    revokeInvitation: (token: string, organisationSlug: string, invitationId: string) =>
      workspaceFetch<WorkspaceTeamInvitation>(
        `/organisations/${encodeURIComponent(
          organisationSlug
        )}/invitations/${encodeURIComponent(invitationId)}/revoke`,
        { method: 'POST' },
        token
      ),
    updateMemberRole: (token: string, organisationSlug: string, memberId: string, role: string) =>
      workspaceFetch<WorkspaceTeamMember>(
        `/organisations/${encodeURIComponent(organisationSlug)}/members/${encodeURIComponent(
          memberId
        )}/role`,
        { method: 'POST', body: JSON.stringify({ role }) },
        token
      ),
    removeMember: (token: string, organisationSlug: string, memberId: string) =>
      workspaceFetch<WorkspaceTeamMember>(
        `/organisations/${encodeURIComponent(organisationSlug)}/members/${encodeURIComponent(
          memberId
        )}/remove`,
        { method: 'POST' },
        token
      ),
    sharedProfiles: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceSharedProfile[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/shared-profiles`,
        {},
        token
      ),
    importSharedProfile: (token: string, organisationSlug: string, data: { shareCode: string }) =>
      workspaceFetch<WorkspaceSharedProfile>(
        `/organisations/${encodeURIComponent(organisationSlug)}/shared-profiles/import`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    cases: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceAssessmentCase[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/assessment-cases`,
        {},
        token
      ),
    caseDetail: (token: string, organisationSlug: string, caseId: string) =>
      workspaceFetch<WorkspaceAssessmentCaseDetail>(
        `/organisations/${encodeURIComponent(
          organisationSlug
        )}/assessment-cases/${encodeURIComponent(caseId)}`,
        {},
        token
      ),
    recordCaseDecision: (
      token: string,
      organisationSlug: string,
      caseId: string,
      data: RecordWorkspaceCaseDecisionInput
    ) =>
      workspaceFetch<WorkspaceAssessmentCaseDetail>(
        `/organisations/${encodeURIComponent(
          organisationSlug
        )}/assessment-cases/${encodeURIComponent(caseId)}/decisions`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    requestCaseInformation: (
      token: string,
      organisationSlug: string,
      caseId: string,
      data: RequestWorkspaceCaseInformationInput
    ) =>
      workspaceFetch<WorkspaceAssessmentCaseDetail>(
        `/organisations/${encodeURIComponent(
          organisationSlug
        )}/assessment-cases/${encodeURIComponent(caseId)}/information-requests`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    updateInformationRequestStatus: (
      token: string,
      organisationSlug: string,
      caseId: string,
      informationRequestId: string,
      data: UpdateWorkspaceInformationRequestStatusInput
    ) =>
      workspaceFetch<WorkspaceAssessmentCaseDetail>(
        `/organisations/${encodeURIComponent(
          organisationSlug
        )}/assessment-cases/${encodeURIComponent(
          caseId
        )}/information-requests/${encodeURIComponent(informationRequestId)}/status`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    requests: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspaceAssessmentRequest[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/assessment-requests`,
        {},
        token
      ),
    createRequest: (
      token: string,
      organisationSlug: string,
      data: CreateWorkspaceAssessmentRequestInput
    ) =>
      workspaceFetch<WorkspaceAssessmentRequest>(
        `/organisations/${encodeURIComponent(organisationSlug)}/assessment-requests`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    policies: (token: string, organisationSlug: string) =>
      workspaceFetch<WorkspacePolicy[]>(
        `/organisations/${encodeURIComponent(organisationSlug)}/policies`,
        {},
        token
      ),
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
  assessmentRequests: {
    get: (requestToken: string) =>
      workspaceFetch<PublicAssessmentRequest>(
        `/assessment-requests/${encodeURIComponent(requestToken)}`
      ),
    start: (token: string, requestToken: string) =>
      workspaceFetch<PublicAssessmentRequest>(
        `/assessment-requests/${encodeURIComponent(requestToken)}/start`,
        { method: 'POST' },
        token
      ),
    decline: (token: string, requestToken: string) =>
      workspaceFetch<PublicAssessmentRequest>(
        `/assessment-requests/${encodeURIComponent(requestToken)}/decline`,
        { method: 'POST' },
        token
      ),
    complete: (token: string, requestToken: string) =>
      workspaceFetch<CompletedAssessmentRequest>(
        `/assessment-requests/${encodeURIComponent(requestToken)}/complete`,
        { method: 'POST' },
        token
      ),
    respondToInformationRequest: (
      token: string,
      requestToken: string,
      informationRequestId: string,
      data: { response: string }
    ) =>
      workspaceFetch<PublicAssessmentRequest>(
        `/assessment-requests/${encodeURIComponent(
          requestToken
        )}/information-requests/${encodeURIComponent(informationRequestId)}/respond`,
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
  },
}
