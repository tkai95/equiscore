import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
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

  @Get()
  @ApiOperation({ summary: 'List the authenticated consumer saved goals' })
  async list(@CurrentUser() user: RequestUser) {
    return this.goals.listGoals(await this.resolveUserId(user))
  }

  @Post()
  @ApiOperation({ summary: 'Create one authenticated consumer goal instance' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: UpdateConsumerGoalDto) {
    return this.goals.createGoal(await this.resolveUserId(user), dto)
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

  @Put('types/:type')
  @ApiOperation({ summary: 'Create or update one authenticated consumer goal type' })
  async updateGoal(
    @CurrentUser() user: RequestUser,
    @Param('type') type: string,
    @Body() dto: UpdateConsumerGoalDto
  ) {
    return this.goals.updateGoal(await this.resolveUserId(user), type, dto)
  }

  @Post('types/:type/primary')
  @ApiOperation({ summary: 'Mark one authenticated consumer goal type as the focus goal' })
  async setPrimary(@CurrentUser() user: RequestUser, @Param('type') type: string) {
    return this.goals.setPrimaryGoal(await this.resolveUserId(user), type)
  }

  @Put(':goalId')
  @ApiOperation({ summary: 'Update one authenticated consumer goal instance' })
  async updateGoalById(
    @CurrentUser() user: RequestUser,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateConsumerGoalDto
  ) {
    return this.goals.updateGoalById(await this.resolveUserId(user), goalId, dto)
  }

  @Post(':goalId/primary')
  @ApiOperation({ summary: 'Mark one authenticated consumer goal instance as primary' })
  async setPrimaryById(@CurrentUser() user: RequestUser, @Param('goalId') goalId: string) {
    return this.goals.setPrimaryGoalById(await this.resolveUserId(user), goalId)
  }
}
