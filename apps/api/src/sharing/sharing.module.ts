import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ScoringModule } from '../scoring/scoring.module'
import { SharingController } from './sharing.controller'
import { SharingService } from './sharing.service'

@Module({
  imports: [AuthModule, ScoringModule],
  controllers: [SharingController],
  providers: [SharingService],
})
export class SharingModule {}
