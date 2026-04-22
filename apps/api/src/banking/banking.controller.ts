import { Controller, Get, Logger, Post, Query, Redirect, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { BankingService } from './banking.service'
import { AuthService } from '../auth/auth.service'
import { ConfigService } from '@nestjs/config'

@ApiTags('open-banking')
@Controller('open-banking')
export class BankingController {
  private readonly logger = new Logger(BankingController.name)

  constructor(
    private readonly bankingService: BankingService,
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  @Post('link-token')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate TrueLayer auth URL for bank connection' })
  async getLinkUrl(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    const url = this.bankingService.buildLinkUrl(dbUser.id)
    return { url }
  }

  @Get('callback')
  @Redirect()
  @ApiOperation({ summary: 'TrueLayer OAuth callback — handles code exchange and data sync' })
  async callback(@Query('code') code: string, @Query('state') state: string) {
    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'
    try {
      await this.bankingService.handleCallback(code, state)
      return { url: `${webUrl}/dashboard/connections?bank_connected=true` }
    } catch (error) {
      this.logger.error('Banking callback failed', error)
      return { url: `${webUrl}/dashboard/connections?bank_error=true` }
    }
  }

  @Get('accounts')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connected bank accounts' })
  async getAccounts(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.bankingService.getAccounts(dbUser.id)
  }

  @Post('sync')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-sync bank data' })
  async sync(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    const synced = await this.bankingService.syncAllForUser(dbUser.id)
    return { synced }
  }
}
