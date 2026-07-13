import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { AuthService } from '../auth/auth.service'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { RespondToInformationRequestDto } from './assessment-requests.dto'
import { AssessmentsService } from './assessments.service'

@ApiTags('assessment requests')
@Controller('assessment-requests')
export class AssessmentRequestsController {
  constructor(
    private readonly assessments: AssessmentsService,
    private readonly authService: AuthService
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Resolve an assessment request token' })
  async getPublicRequest(@Param('token') token: string, @Req() req: Request) {
    return this.assessments.getPublicRequest(token, req.ip)
  }

  @Post(':token/complete')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Applicant grants consent and completes a company assessment request' })
  async completeRequest(
    @Param('token') token: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request
  ) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.assessments.completeRequest(token, dbUser.id, req.ip)
  }

  @Post(':token/information-requests/:informationRequestId/respond')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Applicant responds to an assessment information request' })
  async respondToInformationRequest(
    @Param('token') token: string,
    @Param('informationRequestId') informationRequestId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: RespondToInformationRequestDto,
    @Req() req: Request
  ) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.assessments.respondToInformationRequest(
      token,
      informationRequestId,
      dbUser.id,
      body,
      req.ip
    )
  }
}
