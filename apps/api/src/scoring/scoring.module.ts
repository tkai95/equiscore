import { Module } from '@nestjs/common'
import { ScoringController } from './scoring.controller'
import { ScoringService } from './scoring.service'
import { FeatureEngineeringService } from './feature-engineering.service'

@Module({
  controllers: [ScoringController],
  providers: [ScoringService, FeatureEngineeringService],
  exports: [ScoringService],
})
export class ScoringModule {}
