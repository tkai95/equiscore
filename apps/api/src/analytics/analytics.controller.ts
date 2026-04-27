import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { AnalyticsService } from './analytics.service'
import { AuthService } from '../auth/auth.service'

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly authService: AuthService,
  ) {}

  private async resolveUserId(clerkId: string, email: string): Promise<string> {
    const user = await this.authService.syncUser(clerkId, email)
    return user.id
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get transaction analytics summary' })
  async getSummary(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.analyticsService.getSummary(userId)
  }

  @Post('insights')
  @ApiOperation({ summary: 'Generate AI-powered financial insights' })
  async getInsights(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.analyticsService.getInsights(userId)
  }
}
