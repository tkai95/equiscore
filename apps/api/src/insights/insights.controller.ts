import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { AuthService } from '../auth/auth.service'
import { InsightsService } from './insights.service'
import { PreviewProfileDto } from './insights.dto'

@ApiTags('insights')
@Controller('insights')
export class InsightsController {
  constructor(
    private readonly insights: InsightsService,
    private readonly authService: AuthService
  ) {}

  /**
   * POST a set of normalized transactions and get the full insight profile back.
   * Lets us validate scoring against real anonymized statements before any PDF
   * parsing exists.
   *
   * This route is unauthenticated, so it is *fail-closed*: it stays off unless
   * INSIGHTS_PREVIEW_ENABLED is explicitly "true", and it is never available
   * when NODE_ENV is production. Relying on NODE_ENV alone would fail open on
   * any host that doesn't set it at runtime.
   */
  @Post('preview')
  @ApiOperation({ summary: 'Build an insight profile from posted transactions (opt-in, non-production)' })
  preview(@Body() dto: PreviewProfileDto) {
    const explicitlyEnabled = process.env['INSIGHTS_PREVIEW_ENABLED'] === 'true'
    const isProduction = process.env['NODE_ENV'] === 'production'
    if (!explicitlyEnabled || isProduction) {
      throw new ForbiddenException('Preview endpoint is not enabled')
    }
    return this.insights.preview(dto)
  }

  @Get('profile')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Insight profile built from the user's stored transactions" })
  async profile(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.getProfileForUser(dbUser.id)
  }
}
