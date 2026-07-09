import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ScoringModule } from '../scoring/scoring.module'
import { InsightsModule } from '../insights/insights.module'
import { SharingController } from './sharing.controller'
import { SharingService } from './sharing.service'

@Module({
  imports: [AuthModule, ScoringModule, InsightsModule],
  controllers: [SharingController],
  providers: [SharingService],
})
export class SharingModule {}
