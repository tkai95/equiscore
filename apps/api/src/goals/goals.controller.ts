import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from '../auth/auth.service'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { GoalsService } from './goals.service'
import { UpdateConsumerGoalDto } from './goals.dto'

@ApiTags('goals')
@Controller('goals')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(
    private readonly goals: GoalsService,
    private readonly authService: AuthService
  ) {}

  private async resolveUserId(user: RequestUser): Promise<string> {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return dbUser.id
  }

  @Get('primary')
  @ApiOperation({ summary: 'Get the authenticated consumer primary goal' })
  async getPrimary(@CurrentUser() user: RequestUser) {
    return this.goals.getPrimaryGoal(await this.resolveUserId(user))
  }

  @Put('primary')
  @ApiOperation({ summary: 'Create or update the authenticated consumer primary goal' })
  async updatePrimary(@CurrentUser() user: RequestUser, @Body() dto: UpdateConsumerGoalDto) {
    return this.goals.updatePrimaryGoal(await this.resolveUserId(user), dto)
  }
}
