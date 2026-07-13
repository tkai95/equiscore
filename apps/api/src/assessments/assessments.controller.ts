import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import {
  CurrentOrganisation,
  type OrganisationContext,
} from '../organisations/organisation-context'
import { OrganisationAccessGuard } from '../organisations/organisation-access.guard'
import {
  CreateAssessmentRequestDto,
  RecordCaseDecisionDto,
  RequestCaseInformationDto,
} from './assessment-requests.dto'
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

  @Get('assessment-cases/:caseId')
  @ApiOperation({ summary: 'Get an organisation assessment case detail' })
  async caseDetail(
    @CurrentOrganisation() organisation: OrganisationContext,
    @Param('caseId') caseId: string
  ) {
    return this.assessments.getCase(organisation, caseId)
  }

  @Post('assessment-cases/:caseId/decisions')
  @ApiOperation({ summary: 'Record a partner decision on an assessment case' })
  async recordDecision(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('caseId') caseId: string,
    @Body() body: RecordCaseDecisionDto
  ) {
    return this.assessments.recordCaseDecision(organisation, caseId, user.dbUserId!, body)
  }

  @Post('assessment-cases/:caseId/information-requests')
  @ApiOperation({ summary: 'Request more information for an assessment case' })
  async requestInformation(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('caseId') caseId: string,
    @Body() body: RequestCaseInformationDto
  ) {
    return this.assessments.requestCaseInformation(organisation, caseId, user.dbUserId!, body)
  }

  @Get('assessment-requests')
  @ApiOperation({ summary: 'List organisation assessment requests' })
  async requests(@CurrentOrganisation() organisation: OrganisationContext) {
    return this.assessments.listRequests(organisation)
  }

  @Post('assessment-requests')
  @ApiOperation({ summary: 'Create a company-initiated assessment request' })
  async createRequest(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateAssessmentRequestDto
  ) {
    return this.assessments.createRequest(organisation, user.dbUserId!, body)
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
