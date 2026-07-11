import { Body, Controller, Delete, Get, Logger, Param, Post, Query, Redirect, UseGuards } from '@nestjs/common'
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

  /** WEB_URL may be a comma-separated CORS list; the redirect uses the first. */
  private webBase(): string {
    return (this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').split(',')[0]!.trim()
  }

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
    const webUrl = this.webBase()
    try {
      await this.bankingService.handleCallback(code, state)
      return { url: `${webUrl}/dashboard/connections?bank_connected=true` }
    } catch (error) {
      this.logger.error('Banking callback failed', error)
      return { url: `${webUrl}/dashboard/connections?bank_error=true` }
    }
  }

  // ─── Enable Banking (parallel provider) ─────────────────────────────────────

  @Get('enable-banking/aspsps')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List banks available via Enable Banking' })
  async ebAspsps(@Query('country') country?: string) {
    return this.bankingService.listAspsps(country || 'GB')
  }

  @Post('enable-banking/link-token')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate an Enable Banking auth URL for a chosen bank' })
  async ebLinkUrl(
    @CurrentUser() user: RequestUser,
    @Body() body: { aspsp: string; country?: string },
  ) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    const url = await this.bankingService.buildEnableBankingLinkUrl(dbUser.id, body.aspsp, body.country || 'GB')
    return { url }
  }

  @Get('enable-banking/callback')
  @Redirect()
  @ApiOperation({ summary: 'Enable Banking callback — creates the session and syncs data' })
  async ebCallback(@Query('code') code: string, @Query('state') state: string) {
    const webUrl = this.webBase()
    try {
      await this.bankingService.handleEnableBankingCallback(code, state)
      return { url: `${webUrl}/dashboard/connections?bank_connected=true` }
    } catch (error) {
      this.logger.error('Enable Banking callback failed', error)
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

  @Get('accounts/:accountId/transactions')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transactions for a specific bank account' })
  async getAccountTransactions(
    @CurrentUser() user: RequestUser,
    @Param('accountId') accountId: string,
  ) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.bankingService.getAccountTransactions(dbUser.id, accountId)
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

  @Delete('connections/:connectionId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect a bank: revoke consent and delete its accounts and transactions' })
  async disconnect(
    @CurrentUser() user: RequestUser,
    @Param('connectionId') connectionId: string,
  ) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.bankingService.disconnect(dbUser.id, connectionId)
  }
}
