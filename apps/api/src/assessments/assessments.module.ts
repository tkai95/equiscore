import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { OrganisationsModule } from '../organisations/organisations.module'
import { AssessmentsController } from './assessments.controller'
import { AssessmentsService } from './assessments.service'

@Module({
  imports: [AuthModule, OrganisationsModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
