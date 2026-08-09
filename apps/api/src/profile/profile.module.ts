import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ScoringModule } from '../scoring/scoring.module'
import { ProfileController } from './profile.controller'
import { ProfileService } from './profile.service'

@Module({
  // ScoringModule is imported so profile/address edits can trigger a score
  // recompute — the same "data changed, re-score" hook statement import uses.
  imports: [AuthModule, ScoringModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
