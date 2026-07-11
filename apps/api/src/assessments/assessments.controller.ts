import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentOrganisation, type OrganisationContext } from '../organisations/organisation-context'
import { OrganisationAccessGuard } from '../organisations/organisation-access.guard'
import { AssessmentsService } from './assessments.service'

@ApiTags('company workspace')
@Controller('organisations/:organisationSlug')
@UseGuards(ClerkAuthGuard, OrganisationAccessGuard)
@ApiBearerAuth()
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get('assessment-cases')
  @ApiOperation({ summary: 'List organisation assessment cases' })
  async cases(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.assessments.listCases(organisation)
  }

  @Get('assessment-requests')
  @ApiOperation({ summary: 'List organisation assessment requests' })
  async requests(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.assessments.listRequests(organisation)
  }

  @Get('policies')
  @ApiOperation({ summary: 'List organisation policies' })
  async policies(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.assessments.listPolicies(organisation)
  }

  @Get('usage-events')
  @ApiOperation({ summary: 'List organisation usage events' })
  async usage(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.assessments.listUsageEvents(organisation)
  }

  @Get('audit-events')
  @ApiOperation({ summary: 'List organisation audit events' })
  async audit(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.assessments.listAuditEvents(organisation)
  }
}
