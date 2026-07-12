import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { InvitationEmailService } from '../common/invitation-email.service'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { InternalAdminGuard } from './internal-admin.guard'

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, InternalAdminGuard, InvitationEmailService],
  exports: [AdminService, InternalAdminGuard],
})
export class AdminModule {}
