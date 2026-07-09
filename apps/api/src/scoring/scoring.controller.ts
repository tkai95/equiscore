import { Body, Controller, Post, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { ScoringService } from './scoring.service'
import { ImpactPreviewDto } from './scoring.dto'
import { AuthService } from '../auth/auth.service'
import type { ScorecardType } from '@equiscore/shared'

@ApiTags('scores')
@Controller('scores')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly authService: AuthService
  ) {}

  private async resolveUserId(clerkId: string, email: string): Promise<string> {
    const user = await this.authService.syncUser(clerkId, email)
    return user.id
  }

  @Post('recompute')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Trigger score recomputation' })
  @ApiQuery({ name: 'type', required: false, enum: ['general', 'tenant', 'lender_readiness', 'telecom'] })
  async recompute(
    @CurrentUser() user: RequestUser,
    @Query('type') type: ScorecardType = 'general'
  ) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.scoringService.recompute(userId, type)
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest trust score with freshness status' })
  @ApiQuery({ name: 'type', required: false, enum: ['general', 'tenant', 'lender_readiness', 'telecom'] })
  async getLatest(
    @CurrentUser() user: RequestUser,
    @Query('type') type: ScorecardType = 'general'
  ) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.scoringService.getLatestScoreWithStatus(userId, type)
  }

  @Post('impact-preview')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Preview how the score would change if evidence were removed (no writes)' })
  async impactPreview(@CurrentUser() user: RequestUser, @Body() dto: ImpactPreviewDto) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.scoringService.previewImpact(userId, {
      connectionIds: dto.excludeConnectionIds,
      documentIds: dto.excludeDocumentIds,
    })
  }

  @Get('history')
  @ApiOperation({ summary: 'Get score history' })
  async getHistory(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.scoringService.getScoreHistory(userId)
  }
}
