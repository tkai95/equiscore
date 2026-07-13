import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { AuthService } from '../auth/auth.service'
import { OrganisationAccessGuard } from './organisation-access.guard'
import { CurrentOrganisation, type OrganisationContext } from './organisation-context'
import { OrganisationsService } from './organisations.service'

@ApiTags('organisations')
@Controller('organisations')
export class OrganisationsController {
  constructor(
    private readonly authService: AuthService,
    private readonly organisations: OrganisationsService
  ) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Organisation creation is managed by EquiScore admin' })
  async create(@Body() _body: { name: string; slug?: string }) {
    throw new ForbiddenException('Organisation creation is managed in EquiScore admin')
  }

  @Get()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List company organisations for the current user' })
  async list(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.organisations.listForUser(dbUser.id, dbUser.email)
  }

  @Get(':organisationSlug/overview')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company workspace overview metrics' })
  async overview(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.organisations.getOverview(organisation)
  }

  @Get(':organisationSlug/team')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organisation members and invitations' })
  async team(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.organisations.getTeamSettings(organisation)
  }

  @Get(':organisationSlug/shared-profiles')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List shared profiles imported into the current organisation' })
  async sharedProfiles(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.organisations.listSharedProfiles(organisation)
  }

  @Post(':organisationSlug/shared-profiles/import')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import a consumer share link into the current organisation' })
  async importSharedProfile(
    @CurrentUser() user: RequestUser,
    @CurrentOrganisation() organisation: OrganisationContext,
    @Body() body: { shareCode?: string }
  ) {
    return this.organisations.importSharedProfile(user.dbUserId!, organisation, body)
  }

  @Post(':organisationSlug/invitations')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a member into the current organisation' })
  async inviteMember(
    @CurrentUser() user: RequestUser,
    @CurrentOrganisation() organisation: OrganisationContext,
    @Body() body: { email: string; role?: string }
  ) {
    return this.organisations.inviteMember(user.dbUserId!, organisation, body)
  }

  @Post(':organisationSlug/invitations/:invitationId/resend')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh an organisation member invitation' })
  async resendInvitation(
    @CurrentUser() user: RequestUser,
    @CurrentOrganisation() organisation: OrganisationContext,
    @Param('invitationId') invitationId: string
  ) {
    return this.organisations.resendInvitation(user.dbUserId!, organisation, invitationId)
  }

  @Post(':organisationSlug/invitations/:invitationId/revoke')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an organisation member invitation' })
  async revokeInvitation(
    @CurrentUser() user: RequestUser,
    @CurrentOrganisation() organisation: OrganisationContext,
    @Param('invitationId') invitationId: string
  ) {
    return this.organisations.revokeInvitation(user.dbUserId!, organisation, invitationId)
  }

  @Post(':organisationSlug/members/:memberId/role')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an organisation member role' })
  async updateMemberRole(
    @CurrentUser() user: RequestUser,
    @CurrentOrganisation() organisation: OrganisationContext,
    @Param('memberId') memberId: string,
    @Body() body: { role: string }
  ) {
    return this.organisations.updateMemberRole(user.dbUserId!, organisation, memberId, body.role)
  }

  @Post(':organisationSlug/members/:memberId/remove')
  @UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an organisation member' })
  async removeMember(
    @CurrentUser() user: RequestUser,
    @CurrentOrganisation() organisation: OrganisationContext,
    @Param('memberId') memberId: string
  ) {
    return this.organisations.removeMember(user.dbUserId!, organisation, memberId)
  }
}
