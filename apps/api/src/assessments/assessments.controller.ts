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
  CreatePolicyDto,
  CreateAssessmentRequestDto,
  RecordCaseDecisionDto,
  RequestCaseInformationDto,
  UpdatePolicyVersionDto,
  UpdateInformationRequestStatusDto,
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

  @Post('assessment-cases/:caseId/information-requests/:informationRequestId/status')
  @ApiOperation({ summary: 'Update an assessment information request status' })
  async updateInformationRequestStatus(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('caseId') caseId: string,
    @Param('informationRequestId') informationRequestId: string,
    @Body() body: UpdateInformationRequestStatusDto
  ) {
    return this.assessments.updateInformationRequestStatus(
      organisation,
      caseId,
      informationRequestId,
      user.dbUserId!,
      body
    )
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

  @Post('policies')
  @ApiOperation({ summary: 'Create a draft organisation policy' })
  async createPolicy(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePolicyDto
  ) {
    return this.assessments.createPolicy(organisation, user.dbUserId!, body)
  }

  @Get('policies/:policyId')
  @ApiOperation({ summary: 'Get an organisation policy detail' })
  async policyDetail(
    @CurrentOrganisation() organisation: OrganisationContext,
    @Param('policyId') policyId: string
  ) {
    return this.assessments.getPolicy(organisation, policyId)
  }

  @Post('policies/:policyId/versions/:versionId')
  @ApiOperation({ summary: 'Update a draft policy version' })
  async updatePolicyVersion(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('policyId') policyId: string,
    @Param('versionId') versionId: string,
    @Body() body: UpdatePolicyVersionDto
  ) {
    return this.assessments.updatePolicyVersion(
      organisation,
      policyId,
      versionId,
      user.dbUserId!,
      body
    )
  }

  @Post('policies/:policyId/versions/:versionId/submit')
  @ApiOperation({ summary: 'Submit a policy version for approval' })
  async submitPolicyVersion(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('policyId') policyId: string,
    @Param('versionId') versionId: string
  ) {
    return this.assessments.submitPolicyVersion(organisation, policyId, versionId, user.dbUserId!)
  }

  @Post('policies/:policyId/versions/:versionId/approve')
  @ApiOperation({ summary: 'Approve and activate a policy version' })
  async approvePolicyVersion(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('policyId') policyId: string,
    @Param('versionId') versionId: string
  ) {
    return this.assessments.approvePolicyVersion(organisation, policyId, versionId, user.dbUserId!)
  }

  @Post('policies/:policyId/retire')
  @ApiOperation({ summary: 'Retire an organisation policy' })
  async retirePolicy(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('policyId') policyId: string
  ) {
    return this.assessments.retirePolicy(organisation, policyId, user.dbUserId!)
  }

  @Post('policies/:policyId/versions/:versionId/preview')
  @ApiOperation({ summary: 'Preview a policy version against recent cases' })
  async previewPolicyVersion(
    @CurrentOrganisation() organisation: OrganisationContext,
    @CurrentUser() user: RequestUser,
    @Param('policyId') policyId: string,
    @Param('versionId') versionId: string
  ) {
    return this.assessments.previewPolicyVersion(organisation, policyId, versionId, user.dbUserId!)
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
