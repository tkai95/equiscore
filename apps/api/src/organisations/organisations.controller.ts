import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common'
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
}
