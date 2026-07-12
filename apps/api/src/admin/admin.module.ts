import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { InternalAdminGuard } from './internal-admin.guard'

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, InternalAdminGuard],
  exports: [AdminService, InternalAdminGuard],
})
export class AdminModule {}
