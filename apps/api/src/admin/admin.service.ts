import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { db } from '@equiscore/database'
import type { Prisma } from '@equiscore/database'
import { randomBytes } from 'crypto'
import type { OrganisationRole } from '../organisations/permissions'
import {
  permissionsForInternalAdminRole,
  type InternalAdminContext,
  type InternalAdminPermission,
  type InternalAdminRole,
} from './admin-context'

interface CreateOrganisationInput {
  name: string
  slug?: string
  planName?: string
  monthlyAssessmentAllowance?: number
  overageUnitPrice?: number | null
  currency?: string
  ownerEmail?: string
  ownerRole?: string
}

interface InviteMemberInput {
  email: string
  role?: string
}

interface InviteInternalAdminInput {
  email: string
  role?: string
}

const ORGANISATION_ROLES: OrganisationRole[] = [
  'owner',
  'admin',
  'policy_admin',
  'reviewer',
  'manager',
  'billing_admin',
  'auditor',
]

const INTERNAL_ADMIN_ROLES: InternalAdminRole[] = [
  'owner',
  'admin',
  'support',
  'billing',
  'compliance',
  'readonly',
]

@Injectable()
export class AdminService {
  async resolveAdminContext(userId: string, email: string): Promise<InternalAdminContext> {
    const normalisedEmail = this.normaliseEmail(email)
    const bootstrap = this.bootstrapAdminEmails().has(normalisedEmail)

    if (bootstrap) {
      const activeAccess = await db.internalAdminAccess.upsert({
        where: { userId },
        update: { role: 'owner', status: 'active', revokedAt: null },
        create: { userId, role: 'owner', status: 'active' },
      })

      return {
        userId,
        email: normalisedEmail,
        role: activeAccess.role as InternalAdminRole,
        permissions: permissionsForInternalAdminRole(activeAccess.role as InternalAdminRole),
        source: 'bootstrap_env',
      }
    }

    const invitedAccess = await this.claimPendingInternalAdminInvitation(userId, normalisedEmail)
    if (invitedAccess?.status === 'active') {
      const role = invitedAccess.role as InternalAdminRole
      return {
        userId,
        email: normalisedEmail,
        role,
        permissions: permissionsForInternalAdminRole(role),
        source: 'database',
      }
    }

    const access = await db.internalAdminAccess.findUnique({ where: { userId } })
    if (access?.status === 'active') {
      const role = access.role as InternalAdminRole
      return {
        userId,
        email: normalisedEmail,
        role,
        permissions: permissionsForInternalAdminRole(role),
        source: 'database',
      }
    }

    throw new ForbiddenException('EquiScore internal admin access is required')
  }

  async listConsumers(query?: string) {
    const start = this.startOfMonth()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const q = query?.trim()
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { profile: { fullName: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}

    const [
      totalConsumers,
      signupsThisMonth,
      scoredConsumers,
      bankConnectedConsumers,
      activeAuditUsers,
      users,
    ] = await Promise.all([
      db.user.count({ where }),
      db.user.count({ where: { ...where, createdAt: { gte: start } } }),
      db.user.count({ where: { ...where, trustScores: { some: {} } } }),
      db.user.count({
        where: { ...where, bankConnections: { some: { connectionStatus: 'active' } } },
      }),
      db.auditEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, user: where },
        distinct: ['userId'],
        select: { userId: true },
      }),
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          profile: true,
          trustScores: {
            orderBy: { computedAt: 'desc' },
            take: 1,
            select: { overallScore: true, overallTier: true, computedAt: true, validUntil: true },
          },
          auditEvents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { eventType: true, createdAt: true },
          },
          internalAdminAccesses: {
            select: { role: true, status: true },
          },
          organisationMemberships: {
            select: {
              role: true,
              status: true,
              organisation: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: {
            select: {
              bankConnections: true,
              documents: true,
              trustScores: true,
              sharedProfiles: true,
              applicantAssessmentCases: true,
              auditEvents: true,
            },
          },
        },
      }),
    ])

    return {
      metrics: {
        totalConsumers,
        signupsThisMonth,
        activeConsumers30d: activeAuditUsers.length,
        scoredConsumers,
        bankConnectedConsumers,
      },
      users: users.map((user) => {
        const latestScore = user.trustScores[0] ?? null
        const latestAudit = user.auditEvents[0] ?? null
        const internalAdminAccess = user.internalAdminAccesses.find(
          (access) => access.status === 'active'
        )
        const activeMemberships = user.organisationMemberships.filter(
          (membership) => membership.status === 'active'
        )

        return {
          id: user.id,
          email: user.email,
          status: user.status,
          compassEnabled: user.compassEnabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: user.profile
            ? {
                fullName: user.profile.fullName,
                profileStage: user.profile.profileStage,
                employmentType: user.profile.employmentType,
              }
            : null,
          latestScore,
          latestActivity: latestAudit,
          internalAdmin: internalAdminAccess
            ? { role: internalAdminAccess.role, status: internalAdminAccess.status }
            : null,
          partnerMemberships: activeMemberships.map((membership) => ({
            role: membership.role,
            status: membership.status,
            organisation: membership.organisation,
          })),
          counts: user._count,
        }
      }),
    }
  }

  async listInternalAdmins() {
    const [accesses, invitations] = await Promise.all([
      db.internalAdminAccess.findMany({
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          grantedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
      }),
      db.internalAdminInvitation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          invitedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          acceptedBy: {
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          },
        },
      }),
    ])

    return {
      admins: accesses.map((access) => ({
        id: access.id,
        user: this.mapMemberPerson(access.user),
        role: access.role,
        status: access.status,
        source: this.bootstrapAdminEmails().has(this.normaliseEmail(access.user.email))
          ? 'bootstrap_env'
          : 'database',
        grantedBy: access.grantedBy ? this.mapMemberPerson(access.grantedBy) : null,
        grantedAt: access.grantedAt,
        revokedAt: access.revokedAt,
        createdAt: access.createdAt,
        updatedAt: access.updatedAt,
      })),
      invitations: invitations.map((invitation) => this.mapInternalAdminInvitation(invitation)),
    }
  }

  async inviteInternalAdmin(admin: InternalAdminContext, input: InviteInternalAdminInput) {
    this.requirePermission(admin, 'admin:manage_access')

    const email = this.normaliseEmail(input.email)
    if (!email) throw new ConflictException('Invite email is required')

    const role = this.parseInternalAdminRole(input.role ?? 'readonly')
    if (role === 'owner' && admin.role !== 'owner') {
      throw new ForbiddenException('Only an owner can invite another owner')
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      include: { internalAdminAccesses: true },
    })
    const activeAccess = existingUser?.internalAdminAccesses.find(
      (access) => access.status === 'active'
    )
    if (activeAccess) throw new ConflictException('That user is already an active internal admin')

    const now = new Date()
    const token = this.makeToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await db.internalAdminInvitation.updateMany({
      where: { email, status: 'pending', expiresAt: { lte: now } },
      data: { status: 'expired' },
    })

    const invitation = await db.$transaction(async (tx) => {
      const existingPending = await tx.internalAdminInvitation.findFirst({
        where: { email, status: 'pending' },
      })

      const saved = existingPending
        ? await tx.internalAdminInvitation.update({
            where: { id: existingPending.id },
            data: {
              role,
              token,
              invitedById: admin.userId,
              expiresAt,
              metadata: { source: 'internal_admin_reinvite' },
            },
          })
        : await tx.internalAdminInvitation.create({
            data: {
              email,
              role,
              token,
              invitedById: admin.userId,
              expiresAt,
              metadata: { source: 'internal_admin_invite' },
            },
          })

      await tx.internalAdminAuditEvent.create({
        data: {
          actorUserId: admin.userId,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: existingPending
            ? 'internal_admin_invitation_resent'
            : 'internal_admin_invitation_created',
          targetType: 'internal_admin_invitation',
          targetId: saved.id,
          metadata: { email, role },
        },
      })

      return saved
    })

    return this.mapInternalAdminInvitation(invitation)
  }

  async getOverview() {
    const start = this.startOfMonth()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalOrganisations,
      activeOrganisations,
      deliveredAssessments,
      usageThisMonth,
      activePartnerMembers30d,
      totalConsumers,
      consumerSignupsThisMonth,
      recentAuditEvents,
    ] = await Promise.all([
      db.organisation.count(),
      db.organisation.count({ where: { status: 'active' } }),
      db.assessmentCase.count(),
      db.usageEvent.aggregate({
        where: { occurredAt: { gte: start } },
        _sum: { quantity: true },
      }),
      db.organisationMember.count({
        where: { status: 'active', lastActiveAt: { gte: thirtyDaysAgo } },
      }),
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: start } } }),
      db.internalAdminAuditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { organisation: { select: { name: true, slug: true } } },
      }),
    ])

    const organisations = await this.listOrganisations()

    return {
      metrics: {
        totalOrganisations,
        activeOrganisations,
        deliveredAssessments,
        usageThisMonth: usageThisMonth._sum.quantity ?? 0,
        activePartnerMembers30d,
        totalConsumers,
        consumerSignupsThisMonth,
      },
      recentOrganisations: organisations.slice(0, 5),
      recentAuditEvents: recentAuditEvents.map((event) => this.mapInternalAuditEvent(event)),
    }
  }

  async listOrganisations() {
    const start = this.startOfMonth()
    const organisations = await db.organisation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        members: {
          where: { status: 'active' },
          include: {
            user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          },
        },
        _count: {
          select: {
            members: true,
            invitations: true,
            assessmentCases: true,
            assessmentRequests: true,
            usageEvents: true,
          },
        },
      },
    })

    const usage = await db.usageEvent.groupBy({
      by: ['organisationId'],
      where: { occurredAt: { gte: start } },
      _sum: { quantity: true },
    })
    const usageByOrganisation = new Map(
      usage.map((item) => [item.organisationId, item._sum.quantity ?? 0])
    )

    return organisations.map((organisation) => {
      const owner =
        organisation.members.find((member) => member.role === 'owner') ??
        organisation.members[0] ??
        null
      return {
        id: organisation.id,
        name: organisation.name,
        slug: organisation.slug,
        status: organisation.status,
        planName: organisation.planName,
        monthlyAssessmentAllowance: organisation.monthlyAssessmentAllowance,
        overageUnitPrice: organisation.overageUnitPrice,
        currency: organisation.currency,
        createdAt: organisation.createdAt,
        updatedAt: organisation.updatedAt,
        owner: owner ? this.mapMemberPerson(owner.user) : null,
        metrics: {
          members: organisation._count.members,
          activeMembers: organisation.members.length,
          pendingInvitations: organisation._count.invitations,
          assessmentCases: organisation._count.assessmentCases,
          assessmentRequests: organisation._count.assessmentRequests,
          usageEvents: organisation._count.usageEvents,
          usageThisMonth: usageByOrganisation.get(organisation.id) ?? 0,
        },
      }
    })
  }

  async getOrganisation(organisationSlugOrId: string) {
    const start = this.startOfMonth()
    const organisation = await db.organisation.findFirst({
      where: { OR: [{ id: organisationSlugOrId }, { slug: organisationSlugOrId }] },
      include: {
        members: {
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
          include: {
            user: {
              select: {
                id: true,
                email: true,
                status: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
        invitations: { orderBy: { createdAt: 'desc' }, take: 25 },
        _count: {
          select: {
            assessmentCases: true,
            assessmentRequests: true,
            policies: true,
            usageEvents: true,
            auditEvents: true,
          },
        },
      },
    })

    if (!organisation) throw new NotFoundException('Organisation not found')

    const [usageThisMonth, totalUsage, recentUsageEvents, recentAuditEvents] = await Promise.all([
      db.usageEvent.aggregate({
        where: { organisationId: organisation.id, occurredAt: { gte: start } },
        _sum: { quantity: true },
      }),
      db.usageEvent.aggregate({
        where: { organisationId: organisation.id },
        _sum: { quantity: true },
      }),
      db.usageEvent.findMany({
        where: { organisationId: organisation.id },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        include: {
          applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          assessmentCase: { select: { id: true, reference: true, assessmentType: true } },
        },
      }),
      db.organisationAuditEvent.findMany({
        where: { organisationId: organisation.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    return {
      id: organisation.id,
      name: organisation.name,
      slug: organisation.slug,
      status: organisation.status,
      planName: organisation.planName,
      monthlyAssessmentAllowance: organisation.monthlyAssessmentAllowance,
      overageUnitPrice: organisation.overageUnitPrice,
      currency: organisation.currency,
      createdAt: organisation.createdAt,
      updatedAt: organisation.updatedAt,
      metrics: {
        assessmentCases: organisation._count.assessmentCases,
        assessmentRequests: organisation._count.assessmentRequests,
        policies: organisation._count.policies,
        usageEvents: organisation._count.usageEvents,
        auditEvents: organisation._count.auditEvents,
        usageThisMonth: usageThisMonth._sum.quantity ?? 0,
        totalUsage: totalUsage._sum.quantity ?? 0,
      },
      members: organisation.members.map((member) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        invitedAt: member.invitedAt,
        joinedAt: member.joinedAt,
        lastActiveAt: member.lastActiveAt,
        user: this.mapMemberPerson(member.user),
      })),
      invitations: organisation.invitations.map((invitation) => this.mapInvitation(invitation)),
      recentUsageEvents: recentUsageEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        quantity: event.quantity,
        unit: event.unit,
        occurredAt: event.occurredAt,
        applicant: event.applicant ? this.mapMemberPerson(event.applicant) : null,
        assessmentCase: event.assessmentCase,
      })),
      recentAuditEvents,
    }
  }

  async createOrganisation(admin: InternalAdminContext, input: CreateOrganisationInput) {
    this.requirePermission(admin, 'admin:manage_organisations')

    const name = input.name?.trim()
    if (!name) throw new ConflictException('Organisation name is required')

    const slug = this.normaliseSlug(input.slug ?? name)
    const existing = await db.organisation.findUnique({ where: { slug } })
    if (existing) throw new ConflictException('That organisation slug is already in use')

    const ownerEmail = input.ownerEmail ? this.normaliseEmail(input.ownerEmail) : null
    const ownerRole = this.parseOrganisationRole(input.ownerRole ?? 'owner')
    const token = ownerEmail ? this.makeToken() : null
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const result = await db.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name,
          slug,
          planName: input.planName?.trim() || null,
          monthlyAssessmentAllowance: Math.max(
            0,
            Math.floor(input.monthlyAssessmentAllowance ?? 0)
          ),
          overageUnitPrice: input.overageUnitPrice ?? null,
          currency: input.currency?.trim().toUpperCase() || 'GBP',
        },
      })

      const invitation = ownerEmail
        ? await tx.organisationInvitation.create({
            data: {
              organisationId: organisation.id,
              email: ownerEmail,
              role: ownerRole,
              token: token!,
              invitedById: admin.userId,
              expiresAt,
              metadata: { source: 'internal_admin_create_organisation' },
            },
          })
        : null

      await tx.internalAdminAuditEvent.create({
        data: {
          actorUserId: admin.userId,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: 'organisation_created',
          targetType: 'organisation',
          targetId: organisation.id,
          organisationId: organisation.id,
          metadata: {
            name: organisation.name,
            slug: organisation.slug,
            ownerInvitationId: invitation?.id ?? null,
            ownerEmail,
          },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: organisation.id,
          actorType: 'equiscore_admin',
          actorId: admin.userId,
          action: 'organisation_created',
          targetType: 'organisation',
          targetId: organisation.id,
          metadata: {
            source: 'internal_admin',
            ownerInvitationId: invitation?.id ?? null,
            ownerEmail,
          },
        },
      })

      return { organisation, invitation }
    })

    return {
      organisation: result.organisation,
      invitation: result.invitation ? this.mapInvitation(result.invitation) : null,
    }
  }

  async inviteMember(
    admin: InternalAdminContext,
    organisationSlugOrId: string,
    input: InviteMemberInput
  ) {
    this.requirePermission(admin, 'admin:manage_access')

    const email = this.normaliseEmail(input.email)
    if (!email) throw new ConflictException('Invite email is required')

    const role = this.parseOrganisationRole(input.role ?? 'admin')
    const organisation = await db.organisation.findFirst({
      where: { OR: [{ id: organisationSlugOrId }, { slug: organisationSlugOrId }] },
      select: { id: true, name: true, slug: true },
    })
    if (!organisation) throw new NotFoundException('Organisation not found')

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      const existingMember = await db.organisationMember.findUnique({
        where: {
          organisationId_userId: {
            organisationId: organisation.id,
            userId: existingUser.id,
          },
        },
      })
      if (existingMember?.status === 'active') {
        throw new ConflictException('That user is already an active member of this organisation')
      }
    }

    const token = this.makeToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const invitation = await db.$transaction(async (tx) => {
      const existingPending = await tx.organisationInvitation.findFirst({
        where: { organisationId: organisation.id, email, status: 'pending' },
      })

      const saved = existingPending
        ? await tx.organisationInvitation.update({
            where: { id: existingPending.id },
            data: {
              role,
              token,
              invitedById: admin.userId,
              expiresAt,
              metadata: { source: 'internal_admin_reinvite' },
            },
          })
        : await tx.organisationInvitation.create({
            data: {
              organisationId: organisation.id,
              email,
              role,
              token,
              invitedById: admin.userId,
              expiresAt,
              metadata: { source: 'internal_admin_invite' },
            },
          })

      await tx.internalAdminAuditEvent.create({
        data: {
          actorUserId: admin.userId,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: existingPending ? 'partner_invitation_resent' : 'partner_invitation_created',
          targetType: 'organisation_invitation',
          targetId: saved.id,
          organisationId: organisation.id,
          metadata: { email, role, organisationSlug: organisation.slug },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: organisation.id,
          actorType: 'equiscore_admin',
          actorId: admin.userId,
          action: existingPending ? 'partner_invitation_resent' : 'partner_invitation_created',
          targetType: 'organisation_invitation',
          targetId: saved.id,
          metadata: { email, role },
        },
      })

      return saved
    })

    return this.mapInvitation(invitation)
  }

  async listUsageEvents() {
    const events = await db.usageEvent.findMany({
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        assessmentCase: { select: { id: true, reference: true, assessmentType: true } },
        applicant: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        initiatedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
    })

    return events.map((event) => ({
      id: event.id,
      organisation: event.organisation,
      eventType: event.eventType,
      source: event.source,
      quantity: event.quantity,
      unit: event.unit,
      occurredAt: event.occurredAt,
      includedOrOverage: event.includedOrOverage,
      unitPrice: event.unitPrice,
      currency: event.currency,
      assessmentCase: event.assessmentCase,
      applicant: event.applicant ? this.mapMemberPerson(event.applicant) : null,
      initiatedBy: event.initiatedBy ? this.mapMemberPerson(event.initiatedBy) : null,
    }))
  }

  async listActivity() {
    const [members, invitations] = await Promise.all([
      db.organisationMember.findMany({
        where: { lastActiveAt: { not: null } },
        orderBy: { lastActiveAt: 'desc' },
        take: 100,
        include: {
          organisation: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
      }),
      db.organisationInvitation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { organisation: { select: { id: true, name: true, slug: true } } },
      }),
    ])

    return {
      members: members.map((member) => ({
        id: member.id,
        organisation: member.organisation,
        user: this.mapMemberPerson(member.user),
        role: member.role,
        status: member.status,
        lastActiveAt: member.lastActiveAt,
        joinedAt: member.joinedAt,
      })),
      invitations: invitations.map((invitation) => ({
        ...this.mapInvitation(invitation),
        organisation: invitation.organisation,
      })),
    }
  }

  async listAuditEvents() {
    const events = await db.internalAdminAuditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { organisation: { select: { id: true, name: true, slug: true } } },
    })

    return events.map((event) => this.mapInternalAuditEvent(event))
  }

  private bootstrapAdminEmails(): Set<string> {
    return new Set(
      (process.env.EQUISCORE_ADMIN_EMAILS ?? process.env.INTERNAL_ADMIN_EMAILS ?? '')
        .split(',')
        .map((value) => this.normaliseEmail(value))
        .filter(Boolean)
    )
  }

  private requirePermission(admin: InternalAdminContext, permission: InternalAdminPermission) {
    if (!admin.permissions.includes(permission)) {
      throw new ForbiddenException('This internal admin role cannot perform that action')
    }
  }

  private normaliseEmail(value: string | undefined | null): string {
    return value?.trim().toLowerCase() ?? ''
  }

  private normaliseSlug(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)

    return slug || `org-${randomBytes(4).toString('hex')}`
  }

  private makeToken(): string {
    return randomBytes(24).toString('base64url')
  }

  private startOfMonth(): Date {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  }

  private parseOrganisationRole(value: string): OrganisationRole {
    if (ORGANISATION_ROLES.includes(value as OrganisationRole)) return value as OrganisationRole
    throw new ConflictException('Unsupported organisation role')
  }

  private parseInternalAdminRole(value: string): InternalAdminRole {
    if (INTERNAL_ADMIN_ROLES.includes(value as InternalAdminRole)) return value as InternalAdminRole
    throw new ConflictException('Unsupported internal admin role')
  }

  private async claimPendingInternalAdminInvitation(userId: string, email: string) {
    if (!email) return null

    const now = new Date()
    await db.internalAdminInvitation.updateMany({
      where: { email, status: 'pending', expiresAt: { lte: now } },
      data: { status: 'expired' },
    })

    const invitation = await db.internalAdminInvitation.findFirst({
      where: { email, status: 'pending', expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    })
    if (!invitation) return null

    return db.$transaction(async (tx) => {
      const access = await tx.internalAdminAccess.upsert({
        where: { userId },
        update: {
          role: invitation.role,
          status: 'active',
          grantedById: invitation.invitedById,
          grantedAt: now,
          revokedAt: null,
        },
        create: {
          userId,
          role: invitation.role,
          status: 'active',
          grantedById: invitation.invitedById,
          grantedAt: now,
        },
      })

      await tx.internalAdminInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedById: userId,
          acceptedAt: now,
        },
      })

      await tx.internalAdminAuditEvent.create({
        data: {
          actorUserId: userId,
          actorEmail: email,
          actorRole: invitation.role,
          action: 'internal_admin_invitation_accepted',
          targetType: 'internal_admin_access',
          targetId: access.id,
          metadata: { invitationId: invitation.id, invitedById: invitation.invitedById },
        },
      })

      return access
    })
  }

  private mapMemberPerson(user: {
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

  private mapInvitation(invitation: {
    id: string
    email: string
    role: string
    status: string
    token: string
    expiresAt: Date
    acceptedAt: Date | null
    revokedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    }
  }

  private mapInternalAdminInvitation(invitation: {
    id: string
    email: string
    role: string
    status: string
    token: string
    expiresAt: Date
    acceptedAt: Date | null
    revokedAt: Date | null
    createdAt: Date
    updatedAt: Date
    invitedBy?: { id: string; email: string; profile?: { fullName: string | null } | null } | null
    acceptedBy?: { id: string; email: string; profile?: { fullName: string | null } | null } | null
  }) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      invitedBy: invitation.invitedBy ? this.mapMemberPerson(invitation.invitedBy) : null,
      acceptedBy: invitation.acceptedBy ? this.mapMemberPerson(invitation.acceptedBy) : null,
    }
  }

  private mapInternalAuditEvent(event: {
    id: string
    actorUserId: string | null
    actorEmail: string | null
    actorRole: string | null
    action: string
    targetType: string
    targetId: string | null
    organisationId: string | null
    metadata: unknown
    ipAddress: string | null
    createdAt: Date
    organisation?: { name: string; slug: string } | null
  }) {
    return {
      id: event.id,
      actorUserId: event.actorUserId,
      actorEmail: event.actorEmail,
      actorRole: event.actorRole,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      organisationId: event.organisationId,
      organisation: event.organisation ?? null,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      createdAt: event.createdAt,
    }
  }
}
