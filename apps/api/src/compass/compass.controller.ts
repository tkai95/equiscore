import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { AuthService } from '../auth/auth.service'
import { CompassService } from './compass.service'
import { ConfirmCommitmentDto, CreateReminderDto, ReminderStatusDto, UpsertGoalDto } from './compass.dto'

/**
 * EquiScore Compass — the financial-coaching layer, gated to entitled users.
 *
 * The entitlement check here is the REAL security boundary; hiding the sidebar
 * link and redirecting on the web are UX conveniences only. Every route
 * resolves the DB user (the same syncUser every authed controller calls) and
 * rejects with 403 when `compassEnabled` is off, so a direct API call cannot
 * bypass the gate.
 */
@ApiTags('compass')
@Controller('compass')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class CompassController {
  constructor(
    private readonly compass: CompassService,
    private readonly authService: AuthService,
  ) {}

  /** Resolve the entitled DB user id, or throw 403. */
  private async resolveEntitledUserId(user: RequestUser): Promise<string> {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    if (!dbUser.compassEnabled) {
      throw new ForbiddenException('Compass is not enabled for this account.')
    }
    return dbUser.id
  }

  /** Guard unbounded path params before they hit the DB (keys / ids). */
  private safeParam(value: string): string {
    if (!value || value.length > 200) throw new BadRequestException('Invalid identifier.')
    return value
  }

  @Get()
  @ApiOperation({ summary: 'Get the Compass financial-coaching profile' })
  async get(@CurrentUser() user: RequestUser) {
    return this.compass.getForUser(await this.resolveEntitledUserId(user))
  }

  @Post('commitments/:key/confirm')
  @ApiOperation({ summary: 'Confirm or correct a commitment, optionally set a renewal reminder' })
  async confirmCommitment(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Body() dto: ConfirmCommitmentDto,
  ) {
    return this.compass.confirmCommitment(await this.resolveEntitledUserId(user), this.safeParam(key), dto)
  }

  @Post('reminders')
  @ApiOperation({ summary: 'Create a custom reminder' })
  async createReminder(@CurrentUser() user: RequestUser, @Body() dto: CreateReminderDto) {
    return this.compass.createReminder(await this.resolveEntitledUserId(user), dto)
  }

  @Patch('reminders/:id')
  @ApiOperation({ summary: 'Mark a reminder completed or dismissed' })
  async updateReminder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReminderStatusDto,
  ) {
    return this.compass.setReminderStatus(await this.resolveEntitledUserId(user), this.safeParam(id), dto.status)
  }

  @Put('goal')
  @ApiOperation({ summary: 'Create or update the active savings goal' })
  async upsertGoal(@CurrentUser() user: RequestUser, @Body() dto: UpsertGoalDto) {
    return this.compass.upsertGoal(await this.resolveEntitledUserId(user), dto)
  }

  @Delete('goal/:id')
  @ApiOperation({ summary: 'Archive a savings goal' })
  async archiveGoal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.compass.archiveGoal(await this.resolveEntitledUserId(user), this.safeParam(id))
  }

  @Post('opportunities/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a savings opportunity so it stops returning' })
  async dismissOpportunity(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.compass.dismissOpportunity(await this.resolveEntitledUserId(user), this.safeParam(id))
  }
}
