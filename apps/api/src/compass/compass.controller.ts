import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { AuthService } from '../auth/auth.service'
import { CompassService } from './compass.service'

/**
 * EquiScore Compass — the financial-coaching layer, gated to entitled users.
 *
 * The entitlement check here is the REAL security boundary; hiding the sidebar
 * link and redirecting on the web are UX conveniences only. We resolve the DB
 * user (the same syncUser every authed controller calls) and reject with 403
 * when `compassEnabled` is off, so a direct API call cannot bypass the gate.
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

  @Get()
  @ApiOperation({ summary: 'Get the Compass financial-coaching profile' })
  async get(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    if (!dbUser.compassEnabled) {
      throw new ForbiddenException('Compass is not enabled for this account.')
    }
    return this.compass.getForUser(dbUser.id)
  }
}
