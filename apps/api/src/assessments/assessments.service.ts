import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import { db } from '@equiscore/database'
import type {
  CompanyAssessmentType,
  CompanyDecision,
  InformationRequestStatus,
  Prisma,
} from '@equiscore/database'
import type { OrganisationContext } from '../organisations/organisation-context'
import type {
  CreatePolicyDto,
  CreateAssessmentRequestDto,
  PolicyRuleInputDto,
  RecordCaseDecisionDto,
  RespondToInformationRequestDto,
  RequestCaseInformationDto,
  UpdatePolicyVersionDto,
  UpdateInformationRequestStatusDto,
} from './assessment-requests.dto'

const COMPANY_REQUEST_CONSENT_VERSION = 'company-request-mvp-2026-07-12'
const CONSENT_TTL_DAYS = 30

const PENDING_REQUEST_STATUSES = [
  'draft',
  'invitation_scheduled',
  'invitation_sent',
  'applicant_opened',
  'applicant_started',
  'information_incomplete',
  'awaiting_consent',
  'ready_for_assessment',
] as const

const POLICY_INPUT_FIELDS = [
  {
    value: 'trustScoreSummary.score',
    label: 'Trust score',
    thresholdType: 'number',
  },
  {
    value: 'affordabilitySummary.latestAffordabilityScore',
    label: 'Affordability score',
    thresholdType: 'number',
  },
  {
    value: 'incomeSummary.latestIncomeStabilityScore',
    label: 'Income stability score',
    thresholdType: 'number',
  },
  {
    value: 'commitmentsSummary.latestRentalReliabilityScore',
    label: 'Rental reliability score',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.activeBankConnections',
    label: 'Active bank connections',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.verifiedDocuments',
    label: 'Verified documents',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.verificationStrengthScore',
    label: 'Verification strength score',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.identityConfidenceScore',
    label: 'Identity confidence score',
    thresholdType: 'number',
  },
  {
    value: 'incomeSummary.declaredMonthlyIncome',
    label: 'Declared monthly income',
    thresholdType: 'currency',
  },
  {
    value: 'affordabilitySummary.proposedCommitment',
    label: 'Proposed commitment',
    thresholdType: 'currency',
  },
] as const

const POLICY_FIELD_VALUES = new Set(POLICY_INPUT_FIELDS.map((field) => field.value))

type NormalisedPolicyRule = {
  name: string
  description?: string
  inputField: string
  operator: string
  threshold?: unknown
  thresholdType?: string
  evidencePeriodMonths?: number
  missingDataBehaviour: string
  confidenceRequirement?: string
  passOutcome: string
  failOutcome: string
  alternativePathway?: string
  humanReviewRequired: boolean
  priority: number
}

type PolicyEvaluationStatus = 'pass' | 'fail' | 'review' | 'missing' | 'not_applicable'

@Injectable()
export class AssessmentsService {
  async createRequest(
    context: OrganisationContext,
    createdById: string,
    input: CreateAssessmentRequestDto
  ) {
    const applicantEmail = this.normaliseEmail(input.applicantEmail)
    const applicantName = this.cleanString(input.applicantName)
    const reference = this.cleanString(input.reference)
    const deadline = this.parseFutureDate(input.deadline)
    const token = randomBytes(24).toString('base64url')

    const policyVersion = await db.policyVersion.findFirst({
      where: {
        organisationId: context.organisationId,
        status: { in: ['active', 'approved'] },
        policy: { assessmentType: input.assessmentType, status: 'active' },
      },
      orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    })

    const request = await db.$transaction(async (tx) => {
      const created = await tx.assessmentRequest.create({
        data: {
          organisationId: context.organisationId,
          applicantEmail,
          applicantName,
          assessmentType: input.assessmentType,
          policyVersionId: policyVersion?.id,
          proposedCommitment: input.proposedCommitment,
          reference,
          status: 'invitation_sent',
          requestToken: token,
          deadline,
          createdById,
          sentAt: new Date(),
        },
        include: this.requestInclude(),
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: createdById,
          action: 'assessment_request_created',
          targetType: 'assessment_request',
          targetId: created.id,
          metadata: this.asJson({
            applicantEmail,
            applicantName,
            assessmentType: input.assessmentType,
            proposedCommitment: input.proposedCommitment ?? null,
            reference: reference ?? null,
            deadline: deadline?.toISOString() ?? null,
          }),
        },
      })

      return created
    })

    return this.mapRequest(request)
  }

  async listCases(context: OrganisationContext) {
    const cases = await db.assessmentCase.findMany({
      where: { organisationId: context.organisationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        reviewer: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        policyVersion: {
          select: { id: true, versionNumber: true, policy: { select: { name: true } } },
        },
        assessmentSnapshot: {
          select: {
            id: true,
            snapshotVersion: true,
            dataPeriodEnd: true,
            sourceFreshness: true,
            createdAt: true,
          },
        },
        _count: { select: { criterionResults: true, notes: true, informationRequests: true } },
      },
    })

    return cases.map((item) => ({
      id: item.id,
      applicant: {
        id: item.applicant.id,
        name: item.applicant.profile?.fullName ?? item.applicant.email,
        email: item.applicant.email,
      },
      assessmentType: item.assessmentType,
      source: item.source,
      status: item.status,
      assessmentOutcome: item.assessmentOutcome,
      assessmentConfidence: item.assessmentConfidence,
      companyDecision: item.companyDecision,
      reference: item.reference,
      proposedCommitment: item.proposedCommitment,
      creditConsumed: item.creditConsumed,
      assessedAt: item.assessedAt,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      reviewer: item.reviewer
        ? {
            id: item.reviewer.id,
            name: item.reviewer.profile?.fullName ?? item.reviewer.email,
            email: item.reviewer.email,
          }
        : null,
      policy: item.policyVersion
        ? {
            id: item.policyVersion.id,
            name: item.policyVersion.policy.name,
            versionNumber: item.policyVersion.versionNumber,
          }
        : null,
      snapshot: {
        id: item.assessmentSnapshot.id,
        version: item.assessmentSnapshot.snapshotVersion,
        dataPeriodEnd: item.assessmentSnapshot.dataPeriodEnd,
        sourceFreshness: item.assessmentSnapshot.sourceFreshness,
        createdAt: item.assessmentSnapshot.createdAt,
      },
      counts: item._count,
    }))
  }

  async getCase(context: OrganisationContext, caseId: string) {
    const assessmentCase = await db.assessmentCase.findFirst({
      where: { id: caseId, organisationId: context.organisationId },
      include: {
        applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        reviewer: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        assessmentRequest: {
          select: {
            id: true,
            applicantEmail: true,
            applicantName: true,
            status: true,
            requestToken: true,
            deadline: true,
            createdAt: true,
            sentAt: true,
            completedAt: true,
          },
        },
        policyVersion: {
          select: {
            id: true,
            versionNumber: true,
            status: true,
            effectiveFrom: true,
            approvedAt: true,
            policy: { select: { id: true, name: true, assessmentType: true, status: true } },
          },
        },
        assessmentSnapshot: true,
        consent: {
          select: {
            id: true,
            status: true,
            purpose: true,
            permittedDataScope: true,
            consentTextVersion: true,
            grantedAt: true,
            expiresAt: true,
            revokedAt: true,
            companyReference: true,
            createdAt: true,
          },
        },
        criterionResults: {
          orderBy: { createdAt: 'asc' },
          include: {
            policyRule: {
              select: {
                id: true,
                name: true,
                description: true,
                inputField: true,
                operator: true,
                threshold: true,
                missingDataBehaviour: true,
                priority: true,
              },
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            author: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          },
        },
        informationRequests: { orderBy: { createdAt: 'desc' }, take: 25 },
        decisions: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            decisionMaker: {
              select: { id: true, email: true, profile: { select: { fullName: true } } },
            },
          },
        },
        usageEvents: {
          orderBy: { occurredAt: 'desc' },
          take: 10,
          select: {
            id: true,
            eventType: true,
            quantity: true,
            unit: true,
            occurredAt: true,
            includedOrOverage: true,
            currency: true,
          },
        },
        auditEvents: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            actorType: true,
            actorId: true,
            action: true,
            targetType: true,
            targetId: true,
            beforeStateReference: true,
            afterStateReference: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    })

    if (!assessmentCase) throw new NotFoundException('Assessment case not found')

    return {
      id: assessmentCase.id,
      applicant: this.mapPerson(assessmentCase.applicant),
      assessmentType: assessmentCase.assessmentType,
      source: assessmentCase.source,
      status: assessmentCase.status,
      assessmentOutcome: assessmentCase.assessmentOutcome,
      assessmentConfidence: assessmentCase.assessmentConfidence,
      companyDecision: assessmentCase.companyDecision,
      decisionRationale: assessmentCase.decisionRationale,
      reference: assessmentCase.reference,
      proposedCommitment: assessmentCase.proposedCommitment,
      creditConsumed: assessmentCase.creditConsumed,
      assessedAt: assessmentCase.assessedAt,
      expiresAt: assessmentCase.expiresAt,
      closedAt: assessmentCase.closedAt,
      createdAt: assessmentCase.createdAt,
      updatedAt: assessmentCase.updatedAt,
      reviewer: assessmentCase.reviewer ? this.mapPerson(assessmentCase.reviewer) : null,
      request: assessmentCase.assessmentRequest
        ? {
            ...assessmentCase.assessmentRequest,
            requestUrl: assessmentCase.assessmentRequest.requestToken
              ? `/requests/${assessmentCase.assessmentRequest.requestToken}`
              : null,
          }
        : null,
      policy: assessmentCase.policyVersion
        ? {
            id: assessmentCase.policyVersion.id,
            versionNumber: assessmentCase.policyVersion.versionNumber,
            status: assessmentCase.policyVersion.status,
            effectiveFrom: assessmentCase.policyVersion.effectiveFrom,
            approvedAt: assessmentCase.policyVersion.approvedAt,
            policy: assessmentCase.policyVersion.policy,
          }
        : null,
      consent: assessmentCase.consent,
      snapshot: {
        id: assessmentCase.assessmentSnapshot.id,
        version: assessmentCase.assessmentSnapshot.snapshotVersion,
        dataPeriodStart: assessmentCase.assessmentSnapshot.dataPeriodStart,
        dataPeriodEnd: assessmentCase.assessmentSnapshot.dataPeriodEnd,
        sourceFreshness: assessmentCase.assessmentSnapshot.sourceFreshness,
        permittedDataScope: assessmentCase.assessmentSnapshot.permittedDataScope,
        trustScoreSummary: assessmentCase.assessmentSnapshot.trustScoreSummary,
        insightSummary: assessmentCase.assessmentSnapshot.insightSummary,
        incomeSummary: assessmentCase.assessmentSnapshot.incomeSummary,
        affordabilitySummary: assessmentCase.assessmentSnapshot.affordabilitySummary,
        commitmentsSummary: assessmentCase.assessmentSnapshot.commitmentsSummary,
        verificationSummary: assessmentCase.assessmentSnapshot.verificationSummary,
        evidenceManifest: assessmentCase.assessmentSnapshot.evidenceManifest,
        evidenceReferences: assessmentCase.assessmentSnapshot.evidenceReferences,
        integrityHash: assessmentCase.assessmentSnapshot.integrityHash,
        createdAt: assessmentCase.assessmentSnapshot.createdAt,
      },
      criterionResults: assessmentCase.criterionResults.map((result) => ({
        id: result.id,
        result: result.result,
        observedValue: result.observedValue,
        thresholdValue: result.thresholdValue,
        confidence: result.confidence,
        evidenceReferences: result.evidenceReferences,
        assumptions: result.assumptions,
        missingInformation: result.missingInformation,
        createdAt: result.createdAt,
        policyRule: result.policyRule,
      })),
      notes: assessmentCase.notes.map((note) => ({
        id: note.id,
        visibility: note.visibility,
        body: note.body,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: this.mapPerson(note.author),
      })),
      informationRequests: assessmentCase.informationRequests,
      decisions: assessmentCase.decisions.map((decision) => ({
        id: decision.id,
        decision: decision.decision,
        conditions: decision.conditions,
        rationale: decision.rationale,
        assessmentOutcomeAtDecision: decision.assessmentOutcomeAtDecision,
        overrideFlag: decision.overrideFlag,
        overrideReason: decision.overrideReason,
        createdAt: decision.createdAt,
        decisionMaker: this.mapPerson(decision.decisionMaker),
      })),
      usageEvents: assessmentCase.usageEvents,
      auditEvents: assessmentCase.auditEvents,
    }
  }

  async recordCaseDecision(
    context: OrganisationContext,
    caseId: string,
    decisionMakerId: string,
    input: RecordCaseDecisionDto
  ) {
    const rationale = this.cleanString(input.rationale)
    if (!rationale) throw new BadRequestException('Decision rationale is required')

    const conditions = this.cleanString(input.conditions)
    const overrideReason = this.cleanString(input.overrideReason)
    const now = new Date()

    const assessmentCase = await db.assessmentCase.findFirst({
      where: { id: caseId, organisationId: context.organisationId },
      select: {
        id: true,
        status: true,
        assessmentOutcome: true,
        companyDecision: true,
        decisionRationale: true,
      },
    })

    if (!assessmentCase) throw new NotFoundException('Assessment case not found')

    const nextStatus = this.caseStatusForDecision(input.decision)
    const closesCase = this.decisionClosesCase(input.decision)
    const overrideFlag = this.isDecisionOverride(input.decision, assessmentCase.assessmentOutcome)
    if (overrideFlag && !overrideReason) {
      throw new BadRequestException(
        'Override reason is required when the company decision differs from the EquiScore outcome'
      )
    }

    await db.$transaction(async (tx) => {
      await tx.caseDecision.create({
        data: {
          assessmentCaseId: assessmentCase.id,
          organisationId: context.organisationId,
          decision: input.decision,
          conditions: conditions ? this.asJson({ text: conditions }) : undefined,
          rationale,
          decisionMakerId,
          assessmentOutcomeAtDecision: assessmentCase.assessmentOutcome,
          overrideFlag,
          overrideReason,
        },
      })

      await tx.assessmentCase.update({
        where: { id: assessmentCase.id },
        data: {
          companyDecision: input.decision,
          decisionRationale: rationale,
          reviewerId: decisionMakerId,
          status: nextStatus,
          closedAt: closesCase ? now : null,
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          assessmentCaseId: assessmentCase.id,
          actorType: 'partner_user',
          actorId: decisionMakerId,
          action: 'assessment_case_decision_recorded',
          targetType: 'assessment_case',
          targetId: assessmentCase.id,
          beforeStateReference: this.hashPayload({
            status: assessmentCase.status,
            companyDecision: assessmentCase.companyDecision,
            decisionRationale: assessmentCase.decisionRationale,
          }),
          afterStateReference: this.hashPayload({
            status: nextStatus,
            companyDecision: input.decision,
            decisionRationale: rationale,
          }),
          metadata: this.asJson({
            decision: input.decision,
            conditions: conditions ?? null,
            overrideFlag,
            overrideReason: overrideReason ?? null,
          }),
        },
      })
    })

    return this.getCase(context, caseId)
  }

  async requestCaseInformation(
    context: OrganisationContext,
    caseId: string,
    createdById: string,
    input: RequestCaseInformationDto
  ) {
    const message = this.cleanString(input.message)
    if (!message) throw new BadRequestException('Information request message is required')

    const requestType = this.cleanString(input.requestType) ?? 'general'
    const requestedFields = this.parseRequestedFields(input.requestedFields)
    const dueAt = this.parseFutureDate(input.dueAt)

    const assessmentCase = await db.assessmentCase.findFirst({
      where: { id: caseId, organisationId: context.organisationId },
      select: { id: true, status: true },
    })

    if (!assessmentCase) throw new NotFoundException('Assessment case not found')

    await db.$transaction(async (tx) => {
      const informationRequest = await tx.informationRequest.create({
        data: {
          assessmentCaseId: assessmentCase.id,
          requestType,
          message,
          requestedFields:
            requestedFields.length > 0 ? this.asJson({ fields: requestedFields }) : undefined,
          dueAt,
          createdById,
        },
      })

      await tx.assessmentCase.update({
        where: { id: assessmentCase.id },
        data: {
          status: 'information_requested',
          reviewerId: createdById,
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          assessmentCaseId: assessmentCase.id,
          actorType: 'partner_user',
          actorId: createdById,
          action: 'assessment_case_information_requested',
          targetType: 'information_request',
          targetId: informationRequest.id,
          beforeStateReference: this.hashPayload({ status: assessmentCase.status }),
          afterStateReference: this.hashPayload({ status: 'information_requested' }),
          metadata: this.asJson({
            requestType,
            requestedFields,
            dueAt: dueAt?.toISOString() ?? null,
          }),
        },
      })
    })

    return this.getCase(context, caseId)
  }

  async updateInformationRequestStatus(
    context: OrganisationContext,
    caseId: string,
    informationRequestId: string,
    actorId: string,
    input: UpdateInformationRequestStatusDto
  ) {
    const assessmentCase = await db.assessmentCase.findFirst({
      where: { id: caseId, organisationId: context.organisationId },
      select: {
        id: true,
        status: true,
        informationRequests: {
          where: { id: informationRequestId },
          select: { id: true, status: true, requestType: true },
        },
      },
    })

    if (!assessmentCase) throw new NotFoundException('Assessment case not found')

    const informationRequest = assessmentCase.informationRequests[0] ?? null
    if (!informationRequest) throw new NotFoundException('Information request not found')

    this.assertInformationRequestTransition(informationRequest.status, input.status)

    await db.$transaction(async (tx) => {
      await tx.informationRequest.update({
        where: { id: informationRequest.id },
        data: {
          status: input.status,
          resolvedAt: input.status === 'resolved' ? new Date() : null,
        },
      })

      const nextCaseStatus = await this.caseStatusAfterInformationRequestUpdate(
        tx,
        assessmentCase.id
      )

      await tx.assessmentCase.update({
        where: { id: assessmentCase.id },
        data: {
          status: nextCaseStatus,
          reviewerId: actorId,
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          assessmentCaseId: assessmentCase.id,
          actorType: 'partner_user',
          actorId,
          action: `assessment_case_information_${input.status}`,
          targetType: 'information_request',
          targetId: informationRequest.id,
          beforeStateReference: this.hashPayload({
            caseStatus: assessmentCase.status,
            informationRequestStatus: informationRequest.status,
          }),
          afterStateReference: this.hashPayload({
            caseStatus: nextCaseStatus,
            informationRequestStatus: input.status,
          }),
          metadata: this.asJson({
            requestType: informationRequest.requestType,
            previousStatus: informationRequest.status,
            nextStatus: input.status,
          }),
        },
      })
    })

    return this.getCase(context, caseId)
  }

  async listRequests(context: OrganisationContext) {
    const requests = await db.assessmentRequest.findMany({
      where: { organisationId: context.organisationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: this.requestInclude(),
    })

    return requests.map((request) => this.mapRequest(request))
  }

  async getPublicRequest(token: string, ipAddress?: string) {
    const request = await db.assessmentRequest.findUnique({
      where: { requestToken: token },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        policyVersion: {
          select: { id: true, versionNumber: true, policy: { select: { name: true } } },
        },
        cases: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            assessmentOutcome: true,
            assessmentConfidence: true,
            companyDecision: true,
            decisionRationale: true,
            reference: true,
            assessedAt: true,
            expiresAt: true,
            createdAt: true,
            informationRequests: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                requestType: true,
                message: true,
                requestedFields: true,
                status: true,
                dueAt: true,
                applicantResponse: true,
                createdAt: true,
                respondedAt: true,
                resolvedAt: true,
              },
            },
          },
        },
      },
    })

    if (!request) throw new NotFoundException('Assessment request not found')

    let status = request.status
    const now = new Date()

    if (request.deadline && request.deadline < now && this.isPendingRequestStatus(request.status)) {
      await db.assessmentRequest.update({
        where: { id: request.id },
        data: { status: 'expired' },
      })
      await db.organisationAuditEvent.create({
        data: {
          organisationId: request.organisationId,
          actorType: 'system',
          action: 'assessment_request_expired',
          targetType: 'assessment_request',
          targetId: request.id,
          ipAddress,
        },
      })
      status = 'expired'
    } else if (request.status === 'invitation_sent') {
      await db.assessmentRequest.update({
        where: { id: request.id },
        data: { status: 'applicant_opened' },
      })
      await db.organisationAuditEvent.create({
        data: {
          organisationId: request.organisationId,
          actorType: 'applicant_public',
          action: 'assessment_request_opened',
          targetType: 'assessment_request',
          targetId: request.id,
          ipAddress,
        },
      })
      status = 'applicant_opened'
    }

    const latestCase = request.cases[0] ?? null

    return {
      id: request.id,
      organisation: request.organisation,
      applicant: {
        name: request.applicantName,
        email: request.applicantEmail,
      },
      assessmentType: request.assessmentType,
      status,
      proposedCommitment: request.proposedCommitment,
      reference: request.reference,
      deadline: request.deadline,
      createdAt: request.createdAt,
      sentAt: request.sentAt,
      completedAt: request.completedAt,
      policy: request.policyVersion
        ? {
            id: request.policyVersion.id,
            name: request.policyVersion.policy.name,
            versionNumber: request.policyVersion.versionNumber,
          }
        : null,
      isCompletable: this.isPendingRequestStatus(status),
      case: latestCase
        ? {
            id: latestCase.id,
            status: latestCase.status,
            assessmentOutcome: latestCase.assessmentOutcome,
            assessmentConfidence: latestCase.assessmentConfidence,
            companyDecision: latestCase.companyDecision,
            decisionRationale: latestCase.decisionRationale,
            reference: latestCase.reference,
            assessedAt: latestCase.assessedAt,
            expiresAt: latestCase.expiresAt,
            createdAt: latestCase.createdAt,
          }
        : null,
      informationRequests: latestCase?.informationRequests ?? [],
      canRespondToInformationRequests:
        latestCase?.informationRequests.some((item) => item.status === 'open') ?? false,
    }
  }

  async respondToInformationRequest(
    token: string,
    informationRequestId: string,
    applicantUserId: string,
    input: RespondToInformationRequestDto,
    ipAddress?: string
  ) {
    const response = this.cleanString(input.response)
    if (!response) throw new BadRequestException('Response is required')

    const request = await db.assessmentRequest.findUnique({
      where: { requestToken: token },
      select: {
        id: true,
        organisationId: true,
        applicantEmail: true,
        cancelledAt: true,
        status: true,
        cases: {
          where: { informationRequests: { some: { id: informationRequestId } } },
          take: 1,
          select: {
            id: true,
            applicantId: true,
            status: true,
            informationRequests: {
              where: { id: informationRequestId },
              select: { id: true, status: true, requestType: true },
            },
          },
        },
      },
    })

    if (!request) throw new NotFoundException('Assessment request not found')
    if (request.cancelledAt || request.status === 'cancelled') {
      throw new ForbiddenException('This assessment request has been cancelled')
    }
    if (request.status === 'declined') {
      throw new ForbiddenException('This assessment request was declined')
    }
    if (request.status === 'expired') {
      throw new ForbiddenException('This assessment request has expired')
    }

    const applicant = await db.user.findUnique({
      where: { id: applicantUserId },
      select: { id: true, email: true },
    })
    if (!applicant) throw new NotFoundException('Applicant not found')

    const requestedEmail = this.normaliseEmail(request.applicantEmail)
    const signedInEmail = this.normaliseEmail(applicant.email)
    if (requestedEmail !== signedInEmail) {
      throw new ForbiddenException(
        `This request was sent to ${requestedEmail}. Please sign in with that email.`
      )
    }

    const assessmentCase = request.cases[0] ?? null
    const informationRequest = assessmentCase?.informationRequests[0] ?? null
    if (!assessmentCase || !informationRequest) {
      throw new NotFoundException('Information request not found for this assessment')
    }
    if (assessmentCase.applicantId !== applicantUserId) {
      throw new ForbiddenException('This assessment belongs to a different applicant')
    }
    if (informationRequest.status !== 'open') {
      throw new BadRequestException('This information request is no longer open')
    }

    const now = new Date()
    await db.$transaction(async (tx) => {
      await tx.informationRequest.update({
        where: { id: informationRequest.id },
        data: {
          applicantResponse: response,
          status: 'applicant_responded',
          respondedAt: now,
        },
      })

      await tx.assessmentCase.update({
        where: { id: assessmentCase.id },
        data: { status: 'applicant_responded' },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: request.organisationId,
          assessmentCaseId: assessmentCase.id,
          actorType: 'applicant',
          actorId: applicantUserId,
          action: 'assessment_case_information_responded',
          targetType: 'information_request',
          targetId: informationRequest.id,
          beforeStateReference: this.hashPayload({
            caseStatus: assessmentCase.status,
            informationRequestStatus: informationRequest.status,
          }),
          afterStateReference: this.hashPayload({
            caseStatus: 'applicant_responded',
            informationRequestStatus: 'applicant_responded',
          }),
          ipAddress,
          metadata: this.asJson({
            requestType: informationRequest.requestType,
          }),
        },
      })
    })

    return this.getPublicRequest(token, ipAddress)
  }

  async startRequest(token: string, applicantUserId: string, ipAddress?: string) {
    const request = await db.assessmentRequest.findUnique({
      where: { requestToken: token },
      select: {
        id: true,
        organisationId: true,
        applicantEmail: true,
        applicantId: true,
        status: true,
        deadline: true,
        cancelledAt: true,
      },
    })

    if (!request) throw new NotFoundException('Assessment request not found')
    if (request.status === 'assessment_delivered') return this.getPublicRequest(token, ipAddress)
    this.assertRequestNotClosed(request)

    const applicant = await this.assertRequestApplicant(request.applicantEmail, applicantUserId)
    await this.expireRequestIfPastDeadline(request, ipAddress)

    const nextStatus = this.isApplicantProfileStarted(applicant.profile?.profileStage)
      ? 'awaiting_consent'
      : 'applicant_started'
    const shouldUpdate =
      this.isPendingRequestStatus(request.status) &&
      (request.status !== nextStatus || request.applicantId !== applicantUserId)

    if (shouldUpdate) {
      await db.$transaction(async (tx) => {
        await tx.assessmentRequest.update({
          where: { id: request.id },
          data: {
            applicantId: applicantUserId,
            status: nextStatus,
          },
        })

        await tx.organisationAuditEvent.create({
          data: {
            organisationId: request.organisationId,
            actorType: 'applicant',
            actorId: applicantUserId,
            action: 'assessment_request_started',
            targetType: 'assessment_request',
            targetId: request.id,
            beforeStateReference: this.hashPayload({ status: request.status }),
            afterStateReference: this.hashPayload({ status: nextStatus }),
            ipAddress,
          },
        })
      })
    }

    return this.getPublicRequest(token, ipAddress)
  }

  async declineRequest(token: string, applicantUserId: string, ipAddress?: string) {
    const request = await db.assessmentRequest.findUnique({
      where: { requestToken: token },
      select: {
        id: true,
        organisationId: true,
        applicantEmail: true,
        applicantId: true,
        status: true,
        deadline: true,
        cancelledAt: true,
      },
    })

    if (!request) throw new NotFoundException('Assessment request not found')
    if (request.status === 'assessment_delivered') {
      throw new BadRequestException('This assessment request has already been delivered')
    }
    this.assertRequestNotClosed(request)
    await this.assertRequestApplicant(request.applicantEmail, applicantUserId)
    await this.expireRequestIfPastDeadline(request, ipAddress)

    const declined = await db.$transaction(async (tx) => {
      const updated = await tx.assessmentRequest.update({
        where: { id: request.id },
        data: {
          applicantId: applicantUserId,
          status: 'declined',
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: request.organisationId,
          actorType: 'applicant',
          actorId: applicantUserId,
          action: 'assessment_request_declined',
          targetType: 'assessment_request',
          targetId: request.id,
          beforeStateReference: this.hashPayload({ status: request.status }),
          afterStateReference: this.hashPayload({ status: updated.status }),
          ipAddress,
        },
      })

      return updated
    })

    if (declined.status !== 'declined') {
      throw new BadRequestException('This assessment request could not be declined')
    }

    return this.getPublicRequest(token, ipAddress)
  }

  async completeRequest(token: string, applicantUserId: string, ipAddress?: string) {
    const request = await db.assessmentRequest.findUnique({
      where: { requestToken: token },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!request) throw new NotFoundException('Assessment request not found')
    if (request.cancelledAt || request.status === 'cancelled') {
      throw new ForbiddenException('This assessment request has been cancelled')
    }
    if (request.status === 'declined') {
      throw new ForbiddenException('This assessment request was declined')
    }
    if (request.status === 'expired') {
      throw new ForbiddenException('This assessment request has expired')
    }

    const applicant = await db.user.findUnique({
      where: { id: applicantUserId },
      include: {
        profile: true,
        employment: { where: { isCurrent: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        rentalProfiles: { where: { isCurrent: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            bankConnections: true,
            documents: true,
            trustScores: true,
            insightQuestionAnswers: true,
          },
        },
      },
    })
    if (!applicant) throw new NotFoundException('Applicant not found')

    const requestedEmail = this.normaliseEmail(request.applicantEmail)
    const signedInEmail = this.normaliseEmail(applicant.email)
    if (requestedEmail !== signedInEmail) {
      throw new ForbiddenException(
        `This request was sent to ${requestedEmail}. Please sign in with that email.`
      )
    }

    const now = new Date()
    if (request.deadline && request.deadline < now && this.isPendingRequestStatus(request.status)) {
      await db.assessmentRequest.update({ where: { id: request.id }, data: { status: 'expired' } })
      throw new ForbiddenException('This assessment request has expired')
    }
    if (request.status !== 'assessment_delivered' && !this.isPendingRequestStatus(request.status)) {
      throw new ForbiddenException('This assessment request is no longer open')
    }

    const latestScore = await db.trustScore.findFirst({
      where: { userId: applicantUserId },
      orderBy: { computedAt: 'desc' },
    })
    const activeBankConnections = await db.bankConnection.count({
      where: { userId: applicantUserId, connectionStatus: 'active' },
    })
    const verifiedDocuments = await db.uploadedDocument.count({
      where: { userId: applicantUserId, verificationStatus: 'verified' },
    })
    const recentFeatures = await db.trustFeature.findMany({
      where: { userId: applicantUserId },
      orderBy: { computedAt: 'desc' },
      take: 12,
      select: {
        featureKey: true,
        featureValueNum: true,
        featureValueText: true,
        featureValueBool: true,
        computedAt: true,
      },
    })

    return db.$transaction(async (tx) => {
      const existingCase = await tx.assessmentCase.findFirst({
        where: { assessmentRequestId: request.id },
        select: {
          id: true,
          status: true,
          assessmentOutcome: true,
          assessmentConfidence: true,
          reference: true,
          assessedAt: true,
          expiresAt: true,
        },
      })
      if (existingCase) {
        await tx.assessmentRequest.update({
          where: { id: request.id },
          data: {
            applicantId: applicantUserId,
            status: 'assessment_delivered',
            completedAt: request.completedAt ?? now,
          },
        })
        return { requestId: request.id, status: 'assessment_delivered', case: existingCase }
      }

      const consentExpiresAt = new Date(now)
      consentExpiresAt.setDate(consentExpiresAt.getDate() + CONSENT_TTL_DAYS)
      const permittedDataScope = this.asJson({
        purpose: 'company_assessment',
        fields: [
          'trust_score_summary',
          'income_summary',
          'affordability_summary',
          'commitments_summary',
          'verification_summary',
          'evidence_manifest',
        ],
        excludes: [
          'raw_transactions',
          'merchant_level_spending',
          'bank_account_numbers',
          'document_files',
        ],
      })

      const consent = await tx.companyConsent.create({
        data: {
          organisationId: request.organisationId,
          applicantId: applicantUserId,
          assessmentRequestId: request.id,
          assessmentType: request.assessmentType,
          purpose: `${request.organisation.name} requested an EquiScore ${request.assessmentType} assessment.`,
          permittedDataScope,
          consentTextVersion: COMPANY_REQUEST_CONSENT_VERSION,
          status: 'granted',
          grantedAt: now,
          expiresAt: consentExpiresAt,
          companyReference: request.reference,
        },
      })

      const snapshotVersionAggregate = await tx.assessmentSnapshot.aggregate({
        where: { organisationId: request.organisationId, applicantId: applicantUserId },
        _max: { snapshotVersion: true },
      })
      const snapshotVersion = (snapshotVersionAggregate._max.snapshotVersion ?? 0) + 1
      const snapshotPayload = this.buildSnapshotPayload({
        request,
        applicant,
        latestScore,
        activeBankConnections,
        verifiedDocuments,
        recentFeatures,
      })
      const integrityHash = this.hashPayload({
        organisationId: request.organisationId,
        applicantId: applicantUserId,
        consentId: consent.id,
        snapshotVersion,
        ...snapshotPayload,
      })

      const snapshot = await tx.assessmentSnapshot.create({
        data: {
          organisationId: request.organisationId,
          applicantId: applicantUserId,
          consentId: consent.id,
          snapshotVersion,
          dataPeriodStart: null,
          dataPeriodEnd: latestScore?.financialDataAsOf ?? latestScore?.computedAt ?? null,
          sourceFreshness: latestScore ? 'latest_trust_score' : 'profile_only',
          permittedDataScope,
          trustScoreSummary: this.asJson(snapshotPayload.trustScoreSummary),
          insightSummary: this.asJson(snapshotPayload.insightSummary),
          incomeSummary: this.asJson(snapshotPayload.incomeSummary),
          affordabilitySummary: this.asJson(snapshotPayload.affordabilitySummary),
          commitmentsSummary: this.asJson(snapshotPayload.commitmentsSummary),
          verificationSummary: this.asJson(snapshotPayload.verificationSummary),
          evidenceManifest: this.asJson(snapshotPayload.evidenceManifest),
          evidenceReferences: this.asJson(snapshotPayload.evidenceReferences),
          integrityHash,
        },
      })

      const outcome = this.assessmentOutcomeFor(latestScore?.overallScore)
      const confidence = this.assessmentConfidenceFor(
        latestScore?.overallScore,
        activeBankConnections,
        verifiedDocuments
      )
      const assessmentCase = await tx.assessmentCase.create({
        data: {
          organisationId: request.organisationId,
          applicantId: applicantUserId,
          assessmentRequestId: request.id,
          source: 'company_requested',
          assessmentType: request.assessmentType,
          policyVersionId: request.policyVersionId,
          assessmentSnapshotId: snapshot.id,
          consentId: consent.id,
          status: 'assessment_ready',
          assessmentOutcome: outcome,
          assessmentConfidence: confidence,
          reference: request.reference,
          proposedCommitment: request.proposedCommitment,
          creditConsumed: true,
          assessedAt: now,
          expiresAt: consentExpiresAt,
        },
        select: {
          id: true,
          status: true,
          assessmentOutcome: true,
          assessmentConfidence: true,
          reference: true,
          assessedAt: true,
          expiresAt: true,
        },
      })

      await tx.criterionResult.create({
        data: {
          assessmentCaseId: assessmentCase.id,
          result: outcome === 'meets_criteria' ? 'pass' : 'review',
          observedValue: this.asJson({
            trustScore: latestScore?.overallScore ?? null,
            tier: latestScore?.overallTier ?? null,
            activeBankConnections,
            verifiedDocuments,
            proposedCommitment: request.proposedCommitment ?? null,
          }),
          thresholdValue: this.asJson({
            mvp: true,
            passScore: 80,
            reviewScore: 60,
            policyVersionId: request.policyVersionId ?? null,
          }),
          confidence,
          evidenceReferences: this.asJson(snapshotPayload.evidenceReferences),
          assumptions: this.asJson([
            'MVP deterministic completion criterion.',
            'Final decision remains with the partner organisation.',
          ]),
          missingInformation: this.asJson(latestScore ? [] : ['trust_score']),
        },
      })

      await tx.usageEvent.upsert({
        where: { idempotencyKey: `${request.organisationId}:${request.id}:assessment_delivered` },
        update: {},
        create: {
          organisationId: request.organisationId,
          assessmentCaseId: assessmentCase.id,
          assessmentSnapshotId: snapshot.id,
          applicantId: applicantUserId,
          eventType: 'assessment_delivered',
          source: 'company_requested',
          quantity: 1,
          unit: 'assessment_credit',
          includedOrOverage: 'included',
          initiatedByUserId: applicantUserId,
          idempotencyKey: `${request.organisationId}:${request.id}:assessment_delivered`,
          metadata: this.asJson({
            assessmentRequestId: request.id,
            assessmentType: request.assessmentType,
            consentId: consent.id,
            snapshotVersion,
          }),
        },
      })

      await tx.assessmentRequest.update({
        where: { id: request.id },
        data: {
          applicantId: applicantUserId,
          status: 'assessment_delivered',
          completedAt: now,
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: request.organisationId,
          assessmentCaseId: assessmentCase.id,
          actorType: 'applicant',
          actorId: applicantUserId,
          action: 'assessment_request_completed',
          targetType: 'assessment_case',
          targetId: assessmentCase.id,
          afterStateReference: snapshot.integrityHash,
          ipAddress,
          metadata: this.asJson({
            assessmentRequestId: request.id,
            consentId: consent.id,
            assessmentSnapshotId: snapshot.id,
            assessmentOutcome: outcome,
            assessmentConfidence: confidence,
          }),
        },
      })

      return { requestId: request.id, status: 'assessment_delivered', case: assessmentCase }
    })
  }

  async listPolicies(context: OrganisationContext) {
    const policies = await db.policy.findMany({
      where: { organisationId: context.organisationId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: this.policyVersionInclude(),
        },
        _count: { select: { versions: true } },
      },
    })

    return policies.map((policy) => this.mapPolicy(policy))
  }

  async getPolicy(context: OrganisationContext, policyId: string) {
    const policy = await db.policy.findFirst({
      where: { id: policyId, organisationId: context.organisationId },
      include: {
        createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: this.policyVersionInclude(),
        },
        _count: { select: { versions: true } },
      },
    })

    if (!policy) throw new NotFoundException('Policy not found')
    return this.mapPolicy(policy)
  }

  async createPolicy(context: OrganisationContext, createdById: string, input: CreatePolicyDto) {
    const name = this.cleanString(input.name)
    if (!name) throw new BadRequestException('Policy name is required')

    const rules = this.normalisePolicyRules(
      input.rules,
      input.assessmentType,
      this.cleanString(input.aiPrompt)
    )
    const workflowMetadata = this.buildPolicyWorkflowMetadata({
      assessmentType: input.assessmentType,
      aiPrompt: input.aiPrompt,
      rules,
      action: 'draft_created',
    })
    const changeSummary =
      this.cleanString(input.changeSummary) ??
      (input.aiPrompt ? 'Starter policy drafted from AI workflow guidance.' : 'Initial draft.')

    const policy = await db.$transaction(async (tx) => {
      const created = await tx.policy.create({
        data: {
          organisationId: context.organisationId,
          name,
          assessmentType: input.assessmentType,
          status: 'draft',
          createdById,
          versions: {
            create: {
              organisationId: context.organisationId,
              versionNumber: 1,
              status: 'draft',
              createdById,
              sourceDocumentReference: input.aiPrompt ? 'ai_workflow:draft_assist' : null,
              changeSummary,
              testResults: this.asJson({ workflow: workflowMetadata, lastPreview: null }),
              rules: { create: this.toPolicyRuleCreates(rules) },
            },
          },
        },
        include: {
          createdBy: {
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: this.policyVersionInclude(),
          },
          _count: { select: { versions: true } },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: createdById,
          action: 'policy_created',
          targetType: 'policy',
          targetId: created.id,
          metadata: this.asJson({
            policyName: name,
            assessmentType: input.assessmentType,
            ruleCount: rules.length,
            workflow: workflowMetadata,
          }),
        },
      })

      return created
    })

    return this.mapPolicy(policy)
  }

  async updatePolicyVersion(
    context: OrganisationContext,
    policyId: string,
    versionId: string,
    updatedById: string,
    input: UpdatePolicyVersionDto
  ) {
    const version = await this.findPolicyVersion(context, policyId, versionId)
    if (version.status !== 'draft') {
      throw new BadRequestException('Only draft policy versions can be edited')
    }

    const rules = this.normalisePolicyRules(
      input.rules,
      version.policy.assessmentType,
      this.cleanString(input.aiPrompt)
    )
    const workflowMetadata = this.buildPolicyWorkflowMetadata({
      assessmentType: version.policy.assessmentType,
      aiPrompt: input.aiPrompt,
      rules,
      action: 'draft_updated',
    })
    const changeSummary =
      this.cleanString(input.changeSummary) ??
      (input.aiPrompt ? 'Draft updated from AI workflow guidance.' : version.changeSummary)

    await db.$transaction(async (tx) => {
      await tx.policyRule.deleteMany({ where: { policyVersionId: version.id } })
      await tx.policyVersion.update({
        where: { id: version.id },
        data: {
          changeSummary,
          sourceDocumentReference: input.aiPrompt
            ? 'ai_workflow:draft_assist'
            : version.sourceDocumentReference,
          testResults: this.asJson({ workflow: workflowMetadata, lastPreview: null }),
          rules: { create: this.toPolicyRuleCreates(rules) },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: updatedById,
          action: 'policy_version_updated',
          targetType: 'policy_version',
          targetId: version.id,
          beforeStateReference: this.hashPayload({
            status: version.status,
            ruleCount: version.rules.length,
          }),
          afterStateReference: this.hashPayload({ status: 'draft', ruleCount: rules.length }),
          metadata: this.asJson({
            policyId,
            versionNumber: version.versionNumber,
            ruleCount: rules.length,
            workflow: workflowMetadata,
          }),
        },
      })
    })

    return this.getPolicy(context, policyId)
  }

  async submitPolicyVersion(
    context: OrganisationContext,
    policyId: string,
    versionId: string,
    submittedById: string
  ) {
    const version = await this.findPolicyVersion(context, policyId, versionId)
    if (version.status !== 'draft') {
      throw new BadRequestException('Only draft policy versions can be submitted')
    }
    if (version.rules.length === 0) {
      throw new BadRequestException('Add at least one rule before submitting a policy')
    }

    await db.$transaction(async (tx) => {
      await tx.policyVersion.update({
        where: { id: version.id },
        data: { status: 'awaiting_approval' },
      })
      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: submittedById,
          action: 'policy_version_submitted',
          targetType: 'policy_version',
          targetId: version.id,
          beforeStateReference: this.hashPayload({ status: version.status }),
          afterStateReference: this.hashPayload({ status: 'awaiting_approval' }),
          metadata: this.asJson({ policyId, versionNumber: version.versionNumber }),
        },
      })
    })

    return this.getPolicy(context, policyId)
  }

  async approvePolicyVersion(
    context: OrganisationContext,
    policyId: string,
    versionId: string,
    approvedById: string
  ) {
    const version = await this.findPolicyVersion(context, policyId, versionId)
    if (!['awaiting_approval', 'approved'].includes(version.status)) {
      throw new BadRequestException('Only submitted policy versions can be approved')
    }

    const now = new Date()
    await db.$transaction(async (tx) => {
      await tx.policyVersion.updateMany({
        where: {
          organisationId: context.organisationId,
          policyId,
          status: 'active',
          id: { not: version.id },
        },
        data: { status: 'retired', effectiveTo: now },
      })
      await tx.policyVersion.update({
        where: { id: version.id },
        data: {
          status: 'active',
          approvedById,
          approvedAt: now,
          effectiveFrom: now,
          effectiveTo: null,
        },
      })
      await tx.policy.update({
        where: { id: policyId },
        data: { status: 'active' },
      })
      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: approvedById,
          action: 'policy_version_approved',
          targetType: 'policy_version',
          targetId: version.id,
          beforeStateReference: this.hashPayload({ status: version.status }),
          afterStateReference: this.hashPayload({ status: 'active' }),
          metadata: this.asJson({ policyId, versionNumber: version.versionNumber }),
        },
      })
    })

    return this.getPolicy(context, policyId)
  }

  async retirePolicy(context: OrganisationContext, policyId: string, retiredById: string) {
    const policy = await db.policy.findFirst({
      where: { id: policyId, organisationId: context.organisationId },
      select: { id: true, status: true },
    })
    if (!policy) throw new NotFoundException('Policy not found')

    const now = new Date()
    await db.$transaction(async (tx) => {
      await tx.policy.update({ where: { id: policyId }, data: { status: 'retired' } })
      await tx.policyVersion.updateMany({
        where: {
          organisationId: context.organisationId,
          policyId,
          status: { in: ['draft', 'awaiting_approval', 'approved', 'active'] },
        },
        data: { status: 'retired', effectiveTo: now },
      })
      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: retiredById,
          action: 'policy_retired',
          targetType: 'policy',
          targetId: policyId,
          beforeStateReference: this.hashPayload({ status: policy.status }),
          afterStateReference: this.hashPayload({ status: 'retired' }),
        },
      })
    })

    return this.getPolicy(context, policyId)
  }

  async previewPolicyVersion(
    context: OrganisationContext,
    policyId: string,
    versionId: string,
    previewedById: string
  ) {
    const version = await this.findPolicyVersion(context, policyId, versionId)
    const cases = await db.assessmentCase.findMany({
      where: {
        organisationId: context.organisationId,
        assessmentType: version.policy.assessmentType,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        assessmentSnapshot: {
          select: {
            id: true,
            trustScoreSummary: true,
            incomeSummary: true,
            affordabilitySummary: true,
            commitmentsSummary: true,
            verificationSummary: true,
            createdAt: true,
          },
        },
      },
    })

    const rows = cases.map((assessmentCase) =>
      this.evaluatePolicyAgainstCase(version.rules, assessmentCase)
    )
    const summary = {
      casesEvaluated: rows.length,
      pass: rows.filter((row) => row.outcome === 'pass').length,
      fail: rows.filter((row) => row.outcome === 'fail').length,
      review: rows.filter((row) => row.outcome === 'review').length,
      missing: rows.filter((row) => row.ruleResults.some((result) => result.result === 'missing'))
        .length,
    }
    const preview = {
      policyId,
      versionId,
      versionNumber: version.versionNumber,
      generatedAt: new Date().toISOString(),
      inputFields: POLICY_INPUT_FIELDS,
      summary,
      rows,
    }

    await db.$transaction(async (tx) => {
      await tx.policyVersion.update({
        where: { id: version.id },
        data: {
          testResults: this.asJson({
            ...(this.jsonObject(version.testResults) ?? {}),
            lastPreview: {
              generatedAt: preview.generatedAt,
              summary,
            },
          }),
        },
      })
      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: previewedById,
          action: 'policy_version_previewed',
          targetType: 'policy_version',
          targetId: version.id,
          metadata: this.asJson({
            policyId,
            versionNumber: version.versionNumber,
            summary,
          }),
        },
      })
    })

    return preview
  }

  async listUsageEvents(context: OrganisationContext) {
    const events = await db.usageEvent.findMany({
      where: { organisationId: context.organisationId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: {
        assessmentCase: { select: { id: true, reference: true, assessmentType: true } },
        applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        initiatedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
    })

    return events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      source: event.source,
      quantity: event.quantity,
      unit: event.unit,
      occurredAt: event.occurredAt,
      includedOrOverage: event.includedOrOverage,
      unitPrice: event.unitPrice,
      currency: event.currency,
      assessmentCase: event.assessmentCase,
      applicant: event.applicant
        ? {
            id: event.applicant.id,
            name: event.applicant.profile?.fullName ?? event.applicant.email,
            email: event.applicant.email,
          }
        : null,
      initiatedBy: event.initiatedBy
        ? {
            id: event.initiatedBy.id,
            name: event.initiatedBy.profile?.fullName ?? event.initiatedBy.email,
            email: event.initiatedBy.email,
          }
        : null,
    }))
  }

  async listAuditEvents(context: OrganisationContext) {
    return db.organisationAuditEvent.findMany({
      where: { organisationId: context.organisationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        assessmentCaseId: true,
        actorType: true,
        actorId: true,
        action: true,
        targetType: true,
        targetId: true,
        beforeStateReference: true,
        afterStateReference: true,
        metadata: true,
        createdAt: true,
      },
    })
  }

  private policyVersionInclude() {
    return {
      createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      approvedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      rules: { orderBy: [{ priority: 'asc' }, { id: 'asc' }] },
    } satisfies Prisma.PolicyVersionInclude
  }

  private mapPolicy(policy: {
    id: string
    name: string
    assessmentType: CompanyAssessmentType
    status: string
    createdAt: Date
    updatedAt: Date
    createdBy: { id: string; email: string; profile?: { fullName: string | null } | null } | null
    versions: Array<{
      id: string
      versionNumber: number
      status: string
      effectiveFrom: Date | null
      effectiveTo: Date | null
      sourceDocumentReference: string | null
      changeSummary: string | null
      testResults: unknown
      createdAt: Date
      approvedAt: Date | null
      createdBy: { id: string; email: string; profile?: { fullName: string | null } | null } | null
      approvedBy: { id: string; email: string; profile?: { fullName: string | null } | null } | null
      rules: Array<{
        id: string
        name: string
        description: string | null
        inputField: string
        operator: string
        threshold: unknown
        thresholdType: string | null
        evidencePeriodMonths: number | null
        missingDataBehaviour: string
        confidenceRequirement: string | null
        passOutcome: string
        failOutcome: string
        alternativePathway: string | null
        humanReviewRequired: boolean
        priority: number
        effectiveFrom: Date | null
        effectiveTo: Date | null
      }>
    }>
    _count: { versions: number }
  }) {
    const versions = policy.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      status: version.status,
      effectiveFrom: version.effectiveFrom,
      effectiveTo: version.effectiveTo,
      sourceDocumentReference: version.sourceDocumentReference,
      changeSummary: version.changeSummary,
      testResults: version.testResults,
      createdAt: version.createdAt,
      approvedAt: version.approvedAt,
      createdBy: version.createdBy ? this.mapPerson(version.createdBy) : null,
      approvedBy: version.approvedBy ? this.mapPerson(version.approvedBy) : null,
      rules: version.rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        inputField: rule.inputField,
        operator: rule.operator,
        threshold: rule.threshold,
        thresholdType: rule.thresholdType,
        evidencePeriodMonths: rule.evidencePeriodMonths,
        missingDataBehaviour: rule.missingDataBehaviour,
        confidenceRequirement: rule.confidenceRequirement,
        passOutcome: rule.passOutcome,
        failOutcome: rule.failOutcome,
        alternativePathway: rule.alternativePathway,
        humanReviewRequired: rule.humanReviewRequired,
        priority: rule.priority,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
      })),
    }))

    return {
      id: policy.id,
      name: policy.name,
      assessmentType: policy.assessmentType,
      status: policy.status,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      createdBy: policy.createdBy ? this.mapPerson(policy.createdBy) : null,
      latestVersion: versions[0] ?? null,
      versions,
      versionCount: policy._count.versions,
      inputFields: POLICY_INPUT_FIELDS,
    }
  }

  private async findPolicyVersion(
    context: OrganisationContext,
    policyId: string,
    versionId: string
  ) {
    const version = await db.policyVersion.findFirst({
      where: {
        id: versionId,
        policyId,
        organisationId: context.organisationId,
      },
      include: {
        policy: { select: { id: true, name: true, assessmentType: true, status: true } },
        rules: { orderBy: [{ priority: 'asc' }, { id: 'asc' }] },
      },
    })

    if (!version) throw new NotFoundException('Policy version not found')
    return version
  }

  private normalisePolicyRules(
    inputRules: PolicyRuleInputDto[] | undefined,
    assessmentType: CompanyAssessmentType | CreatePolicyDto['assessmentType'],
    aiPrompt?: string
  ): NormalisedPolicyRule[] {
    const sourceRules =
      inputRules && inputRules.length > 0
        ? inputRules
        : this.starterPolicyRulesFor(assessmentType, aiPrompt)

    return sourceRules.slice(0, 20).map((rule, index) => {
      const name = this.cleanString(rule.name)
      if (!name) throw new BadRequestException('Policy rule name is required')
      if (
        !POLICY_FIELD_VALUES.has(rule.inputField as (typeof POLICY_INPUT_FIELDS)[number]['value'])
      ) {
        throw new BadRequestException(`Unsupported policy input field: ${rule.inputField}`)
      }

      const operator = rule.operator
      const threshold = this.normalisePolicyThreshold(rule.threshold)
      if (!['exists', 'not_empty'].includes(operator) && threshold === undefined) {
        throw new BadRequestException(`Rule "${name}" needs a threshold`)
      }

      const field = POLICY_INPUT_FIELDS.find((item) => item.value === rule.inputField)
      return {
        name,
        description: this.cleanString(rule.description),
        inputField: rule.inputField,
        operator,
        threshold,
        thresholdType: rule.thresholdType ?? field?.thresholdType,
        evidencePeriodMonths: rule.evidencePeriodMonths,
        missingDataBehaviour: rule.missingDataBehaviour ?? 'review',
        confidenceRequirement: rule.confidenceRequirement,
        passOutcome: this.cleanString(rule.passOutcome) ?? 'Criteria met',
        failOutcome: this.cleanString(rule.failOutcome) ?? 'Criteria not met',
        alternativePathway: this.cleanString(rule.alternativePathway),
        humanReviewRequired: Boolean(rule.humanReviewRequired),
        priority: rule.priority ?? index + 1,
      }
    })
  }

  private starterPolicyRulesFor(
    assessmentType: CompanyAssessmentType | CreatePolicyDto['assessmentType'],
    aiPrompt?: string
  ): PolicyRuleInputDto[] {
    const commonVerification: PolicyRuleInputDto = {
      name: 'Bank evidence available',
      description: 'At least one active bank connection supports the assessment snapshot.',
      inputField: 'verificationSummary.activeBankConnections',
      operator: 'gte',
      threshold: 1,
      thresholdType: 'number',
      missingDataBehaviour: 'review',
      passOutcome: 'Connected financial evidence is available',
      failOutcome: 'No connected financial evidence',
      priority: 30,
    }

    if (assessmentType === 'rental') {
      return [
        {
          name: 'Trust score meets rental floor',
          description: 'Starter rental readiness floor for automated pass consideration.',
          inputField: 'trustScoreSummary.score',
          operator: 'gte',
          threshold: 70,
          thresholdType: 'number',
          missingDataBehaviour: 'review',
          passOutcome: 'Trust score supports rental readiness',
          failOutcome: 'Trust score needs review',
          priority: 10,
        },
        {
          name: 'Affordability signal is acceptable',
          description: 'Uses the current affordability score in the assessment snapshot.',
          inputField: 'affordabilitySummary.latestAffordabilityScore',
          operator: 'gte',
          threshold: 60,
          thresholdType: 'number',
          missingDataBehaviour: 'review',
          passOutcome: 'Affordability signal is acceptable',
          failOutcome: 'Affordability requires review',
          humanReviewRequired: true,
          priority: 20,
        },
        commonVerification,
      ]
    }

    if (assessmentType === 'lending') {
      return [
        {
          name: 'Trust score meets credit review floor',
          description:
            'Starter lending floor; final affordability and credit policy remains with the partner.',
          inputField: 'trustScoreSummary.score',
          operator: 'gte',
          threshold: 75,
          thresholdType: 'number',
          missingDataBehaviour: 'review',
          passOutcome: 'Trust score supports credit review',
          failOutcome: 'Trust score needs credit review',
          humanReviewRequired: true,
          priority: 10,
        },
        {
          name: 'Income stability supports application',
          inputField: 'incomeSummary.latestIncomeStabilityScore',
          operator: 'gte',
          threshold: 60,
          thresholdType: 'number',
          missingDataBehaviour: 'review',
          passOutcome: 'Income stability supports application',
          failOutcome: 'Income stability needs review',
          priority: 20,
        },
        commonVerification,
      ]
    }

    return [
      {
        name: 'Trust score meets review floor',
        description: aiPrompt
          ? 'Starter rule created from the requested policy workflow guidance.'
          : 'Starter rule for partner review.',
        inputField: 'trustScoreSummary.score',
        operator: 'gte',
        threshold: 65,
        thresholdType: 'number',
        missingDataBehaviour: 'review',
        passOutcome: 'Trust score supports the assessment',
        failOutcome: 'Trust score needs review',
        priority: 10,
      },
      commonVerification,
    ]
  }

  private toPolicyRuleCreates(
    rules: NormalisedPolicyRule[]
  ): Prisma.PolicyRuleCreateWithoutPolicyVersionInput[] {
    return rules.map((rule) => ({
      name: rule.name,
      description: rule.description,
      inputField: rule.inputField,
      operator: rule.operator,
      threshold: rule.threshold === undefined ? undefined : this.asJson(rule.threshold),
      thresholdType: rule.thresholdType,
      evidencePeriodMonths: rule.evidencePeriodMonths,
      missingDataBehaviour: rule.missingDataBehaviour,
      confidenceRequirement: rule.confidenceRequirement,
      passOutcome: rule.passOutcome,
      failOutcome: rule.failOutcome,
      alternativePathway: rule.alternativePathway,
      humanReviewRequired: rule.humanReviewRequired,
      priority: rule.priority,
    }))
  }

  private buildPolicyWorkflowMetadata({
    assessmentType,
    aiPrompt,
    rules,
    action,
  }: {
    assessmentType: CompanyAssessmentType | CreatePolicyDto['assessmentType']
    aiPrompt?: string
    rules: NormalisedPolicyRule[]
    action: string
  }) {
    return {
      action,
      generatedBy: aiPrompt ? 'policy_builder_ai_workflow_stub' : 'policy_builder_starter_rules',
      generatedAt: new Date().toISOString(),
      assessmentType,
      prompt: this.cleanString(aiPrompt),
      ruleCount: rules.length,
      allowedFields: POLICY_INPUT_FIELDS.map((field) => field.value),
      nextStep: 'Human review, preview against cases, then approval.',
    }
  }

  private normalisePolicyThreshold(value: unknown): unknown {
    const raw =
      typeof value === 'object' && value !== null && 'value' in value
        ? (value as { value?: unknown }).value
        : value

    if (raw === undefined || raw === null) return undefined
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed) return undefined
      if (trimmed === 'true') return true
      if (trimmed === 'false') return false
      const numeric = Number(trimmed.replace(/,/g, ''))
      return Number.isFinite(numeric) ? numeric : trimmed
    }
    return raw
  }

  private evaluatePolicyAgainstCase(
    rules: Array<{
      id: string
      name: string
      inputField: string
      operator: string
      threshold: unknown
      missingDataBehaviour: string
      humanReviewRequired: boolean
    }>,
    assessmentCase: {
      id: string
      reference: string | null
      status: string
      assessmentOutcome: string | null
      assessmentConfidence: string | null
      applicant: { id: string; email: string; profile?: { fullName: string | null } | null }
      assessmentSnapshot: {
        id: string
        trustScoreSummary: unknown
        incomeSummary: unknown
        affordabilitySummary: unknown
        commitmentsSummary: unknown
        verificationSummary: unknown
        createdAt: Date
      }
    }
  ) {
    const snapshot = {
      trustScoreSummary: assessmentCase.assessmentSnapshot.trustScoreSummary,
      incomeSummary: assessmentCase.assessmentSnapshot.incomeSummary,
      affordabilitySummary: assessmentCase.assessmentSnapshot.affordabilitySummary,
      commitmentsSummary: assessmentCase.assessmentSnapshot.commitmentsSummary,
      verificationSummary: assessmentCase.assessmentSnapshot.verificationSummary,
    }
    const ruleResults = rules.map((rule) => this.evaluatePolicyRule(rule, snapshot))
    const outcome = this.policyOutcomeFor(ruleResults)

    return {
      caseId: assessmentCase.id,
      applicant: this.mapPerson(assessmentCase.applicant),
      reference: assessmentCase.reference,
      currentStatus: assessmentCase.status,
      currentOutcome: assessmentCase.assessmentOutcome,
      currentConfidence: assessmentCase.assessmentConfidence,
      snapshotId: assessmentCase.assessmentSnapshot.id,
      snapshotCreatedAt: assessmentCase.assessmentSnapshot.createdAt,
      outcome,
      ruleResults,
    }
  }

  private evaluatePolicyRule(
    rule: {
      id: string
      name: string
      inputField: string
      operator: string
      threshold: unknown
      missingDataBehaviour: string
      humanReviewRequired: boolean
    },
    snapshot: Record<string, unknown>
  ) {
    const observedValue = this.readSnapshotField(snapshot, rule.inputField)
    const missing = this.isMissingValue(observedValue)
    let result: PolicyEvaluationStatus = 'review'

    if (missing) {
      if (rule.missingDataBehaviour === 'ignore') result = 'not_applicable'
      else if (rule.missingDataBehaviour === 'fail') result = 'fail'
      else result = 'missing'
    } else if (rule.operator === 'exists' || rule.operator === 'not_empty') {
      result = rule.humanReviewRequired ? 'review' : 'pass'
    } else {
      const passed = this.comparePolicyValues(observedValue, rule.operator, rule.threshold)
      result = passed ? (rule.humanReviewRequired ? 'review' : 'pass') : 'fail'
    }

    return {
      ruleId: rule.id,
      name: rule.name,
      inputField: rule.inputField,
      operator: rule.operator,
      observedValue,
      thresholdValue: rule.threshold,
      missingDataBehaviour: rule.missingDataBehaviour,
      result,
    }
  }

  private policyOutcomeFor(
    results: Array<{ result: PolicyEvaluationStatus }>
  ): 'pass' | 'fail' | 'review' {
    if (results.length === 0) return 'review'
    if (results.some((result) => result.result === 'fail')) return 'fail'
    if (results.some((result) => ['review', 'missing'].includes(result.result))) return 'review'
    return 'pass'
  }

  private readSnapshotField(snapshot: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current === null || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[key]
    }, snapshot)
  }

  private isMissingValue(value: unknown): boolean {
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim().length === 0)
    )
  }

  private comparePolicyValues(observed: unknown, operator: string, threshold: unknown): boolean {
    if (operator === 'eq') return String(observed).toLowerCase() === String(threshold).toLowerCase()
    if (operator === 'neq')
      return String(observed).toLowerCase() !== String(threshold).toLowerCase()

    const observedNumber = Number(observed)
    const thresholdNumber = Number(threshold)
    if (!Number.isFinite(observedNumber) || !Number.isFinite(thresholdNumber)) return false

    if (operator === 'gte') return observedNumber >= thresholdNumber
    if (operator === 'lte') return observedNumber <= thresholdNumber
    if (operator === 'gt') return observedNumber > thresholdNumber
    if (operator === 'lt') return observedNumber < thresholdNumber
    return false
  }

  private jsonObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }

  private requestInclude() {
    return {
      applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      policyVersion: {
        select: { id: true, versionNumber: true, policy: { select: { name: true } } },
      },
      _count: { select: { cases: true, consents: true } },
    } satisfies Prisma.AssessmentRequestInclude
  }

  private mapRequest(
    request: Prisma.AssessmentRequestGetPayload<{
      include: ReturnType<AssessmentsService['requestInclude']>
    }>
  ) {
    return {
      id: request.id,
      applicant: request.applicant
        ? {
            id: request.applicant.id,
            name: request.applicant.profile?.fullName ?? request.applicant.email,
            email: request.applicant.email,
          }
        : {
            id: null,
            name: request.applicantName ?? request.applicantEmail,
            email: request.applicantEmail,
          },
      assessmentType: request.assessmentType,
      status: request.status,
      proposedCommitment: request.proposedCommitment,
      reference: request.reference,
      requestToken: request.requestToken,
      requestUrl: request.requestToken ? `/requests/${request.requestToken}` : null,
      deadline: request.deadline,
      createdAt: request.createdAt,
      sentAt: request.sentAt,
      completedAt: request.completedAt,
      cancelledAt: request.cancelledAt,
      createdBy: {
        id: request.createdBy.id,
        name: request.createdBy.profile?.fullName ?? request.createdBy.email,
        email: request.createdBy.email,
      },
      policy: request.policyVersion
        ? {
            id: request.policyVersion.id,
            name: request.policyVersion.policy.name,
            versionNumber: request.policyVersion.versionNumber,
          }
        : null,
      counts: request._count,
    }
  }

  private mapPerson(user: {
    id: string
    email: string
    profile?: { fullName: string | null } | null
  }) {
    return {
      id: user.id,
      name: user.profile?.fullName ?? user.email,
      email: user.email,
    }
  }

  private buildSnapshotPayload({
    request,
    applicant,
    latestScore,
    activeBankConnections,
    verifiedDocuments,
    recentFeatures,
  }: {
    request: {
      id: string
      assessmentType: CompanyAssessmentType
      proposedCommitment: number | null
      reference: string | null
    }
    applicant: Prisma.UserGetPayload<{
      include: {
        profile: true
        employment: true
        rentalProfiles: true
        _count: {
          select: {
            bankConnections: true
            documents: true
            trustScores: true
            insightQuestionAnswers: true
          }
        }
      }
    }>
    latestScore: Prisma.TrustScoreGetPayload<object> | null
    activeBankConnections: number
    verifiedDocuments: number
    recentFeatures: Array<{
      featureKey: string
      featureValueNum: number | null
      featureValueText: string | null
      featureValueBool: boolean | null
      computedAt: Date
    }>
  }) {
    const currentEmployment = applicant.employment[0] ?? null
    const currentRental = applicant.rentalProfiles[0] ?? null
    const declaredIncome =
      applicant.profile?.monthlyIncomeDeclared ?? currentEmployment?.monthlyIncomeDeclared ?? null
    const declaredRent =
      applicant.profile?.monthlyRentDeclared ?? currentRental?.monthlyRentDeclared ?? null

    return {
      trustScoreSummary: {
        score: latestScore?.overallScore ?? null,
        tier: latestScore?.overallTier ?? null,
        fraudRisk: latestScore?.fraudRisk ?? null,
        computedAt: latestScore?.computedAt.toISOString() ?? null,
        financialDataAsOf: latestScore?.financialDataAsOf?.toISOString() ?? null,
        validUntil: latestScore?.validUntil?.toISOString() ?? null,
        reasonCodes: latestScore?.reasonCodes ?? [],
      },
      insightSummary: {
        profileStage: applicant.profile?.profileStage ?? null,
        insightAnswers: applicant._count.insightQuestionAnswers,
        requestedAssessmentType: request.assessmentType,
        requestReference: request.reference,
        recentFeatures: recentFeatures.map((feature) => ({
          key: feature.featureKey,
          value:
            feature.featureValueNum ?? feature.featureValueText ?? feature.featureValueBool ?? null,
          computedAt: feature.computedAt.toISOString(),
        })),
      },
      incomeSummary: {
        declaredMonthlyIncome: declaredIncome,
        employmentType:
          applicant.profile?.employmentType ?? currentEmployment?.employmentType ?? null,
        currentEmployerProvided: Boolean(currentEmployment?.employerName),
        latestIncomeStabilityScore: latestScore?.incomeStabilityScore ?? null,
      },
      affordabilitySummary: {
        proposedCommitment: request.proposedCommitment,
        declaredMonthlyRent: declaredRent,
        latestAffordabilityScore: latestScore?.affordabilityScore ?? null,
        latestFinancialStabilityScore: latestScore?.financialStabilityScore ?? null,
      },
      commitmentsSummary: {
        source: 'mvp_non_raw_summary',
        latestRentalReliabilityScore: latestScore?.rentalReliabilityScore ?? null,
        activeBankConnections,
      },
      verificationSummary: {
        activeBankConnections,
        verifiedDocuments,
        totalDocuments: applicant._count.documents,
        totalTrustScores: applicant._count.trustScores,
        verificationStrengthScore: latestScore?.verificationStrengthScore ?? null,
        identityConfidenceScore: latestScore?.identityConfidenceScore ?? null,
      },
      evidenceManifest: latestScore?.evidenceManifest ?? {
        activeBankConnections,
        verifiedDocuments,
        source: 'mvp_counts_only',
      },
      evidenceReferences: {
        trustScoreId: latestScore?.id ?? null,
        assessmentRequestId: request.id,
        source: 'company_request_completion',
      },
    }
  }

  private assessmentOutcomeFor(score: number | null | undefined) {
    if (score === undefined || score === null) return 'information_required'
    if (score >= 80) return 'meets_criteria'
    if (score >= 60) return 'review_required'
    return 'information_required'
  }

  private assessmentConfidenceFor(
    score: number | null | undefined,
    activeBankConnections: number,
    verifiedDocuments: number
  ) {
    if (score === undefined || score === null) return 'low'
    if (activeBankConnections > 0 && verifiedDocuments > 0 && score >= 75) return 'high'
    if (activeBankConnections > 0 || verifiedDocuments > 0) return 'medium'
    return 'low'
  }

  private async assertRequestApplicant(requestedApplicantEmail: string, applicantUserId: string) {
    const applicant = await db.user.findUnique({
      where: { id: applicantUserId },
      select: {
        id: true,
        email: true,
        profile: { select: { profileStage: true } },
      },
    })
    if (!applicant) throw new NotFoundException('Applicant not found')

    const requestedEmail = this.normaliseEmail(requestedApplicantEmail)
    const signedInEmail = this.normaliseEmail(applicant.email)
    if (requestedEmail !== signedInEmail) {
      throw new ForbiddenException(
        `This request was sent to ${requestedEmail}. Please sign in with that email.`
      )
    }

    return applicant
  }

  private assertRequestNotClosed(request: { cancelledAt: Date | null; status: string }) {
    if (request.cancelledAt || request.status === 'cancelled') {
      throw new ForbiddenException('This assessment request has been cancelled')
    }
    if (request.status === 'declined') {
      throw new ForbiddenException('This assessment request was declined')
    }
    if (request.status === 'expired') {
      throw new ForbiddenException('This assessment request has expired')
    }
  }

  private async expireRequestIfPastDeadline(
    request: {
      id: string
      organisationId: string
      deadline: Date | null
      status: string
    },
    ipAddress?: string
  ) {
    if (!request.deadline || request.deadline >= new Date()) return
    if (!this.isPendingRequestStatus(request.status)) return

    await db.$transaction(async (tx) => {
      await tx.assessmentRequest.update({
        where: { id: request.id },
        data: { status: 'expired' },
      })
      await tx.organisationAuditEvent.create({
        data: {
          organisationId: request.organisationId,
          actorType: 'system',
          action: 'assessment_request_expired',
          targetType: 'assessment_request',
          targetId: request.id,
          ipAddress,
        },
      })
    })
    throw new ForbiddenException('This assessment request has expired')
  }

  private isApplicantProfileStarted(stage: string | null | undefined): boolean {
    return Boolean(stage && !['created', 'onboarding'].includes(stage))
  }

  private normaliseEmail(value: string): string {
    return value.trim().toLowerCase()
  }

  private cleanString(value: string | undefined): string | undefined {
    const cleaned = value?.trim()
    return cleaned ? cleaned : undefined
  }

  private parseFutureDate(value: string | undefined): Date | undefined {
    if (!value) return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid deadline')
    if (parsed <= new Date()) throw new BadRequestException('Deadline must be in the future')
    return parsed
  }

  private parseRequestedFields(value: string | undefined): string[] {
    return (value ?? '')
      .split(/[\n,]/)
      .map((field) => field.trim())
      .filter(Boolean)
      .slice(0, 20)
  }

  private assertInformationRequestTransition(
    currentStatus: InformationRequestStatus,
    nextStatus: 'open' | 'resolved' | 'cancelled'
  ) {
    if (currentStatus === nextStatus) return
    if (currentStatus === 'cancelled') {
      throw new BadRequestException('Cancelled information requests cannot be changed')
    }
    if (nextStatus === 'resolved' && currentStatus !== 'applicant_responded') {
      throw new BadRequestException('Only applicant responses can be resolved')
    }
    if (
      nextStatus === 'open' &&
      currentStatus !== 'applicant_responded' &&
      currentStatus !== 'resolved'
    ) {
      throw new BadRequestException('Only responded or resolved requests can be reopened')
    }
    if (nextStatus === 'cancelled' && currentStatus === 'resolved') {
      throw new BadRequestException('Resolved information requests cannot be cancelled')
    }
  }

  private async caseStatusAfterInformationRequestUpdate(
    tx: Prisma.TransactionClient,
    assessmentCaseId: string
  ) {
    const [openCount, respondedCount] = await Promise.all([
      tx.informationRequest.count({
        where: { assessmentCaseId, status: 'open' },
      }),
      tx.informationRequest.count({
        where: { assessmentCaseId, status: 'applicant_responded' },
      }),
    ])

    if (openCount > 0) return 'information_requested'
    if (respondedCount > 0) return 'applicant_responded'
    return 'under_review'
  }

  private caseStatusForDecision(decision: CompanyDecision) {
    if (decision === 'additional_information_required') return 'information_requested'
    if (decision === 'referred_for_manual_review') return 'under_review'
    return 'company_decision_recorded'
  }

  private decisionClosesCase(decision: CompanyDecision): boolean {
    return !['additional_information_required', 'referred_for_manual_review'].includes(decision)
  }

  private isDecisionOverride(
    decision: CompanyDecision,
    outcome:
      | 'meets_criteria'
      | 'review_required'
      | 'information_required'
      | 'alternative_route_recommended'
      | 'unable_to_assess'
      | null
  ): boolean {
    if (!outcome) return false
    if (decision === 'approved' || decision === 'approved_with_conditions') {
      return outcome !== 'meets_criteria'
    }
    if (decision === 'declined') return outcome === 'meets_criteria'
    if (decision === 'additional_information_required') return outcome !== 'information_required'
    if (decision === 'referred_for_manual_review') return outcome === 'meets_criteria'
    return false
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue
  }

  private isPendingRequestStatus(status: string): boolean {
    return (PENDING_REQUEST_STATUSES as readonly string[]).includes(status)
  }

  private hashPayload(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex')
  }
}
