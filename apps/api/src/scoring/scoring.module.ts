import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ScoringController } from './scoring.controller'
import { ScoringService } from './scoring.service'
import { FeatureEngineeringService } from './feature-engineering.service'

@Module({
  imports: [AuthModule],
  controllers: [ScoringController],
  providers: [ScoringService, FeatureEngineeringService],
  exports: [ScoringService],
})
export class ScoringModule {}
