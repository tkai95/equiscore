import { Module } from '@nestjs/common'
import { CompassController } from './compass.controller'
import { CompassService } from './compass.service'
import { AuthModule } from '../auth/auth.module'
import { InsightsModule } from '../insights/insights.module'
import { ScoringModule } from '../scoring/scoring.module'

@Module({
  // AuthModule → AuthService (identity + entitlement). InsightsModule →
  // InsightsService (the computed profile). ScoringModule → ScoringService
  // (reason codes + improvements for the EquiScore Impact module).
  imports: [AuthModule, InsightsModule, ScoringModule],
  controllers: [CompassController],
  providers: [CompassService],
  exports: [CompassService],
})
export class CompassModule {}
