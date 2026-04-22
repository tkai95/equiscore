import { Controller, Get, Put, Patch, Body, UseGuards, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { ProfileService } from './profile.service'
import { AuthService } from '../auth/auth.service'

@ApiTags('profile')
@Controller('profile')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly authService: AuthService
  ) {}

  private async resolveUserId(clerkId: string, email: string): Promise<string> {
    const user = await this.authService.syncUser(clerkId, email)
    return user.id
  }

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async getProfile(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.profileService.getProfile(userId)
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile fields' })
  async updateProfile(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.profileService.updateProfile(userId, body as never)
  }

  @Put('onboarding')
  @ApiOperation({ summary: 'Complete onboarding and save full profile' })
  async completeOnboarding(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.profileService.completeOnboarding(userId, body as never)
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get address history' })
  async getAddresses(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.profileService.getAddresses(userId)
  }

  @Get('employment')
  @ApiOperation({ summary: 'Get employment history' })
  async getEmployment(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.profileService.getEmployment(userId)
  }

  @Get('rental')
  @ApiOperation({ summary: 'Get current rental profile' })
  async getRentalProfile(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.profileService.getRentalProfile(userId)
  }
}
