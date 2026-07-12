import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { AdminService } from './admin.service'
import { CurrentAdmin, type InternalAdminContext } from './admin-context'
import { InternalAdminGuard } from './internal-admin.guard'

@ApiTags('internal admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(ClerkAuthGuard, InternalAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current EquiScore internal admin context' })
  me(@CurrentAdmin() admin: InternalAdminContext) {
    return admin
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get internal admin overview metrics' })
  overview() {
    return this.admin.getOverview()
  }

  @Get('organisations')
  @ApiOperation({ summary: 'List all partner organisations' })
  organisations() {
    return this.admin.listOrganisations()
  }

  @Get('consumers')
  @ApiOperation({ summary: 'List consumer accounts and support signals' })
  consumers(@Query('q') query?: string) {
    return this.admin.listConsumers(query)
  }

  @Get('internal-admins')
  @ApiOperation({ summary: 'List internal admin access and invitations' })
  internalAdmins() {
    return this.admin.listInternalAdmins()
  }

  @Post('internal-admins/invitations')
  @ApiOperation({ summary: 'Invite an EquiScore internal admin' })
  inviteInternalAdmin(
    @CurrentAdmin() admin: InternalAdminContext,
    @Body() body: { email: string; role?: string }
  ) {
    return this.admin.inviteInternalAdmin(admin, body)
  }

  @Post('internal-admins/invitations/:invitationId/resend')
  @ApiOperation({ summary: 'Refresh an EquiScore internal admin invitation' })
  resendInternalAdminInvitation(
    @CurrentAdmin() admin: InternalAdminContext,
    @Param('invitationId') invitationId: string
  ) {
    return this.admin.resendInternalAdminInvitation(admin, invitationId)
  }

  @Post('internal-admins/invitations/:invitationId/revoke')
  @ApiOperation({ summary: 'Revoke an EquiScore internal admin invitation' })
  revokeInternalAdminInvitation(
    @CurrentAdmin() admin: InternalAdminContext,
    @Param('invitationId') invitationId: string
  ) {
    return this.admin.revokeInternalAdminInvitation(admin, invitationId)
  }

  @Post('organisations')
  @ApiOperation({ summary: 'Create a partner organisation' })
  createOrganisation(
    @CurrentAdmin() admin: InternalAdminContext,
    @Body()
    body: {
      name: string
      slug?: string
      planName?: string
      monthlyAssessmentAllowance?: number
      overageUnitPrice?: number | null
      currency?: string
      ownerEmail?: string
      ownerRole?: string
    }
  ) {
    return this.admin.createOrganisation(admin, body)
  }

  @Get('organisations/:organisationSlug')
  @ApiOperation({ summary: 'Get a partner organisation detail view' })
  organisation(@Param('organisationSlug') organisationSlug: string) {
    return this.admin.getOrganisation(organisationSlug)
  }

  @Post('organisations/:organisationSlug/invitations')
  @ApiOperation({ summary: 'Invite a partner user into an organisation' })
  invite(
    @CurrentAdmin() admin: InternalAdminContext,
    @Param('organisationSlug') organisationSlug: string,
    @Body() body: { email: string; role?: string }
  ) {
    return this.admin.inviteMember(admin, organisationSlug, body)
  }

  @Post('organisations/:organisationSlug/invitations/:invitationId/resend')
  @ApiOperation({ summary: 'Refresh a partner organisation invitation' })
  resendInvitation(
    @CurrentAdmin() admin: InternalAdminContext,
    @Param('organisationSlug') organisationSlug: string,
    @Param('invitationId') invitationId: string
  ) {
    return this.admin.resendMemberInvitation(admin, organisationSlug, invitationId)
  }

  @Post('organisations/:organisationSlug/invitations/:invitationId/revoke')
  @ApiOperation({ summary: 'Revoke a partner organisation invitation' })
  revokeInvitation(
    @CurrentAdmin() admin: InternalAdminContext,
    @Param('organisationSlug') organisationSlug: string,
    @Param('invitationId') invitationId: string
  ) {
    return this.admin.revokeMemberInvitation(admin, organisationSlug, invitationId)
  }

  @Get('usage-events')
  @ApiOperation({ summary: 'List platform-wide partner usage events' })
  usageEvents() {
    return this.admin.listUsageEvents()
  }

  @Get('activity')
  @ApiOperation({ summary: 'List partner login/activity signals' })
  activity() {
    return this.admin.listActivity()
  }

  @Get('audit-events')
  @ApiOperation({ summary: 'List internal admin audit events' })
  auditEvents() {
    return this.admin.listAuditEvents()
  }
}
