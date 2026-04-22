import { Module } from '@nestjs/common'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { TrueLayerService } from './truelayer.service'

@Module({
  controllers: [BankingController],
  providers: [BankingService, TrueLayerService],
  exports: [BankingService],
})
export class BankingModule {}
