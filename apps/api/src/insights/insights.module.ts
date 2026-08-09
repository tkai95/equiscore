import { Module } from '@nestjs/common'
import { InsightsController } from './insights.controller'
import { InsightsService } from './insights.service'
import { AuthModule } from '../auth/auth.module'
import { ScoringModule } from '../scoring/scoring.module'
import { InvitationEmailService } from '../common/invitation-email.service'

@Module({
  // AuditModule is @Global; ScoringModule must be imported for ScoringService.
  imports: [AuthModule, ScoringModule],
  controllers: [InsightsController],
  providers: [InsightsService, InvitationEmailService],
  exports: [InsightsService],
})
export class InsightsModule {}
