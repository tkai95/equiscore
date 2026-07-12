import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import { db } from '@equiscore/database'
import type { CompanyAssessmentType, Prisma } from '@equiscore/database'
import type { OrganisationContext } from '../organisations/organisation-context'
import type { CreateAssessmentRequestDto } from './assessment-requests.dto'

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
          select: { id: true, snapshotVersion: true, dataPeriodEnd: true, createdAt: true },
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
        createdAt: item.assessmentSnapshot.createdAt,
      },
      counts: item._count,
    }))
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
    }
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
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            status: true,
            effectiveFrom: true,
            approvedAt: true,
          },
        },
        _count: { select: { versions: true } },
      },
    })

    return policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      assessmentType: policy.assessmentType,
      status: policy.status,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      createdBy: policy.createdBy
        ? {
            id: policy.createdBy.id,
            name: policy.createdBy.profile?.fullName ?? policy.createdBy.email,
            email: policy.createdBy.email,
          }
        : null,
      latestVersion: policy.versions[0] ?? null,
      versionCount: policy._count.versions,
    }))
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
