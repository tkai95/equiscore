import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { SharingService } from './sharing.service'
import { AuthService } from '../auth/auth.service'

@ApiTags('sharing')
@Controller()
export class SharingController {
  constructor(
    private readonly sharingService: SharingService,
    private readonly authService: AuthService
  ) {}

  private async resolveUserId(clerkId: string, email: string): Promise<string> {
    const user = await this.authService.syncUser(clerkId, email)
    return user.id
  }

  @Post('share-links')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shareable profile link' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: { trustScoreId: string; targetType?: string; targetName?: string }
  ) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.sharingService.createShareLink(userId, body.trustScoreId, body.targetType, body.targetName)
  }

  @Get('share-links')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all my share links' })
  async list(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.sharingService.getMyShareLinks(userId)
  }

  @Delete('share-links/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a share link' })
  async revoke(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.sharingService.revokeShareLink(userId, id)
  }

  @Get('public/profile/:token')
  @ApiOperation({ summary: 'View a shared profile (partner/landlord endpoint)' })
  async viewPublic(@Param('token') token: string) {
    return this.sharingService.getPublicProfile(token)
  }
}
