import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { db } from '@equiscore/database'
import { randomBytes } from 'crypto'
import {
  InvitationEmailService,
  type InvitationEmailDelivery,
} from '../common/invitation-email.service'
import { permissionsForRole, type OrganisationRole } from './permissions'
import type { OrganisationContext } from './organisation-context'

interface CreateOrganisationInput {
  name: string
  slug?: string
}

interface InviteOrganisationMemberInput {
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

@Injectable()
export class OrganisationsService {
  constructor(private readonly invitationEmail: InvitationEmailService) {}

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

  async listForUser(userId: string, email?: string) {
    await this.claimPendingInvitations(userId, email)
    await db.organisationMember.updateMany({
      where: { userId, status: 'active', organisation: { status: 'active' } },
      data: { lastActiveAt: new Date() },
    })

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
    await db.organisationMember.update({
      where: { id: membership.id },
      data: { lastActiveAt: new Date() },
    })

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
            in: [
              'assessment_delivered',
              'shared_profile_accepted',
              'assessment_refreshed',
              'assessment_api_delivered',
            ],
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

  async getTeamSettings(context: OrganisationContext) {
    const [organisation, members, invitations] = await Promise.all([
      db.organisation.findUnique({
        where: { id: context.organisationId },
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
      }),
      db.organisationMember.findMany({
        where: { organisationId: context.organisationId, status: { not: 'removed' } },
        orderBy: [{ status: 'asc' }, { role: 'asc' }, { createdAt: 'asc' }],
        include: {
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
      }),
      db.organisationInvitation.findMany({
        where: { organisationId: context.organisationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    if (!organisation) throw new NotFoundException('Organisation not found')

    return {
      organisation,
      member: {
        id: context.memberId,
        role: context.role,
        permissions: context.permissions,
      },
      members: members.map((member) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        invitedAt: member.invitedAt,
        joinedAt: member.joinedAt,
        lastActiveAt: member.lastActiveAt,
        user: this.mapMemberPerson(member.user),
      })),
      invitations: invitations.map((invitation) => this.mapInvitation(invitation)),
    }
  }

  async inviteMember(
    actorUserId: string,
    context: OrganisationContext,
    input: InviteOrganisationMemberInput
  ) {
    this.requirePermission(context, 'members:manage')

    const email = this.normaliseEmail(input.email)
    if (!email) throw new ConflictException('Invite email is required')

    const role = this.parseOrganisationRole(input.role ?? 'reviewer')
    this.assertCanManageRole(context, role)

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      const existingMember = await db.organisationMember.findUnique({
        where: {
          organisationId_userId: {
            organisationId: context.organisationId,
            userId: existingUser.id,
          },
        },
      })
      if (existingMember?.status === 'active') {
        throw new ConflictException('That user is already an active member of this organisation')
      }
    }

    const now = new Date()
    await db.organisationInvitation.updateMany({
      where: {
        organisationId: context.organisationId,
        email,
        status: 'pending',
        expiresAt: { lte: now },
      },
      data: { status: 'expired' },
    })

    const token = this.makeToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const invitation = await db.$transaction(async (tx) => {
      const existingPending = await tx.organisationInvitation.findFirst({
        where: { organisationId: context.organisationId, email, status: 'pending' },
      })

      const saved = existingPending
        ? await tx.organisationInvitation.update({
            where: { id: existingPending.id },
            data: {
              role,
              token,
              invitedById: actorUserId,
              expiresAt,
              metadata: { source: 'partner_workspace_reinvite' },
            },
          })
        : await tx.organisationInvitation.create({
            data: {
              organisationId: context.organisationId,
              email,
              role,
              token,
              invitedById: actorUserId,
              expiresAt,
              metadata: { source: 'partner_workspace_invite' },
            },
          })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: actorUserId,
          action: existingPending ? 'partner_invitation_resent' : 'partner_invitation_created',
          targetType: 'organisation_invitation',
          targetId: saved.id,
          metadata: { email, role, source: 'partner_workspace' },
        },
      })

      return saved
    })

    const mappedInvitation = this.mapInvitation(invitation)
    const emailDelivery = await this.sendPartnerInvitationEmail(mappedInvitation, {
      name: context.organisationName,
      slug: context.organisationSlug,
    })
    return { ...mappedInvitation, emailDelivery }
  }

  async resendInvitation(actorUserId: string, context: OrganisationContext, invitationId: string) {
    this.requirePermission(context, 'members:manage')

    const existing = await db.organisationInvitation.findFirst({
      where: { id: invitationId, organisationId: context.organisationId },
    })
    if (!existing) throw new NotFoundException('Organisation invitation not found')
    if (existing.status === 'accepted') {
      throw new ConflictException('That invitation has already been accepted')
    }
    if (existing.status === 'revoked') {
      throw new ConflictException('That invitation has already been revoked')
    }
    this.assertCanManageRole(context, existing.role as OrganisationRole)

    const existingUser = await db.user.findUnique({ where: { email: existing.email } })
    if (existingUser) {
      const existingMember = await db.organisationMember.findUnique({
        where: {
          organisationId_userId: {
            organisationId: context.organisationId,
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
      const saved = await tx.organisationInvitation.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          token,
          invitedById: actorUserId,
          acceptedById: null,
          acceptedAt: null,
          revokedAt: null,
          expiresAt,
          metadata: { source: 'partner_workspace_resend', resentFromStatus: existing.status },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: actorUserId,
          action: 'partner_invitation_resent',
          targetType: 'organisation_invitation',
          targetId: saved.id,
          metadata: { email: saved.email, role: saved.role, previousStatus: existing.status },
        },
      })

      return saved
    })

    const mappedInvitation = this.mapInvitation(invitation)
    const emailDelivery = await this.sendPartnerInvitationEmail(mappedInvitation, {
      name: context.organisationName,
      slug: context.organisationSlug,
    })
    return { ...mappedInvitation, emailDelivery }
  }

  async revokeInvitation(actorUserId: string, context: OrganisationContext, invitationId: string) {
    this.requirePermission(context, 'members:manage')

    const existing = await db.organisationInvitation.findFirst({
      where: { id: invitationId, organisationId: context.organisationId },
    })
    if (!existing) throw new NotFoundException('Organisation invitation not found')
    if (existing.status === 'accepted') {
      throw new ConflictException('That invitation has already been accepted')
    }
    if (existing.status === 'revoked') {
      throw new ConflictException('That invitation has already been revoked')
    }
    this.assertCanManageRole(context, existing.role as OrganisationRole)

    const now = new Date()
    return db.$transaction(async (tx) => {
      const invitation = await tx.organisationInvitation.update({
        where: { id: existing.id },
        data: {
          status: 'revoked',
          revokedAt: now,
          metadata: { source: 'partner_workspace_revoke', revokedFromStatus: existing.status },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: actorUserId,
          action: 'partner_invitation_revoked',
          targetType: 'organisation_invitation',
          targetId: invitation.id,
          metadata: {
            email: invitation.email,
            role: invitation.role,
            previousStatus: existing.status,
          },
        },
      })

      return this.mapInvitation(invitation)
    })
  }

  async updateMemberRole(
    actorUserId: string,
    context: OrganisationContext,
    memberId: string,
    roleValue: string
  ) {
    this.requirePermission(context, 'members:manage')

    const role = this.parseOrganisationRole(roleValue)
    this.assertCanManageRole(context, role)

    const member = await db.organisationMember.findFirst({
      where: { id: memberId, organisationId: context.organisationId },
    })
    if (!member) throw new NotFoundException('Organisation member not found')
    if (member.userId === actorUserId)
      throw new ConflictException('You cannot change your own role')
    if (member.role === 'owner' && role !== 'owner')
      await this.assertAnotherActiveOwner(member.id, context)

    const updated = await db.$transaction(async (tx) => {
      const saved = await tx.organisationMember.update({
        where: { id: member.id },
        data: { role },
        include: {
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: actorUserId,
          action: 'partner_member_role_updated',
          targetType: 'organisation_member',
          targetId: saved.id,
          metadata: { previousRole: member.role, role },
        },
      })

      return saved
    })

    return {
      id: updated.id,
      role: updated.role,
      status: updated.status,
      invitedAt: updated.invitedAt,
      joinedAt: updated.joinedAt,
      lastActiveAt: updated.lastActiveAt,
      user: this.mapMemberPerson(updated.user),
    }
  }

  async removeMember(actorUserId: string, context: OrganisationContext, memberId: string) {
    this.requirePermission(context, 'members:manage')

    const member = await db.organisationMember.findFirst({
      where: { id: memberId, organisationId: context.organisationId },
      include: {
        user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
    })
    if (!member) throw new NotFoundException('Organisation member not found')
    if (member.userId === actorUserId) throw new ConflictException('You cannot remove yourself')
    if (member.role === 'owner') {
      this.assertCanManageRole(context, 'owner')
      await this.assertAnotherActiveOwner(member.id, context)
    }

    const removed = await db.$transaction(async (tx) => {
      const saved = await tx.organisationMember.update({
        where: { id: member.id },
        data: { status: 'removed' },
        include: {
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
      })

      await tx.organisationAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          actorType: 'partner_user',
          actorId: actorUserId,
          action: 'partner_member_removed',
          targetType: 'organisation_member',
          targetId: saved.id,
          metadata: { email: saved.user.email, role: saved.role },
        },
      })

      return saved
    })

    return {
      id: removed.id,
      role: removed.role,
      status: removed.status,
      invitedAt: removed.invitedAt,
      joinedAt: removed.joinedAt,
      lastActiveAt: removed.lastActiveAt,
      user: this.mapMemberPerson(removed.user),
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

  private normaliseEmail(value: string | undefined | null): string {
    return value?.trim().toLowerCase() ?? ''
  }

  private makeToken(): string {
    return randomBytes(24).toString('base64url')
  }

  private parseOrganisationRole(value: string): OrganisationRole {
    if (ORGANISATION_ROLES.includes(value as OrganisationRole)) return value as OrganisationRole
    throw new ConflictException('Unsupported organisation role')
  }

  private requirePermission(
    context: OrganisationContext,
    permission: 'members:manage' | 'organisation:read'
  ) {
    if (!context.permissions.includes(permission)) {
      throw new ForbiddenException('This partner role cannot perform that action')
    }
  }

  private assertCanManageRole(context: OrganisationContext, role: OrganisationRole) {
    if (role === 'owner' && context.role !== 'owner') {
      throw new ForbiddenException('Only an owner can manage owner access')
    }
  }

  private async assertAnotherActiveOwner(memberId: string, context: OrganisationContext) {
    const ownerCount = await db.organisationMember.count({
      where: {
        organisationId: context.organisationId,
        status: 'active',
        role: 'owner',
        id: { not: memberId },
      },
    })
    if (ownerCount === 0) {
      throw new ConflictException('This organisation must keep at least one active owner')
    }
  }

  private async sendPartnerInvitationEmail(
    invitation: { email: string; role: string; expiresAt: Date },
    organisation: { name: string; slug: string }
  ): Promise<InvitationEmailDelivery> {
    return this.invitationEmail.sendInvitation({
      to: invitation.email,
      subject: `${organisation.name} invited you to EquiScore`,
      eyebrow: 'Team invitation',
      heading: `Join your team on EquiScore`,
      preview: `You have been invited to ${organisation.name}'s EquiScore workspace.`,
      intro: `${organisation.name} has invited you to its EquiScore partner workspace for assessment requests, case review and workspace collaboration.`,
      body: 'This invitation is organisation-specific. Sign in with the invited email address to claim the role shown below.',
      ctaLabel: 'Open partner workspace',
      ctaUrl: this.absolutePartnerUrl(`/o/${organisation.slug}`),
      surfaceLabel: 'Partner workspace',
      details: [
        { label: 'Portal', value: 'partners.equiscore.app' },
        { label: 'Organisation', value: organisation.name },
        { label: 'Role', value: this.label(invitation.role) },
        { label: 'Expires', value: this.formatInviteDate(invitation.expiresAt) },
      ],
      footerNote:
        'Only accept this invitation if you expected access to this organisation on EquiScore. If you were not expecting this, you can ignore this email.',
    })
  }

  private absolutePartnerUrl(path: string): string {
    const base = (
      process.env.PARTNER_APP_URL ??
      process.env.NEXT_PUBLIC_PARTNER_APP_URL ??
      'https://partners.equiscore.app'
    )
      .trim()
      .replace(/\/+$/, '')
    return `${base}${path.startsWith('/') ? path : `/${path}`}`
  }

  private formatInviteDate(value: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value)
  }

  private label(value: string): string {
    return value.replace(/_/g, ' ')
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

  private async claimPendingInvitations(userId: string, email: string | undefined) {
    const normalisedEmail = email?.trim().toLowerCase()
    if (!normalisedEmail) return

    const now = new Date()
    await db.organisationInvitation.updateMany({
      where: { email: normalisedEmail, status: 'pending', expiresAt: { lte: now } },
      data: { status: 'expired' },
    })

    const invitations = await db.organisationInvitation.findMany({
      where: {
        email: normalisedEmail,
        status: 'pending',
        expiresAt: { gt: now },
        organisation: { status: 'active' },
      },
      include: { organisation: { select: { id: true } } },
    })

    if (invitations.length === 0) return

    await db.$transaction(async (tx) => {
      for (const invitation of invitations) {
        const member = await tx.organisationMember.upsert({
          where: {
            organisationId_userId: {
              organisationId: invitation.organisationId,
              userId,
            },
          },
          update: {
            role: invitation.role,
            status: 'active',
            invitedAt: invitation.createdAt,
            joinedAt: now,
            lastActiveAt: now,
          },
          create: {
            organisationId: invitation.organisationId,
            userId,
            role: invitation.role,
            status: 'active',
            invitedAt: invitation.createdAt,
            joinedAt: now,
            lastActiveAt: now,
          },
        })

        await tx.organisationInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'accepted',
            acceptedById: userId,
            acceptedAt: now,
          },
        })

        await tx.organisationAuditEvent.create({
          data: {
            organisationId: invitation.organisationId,
            actorType: 'partner_user',
            actorId: userId,
            action: 'partner_invitation_accepted',
            targetType: 'organisation_member',
            targetId: member.id,
            metadata: {
              invitationId: invitation.id,
              email: normalisedEmail,
              role: invitation.role,
            },
          },
        })
      }
    })
  }
}
