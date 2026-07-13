import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { InvitationEmailService } from '../common/invitation-email.service'
import { OrganisationsController } from './organisations.controller'
import { OrganisationAccessGuard } from './organisation-access.guard'
import { OrganisationsService } from './organisations.service'

@Module({
  imports: [AuthModule],
  controllers: [OrganisationsController],
  providers: [OrganisationsService, OrganisationAccessGuard, InvitationEmailService],
  exports: [OrganisationsService, OrganisationAccessGuard],
})
export class OrganisationsModule {}
