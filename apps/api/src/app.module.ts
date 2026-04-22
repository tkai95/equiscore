import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { ProfileModule } from './profile/profile.module'
import { BankingModule } from './banking/banking.module'
import { DocumentsModule } from './documents/documents.module'
import { ScoringModule } from './scoring/scoring.module'
import { SharingModule } from './sharing/sharing.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    ProfileModule,
    BankingModule,
    DocumentsModule,
    ScoringModule,
    SharingModule,
  ],
})
export class AppModule {}
