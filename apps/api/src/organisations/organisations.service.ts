import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { permissionsForRole, type OrganisationRole } from './permissions'
import type { OrganisationContext } from './organisation-context'

interface CreateOrganisationInput {
  name: string
  slug?: string
}

@Injectable()
export class OrganisationsService {
  async createForOwner(userId: string, input: CreateOrganisationInput) {
    const slug = this.normaliseSlug(input.slug ?? input.name)
    const existing = await db.organisation.findUnique({ where: { slug } })
    if (existing) throw new ConflictException('That organisation slug is already in use')

    return db.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: input.name.trim(),
          slug,
          monthlyAssessmentAllowance: 0,
        },
      })
      await tx.organisationMember.create({
        data: {
          organisationId: organisation.id,
          userId,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        },
      })
      return organisation
    })
  }

  async listForUser(userId: string) {
    const memberships = await db.organisationMember.findMany({
      where: { userId, status: 'active', organisation: { status: 'active' } },
      orderBy: { joinedAt: 'desc' },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            planName: true,
            monthlyAssessmentAllowance: true,
            overageUnitPrice: true,
            currency: true,
          },
        },
      },
    })

    return memberships.map((membership) => ({
      id: membership.organisation.id,
      name: membership.organisation.name,
      slug: membership.organisation.slug,
      status: membership.organisation.status,
      planName: membership.organisation.planName,
      monthlyAssessmentAllowance: membership.organisation.monthlyAssessmentAllowance,
      overageUnitPrice: membership.organisation.overageUnitPrice,
      currency: membership.organisation.currency,
      member: {
        id: membership.id,
        role: membership.role,
        permissions: permissionsForRole(membership.role as OrganisationRole),
      },
    }))
  }

  async resolveContext(userId: string, organisationSlugOrId: string): Promise<OrganisationContext> {
    const membership = await db.organisationMember.findFirst({
      where: {
        userId,
        status: 'active',
        organisation: {
          status: 'active',
          OR: [{ id: organisationSlugOrId }, { slug: organisationSlugOrId }],
        },
      },
      include: { organisation: true },
    })

    if (!membership) throw new NotFoundException('Organisation not found')

    const role = membership.role as OrganisationRole
    return {
      organisationId: membership.organisation.id,
      organisationSlug: membership.organisation.slug,
      organisationName: membership.organisation.name,
      memberId: membership.id,
      role,
      permissions: permissionsForRole(role),
    }
  }

  async getOverview(context: OrganisationContext) {
    const [openCases, awaitingReview, pendingRequests, usageCount] = await Promise.all([
      db.assessmentCase.count({
        where: {
          organisationId: context.organisationId,
          status: { notIn: ['archived', 'cancelled', 'expired'] },
        },
      }),
      db.assessmentCase.count({
        where: { organisationId: context.organisationId, status: 'assessment_ready' },
      }),
      db.assessmentRequest.count({
        where: {
          organisationId: context.organisationId,
          status: {
            in: [
              'draft',
              'invitation_scheduled',
              'invitation_sent',
              'applicant_opened',
              'applicant_started',
              'information_incomplete',
              'awaiting_consent',
              'ready_for_assessment',
            ],
          },
        },
      }),
      db.usageEvent.aggregate({
        where: {
          organisationId: context.organisationId,
          eventType: {
            in: ['assessment_delivered', 'shared_profile_accepted', 'assessment_refreshed', 'assessment_api_delivered'],
          },
        },
        _sum: { quantity: true },
      }),
    ])

    const organisation = await db.organisation.findUnique({
      where: { id: context.organisationId },
      select: {
        id: true,
        name: true,
        slug: true,
        planName: true,
        monthlyAssessmentAllowance: true,
        overageUnitPrice: true,
        currency: true,
      },
    })

    if (!organisation) throw new NotFoundException('Organisation not found')

    const usedCredits = usageCount._sum.quantity ?? 0
    return {
      organisation,
      member: {
        id: context.memberId,
        role: context.role,
        permissions: context.permissions,
      },
      metrics: {
        openCases,
        awaitingReview,
        pendingRequests,
        usedCredits,
        remainingCredits: Math.max(organisation.monthlyAssessmentAllowance - usedCredits, 0),
      },
    }
  }

  private normaliseSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)
  }
}
