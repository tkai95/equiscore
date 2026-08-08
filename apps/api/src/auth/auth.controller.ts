import { Controller, Get, Post, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { AuthService } from './auth.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync Clerk identity into Equiscore DB' })
  async sync(@CurrentUser() user: RequestUser) {
    return this.authService.syncUser(user.clerkId, user.email)
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.clerkId)
  }

  @Get('dev-invite')
  @ApiOperation({ summary: 'Validate a dev site sign-up invite token' })
  async devInvite(@Query('token') token?: string) {
    return this.authService.validateDevInvite(token ?? '')
  }

  @Get('dev-access')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check whether the current user has dev site access' })
  async devAccess(@CurrentUser() user: RequestUser) {
    return this.authService.checkDevAccess(user.clerkId, user.email)
  }
}
