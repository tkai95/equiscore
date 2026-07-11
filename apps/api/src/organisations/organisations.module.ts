import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { OrganisationsController } from './organisations.controller'
import { OrganisationAccessGuard } from './organisation-access.guard'
import { OrganisationsService } from './organisations.service'

@Module({
  imports: [AuthModule],
  controllers: [OrganisationsController],
  providers: [OrganisationsService, OrganisationAccessGuard],
  exports: [OrganisationsService, OrganisationAccessGuard],
})
export class OrganisationsModule {}
