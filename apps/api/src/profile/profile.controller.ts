import { Controller, Get, Put, Patch, Delete, Body, UseGuards, Req, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { ProfileService } from './profile.service'
import { AuthService } from '../auth/auth.service'
import { OnboardingDto, UpdateAddressDto } from './onboarding.dto'

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

  @Patch('address')
  @ApiOperation({ summary: "Update the user's current address" })
  async updateAddress(@CurrentUser() user: RequestUser, @Body() dto: UpdateAddressDto) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    await this.profileService.updateAddress(userId, dto)
    return { ok: true }
  }

  @Put('onboarding')
  @ApiOperation({ summary: 'Complete onboarding and save full profile' })
  async completeOnboarding(@CurrentUser() user: RequestUser, @Body() body: OnboardingDto) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.profileService.completeOnboarding(userId, body)
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

  @Get('export')
  @ApiOperation({ summary: 'Export the authenticated user data as JSON' })
  async exportData(@CurrentUser() user: RequestUser, @Res() res: Response) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    const data = await this.profileService.exportUserData(userId)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="equiscore-data-${userId.slice(-8)}.json"`)
    res.json(data)
  }

  @Delete('account')
  @ApiOperation({ summary: 'Permanently delete the user account and all data' })
  async deleteAccount(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    await this.profileService.deleteAccount(userId)
    return { deleted: true }
  }
}
