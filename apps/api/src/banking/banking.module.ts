import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ScoringModule } from '../scoring/scoring.module'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { TrueLayerService } from './truelayer.service'

@Module({
  imports: [AuthModule, ScoringModule],
  controllers: [BankingController],
  providers: [BankingService, TrueLayerService],
  exports: [BankingService],
})
export class BankingModule {}
