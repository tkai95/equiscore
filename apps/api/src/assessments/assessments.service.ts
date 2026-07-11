import { Injectable } from '@nestjs/common'
import { db } from '@equiscore/database'
import type { OrganisationContext } from '../organisations/organisation-context'

@Injectable()
export class AssessmentsService {
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
      include: {
        applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        policyVersion: {
          select: { id: true, versionNumber: true, policy: { select: { name: true } } },
        },
        _count: { select: { cases: true, consents: true } },
      },
    })

    return requests.map((request) => ({
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
    }))
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
          select: { id: true, versionNumber: true, status: true, effectiveFrom: true, approvedAt: true },
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
}
