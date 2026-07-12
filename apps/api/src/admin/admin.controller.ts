import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
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
