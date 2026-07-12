import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { HealthController } from './health/health.controller'
import { AuthModule } from './auth/auth.module'
import { ProfileModule } from './profile/profile.module'
import { BankingModule } from './banking/banking.module'
import { DocumentsModule } from './documents/documents.module'
import { ScoringModule } from './scoring/scoring.module'
import { SharingModule } from './sharing/sharing.module'
import { AuditModule } from './audit/audit.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { InsightsModule } from './insights/insights.module'
import { CompassModule } from './compass/compass.module'
import { OrganisationsModule } from './organisations/organisations.module'
import { AssessmentsModule } from './assessments/assessments.module'
import { AdminModule } from './admin/admin.module'

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    ProfileModule,
    BankingModule,
    DocumentsModule,
    ScoringModule,
    SharingModule,
    AuditModule,
    AnalyticsModule,
    InsightsModule,
    CompassModule,
    OrganisationsModule,
    AssessmentsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
