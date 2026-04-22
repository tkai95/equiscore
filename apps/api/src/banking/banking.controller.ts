import { Controller, Get, Post, Query, Redirect, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { BankingService } from './banking.service'
import { AuthService } from '../auth/auth.service'
import { ConfigService } from '@nestjs/config'

@ApiTags('open-banking')
@Controller('open-banking')
export class BankingController {
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
  @ApiOperation({ summary: 'TrueLayer OAuth callback — handles code exchange and data sync' })
  async callback(@Query('code') code: string, @Query('state') state: string) {
    await this.bankingService.handleCallback(code, state)
    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'
    return { redirect: `${webUrl}/dashboard?bank_connected=true` }
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
    const accounts = await this.bankingService.getAccounts(dbUser.id)
    return { synced: accounts.length }
  }
}
