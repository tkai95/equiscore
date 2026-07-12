import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { AdminService } from './admin.service'

@Injectable()
export class InternalAdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly admin: AdminService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user as { clerkId: string; email: string; dbUserId?: string } | undefined
    if (!user) return false

    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    request.user = { ...user, dbUserId: dbUser.id, email: dbUser.email }
    request.adminContext = await this.admin.resolveAdminContext(dbUser.id, dbUser.email)
    return true
  }
}
